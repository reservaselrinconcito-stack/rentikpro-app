
import { projectManager } from './projectManager';
import { PricingRuleSet, PricingRule, PricingRuleType } from '../types';

// Utility for hashing rule contents
async function generateRulesHash(rules: PricingRule[]): Promise<string> {
  const content = rules.map(r => ({
    type: r.type,
    priority: r.priority,
    enabled: r.enabled,
    payload: JSON.parse(r.payload) 
  })).sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority; 
    return a.type.localeCompare(b.type);
  });

  const json = JSON.stringify(content);
  const msgUint8 = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class PricingManager {
  
  /**
   * Obtiene el borrador actual para una unidad y plan de precios.
   */
  async getOrCreateDraft(unitId: string, ratePlanId?: string): Promise<PricingRuleSet> {
    const store = projectManager.getStore();
    const sets = await store.getPricingRuleSets(unitId, ratePlanId);
    
    const draft = sets.find(s => s.status === 'draft');
    if (draft) return draft;

    const active = sets.find(s => s.status === 'active');
    
    const newDraftId = crypto.randomUUID();
    const newDraft: PricingRuleSet = {
      id: newDraftId,
      unitId,
      ratePlanId,
      status: 'draft',
      version: (active?.version || 0) + 1,
      hash: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await store.savePricingRuleSet(newDraft);

    if (active) {
      const activeRules = await store.getPricingRules(active.id);
      for (const rule of activeRules) {
        const newRule: PricingRule = {
          ...rule,
          id: crypto.randomUUID(),
          ruleSetId: newDraftId,
          updatedAt: Date.now()
        };
        await store.savePricingRule(newRule);
      }
    } else {
      const defaultBaseRule: PricingRule = {
        id: crypto.randomUUID(),
        ruleSetId: newDraftId,
        type: 'BASE_PRICE',
        priority: 0,
        payload: JSON.stringify({ currency: 'EUR', amount: 10000 }), 
        enabled: true,
        updatedAt: Date.now()
      };
      await store.savePricingRule(defaultBaseRule);
    }

    return newDraft;
  }

  async publishDraft(draftId: string): Promise<void> {
    const store = projectManager.getStore();
    const draft = await store.getPricingRuleSetById(draftId);
    
    if (!draft) throw new Error("RuleSet no encontrado");
    if (draft.status !== 'draft') throw new Error("Solo se pueden publicar borradores");

    const rules = await store.getPricingRules(draftId);
    this.validateRules(rules);

    const hash = await generateRulesHash(rules);
    const sets = await store.getPricingRuleSets(draft.unitId, draft.ratePlanId);
    const currentActive = sets.find(s => s.status === 'active');
    
    const nextVersion = (currentActive?.version || 0) + 1;

    draft.status = 'active';
    draft.version = nextVersion;
    draft.hash = hash;
    draft.updatedAt = Date.now();

    await store.savePricingRuleSet(draft);
  }

  async discardDraft(draftId: string): Promise<void> {
    const store = projectManager.getStore();
    const draft = await store.getPricingRuleSetById(draftId);
    if (!draft || draft.status !== 'draft') return;
    
    const rules = await store.getPricingRules(draftId);
    for(const r of rules) await store.deletePricingRule(r.id);
    // In current architecture we don't delete the row, just ignore it, 
    // or we can add deletePricingRuleSet later if store interface grows.
  }

  private validateRules(rules: PricingRule[]) {
    if (rules.length === 0) throw new Error("No se pueden publicar reglas vacías.");
    const hasBasePrice = rules.some(r => r.type === 'BASE_PRICE' && r.enabled);
    if (!hasBasePrice) throw new Error("Debe existir al menos una regla de PRECIO BASE activa.");
  }
}

export const pricingManager = new PricingManager();
