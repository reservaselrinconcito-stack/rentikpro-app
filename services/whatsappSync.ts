
import { projectManager } from './projectManager';
import { CommunicationAccount, CommunicationChannel, WhatsAppConfig, Message, WhatsAppTemplate, IChannelProvider } from '../types';
import { notifyDataChanged } from './dataRefresher';
import { securityService } from './security';

export class WhatsAppSyncService implements IChannelProvider {
  public channelType: CommunicationChannel = 'WHATSAPP';
  private isProcessing = false;
  private readonly MAX_RETRIES = 5;
  private readonly BACKOFF_BASE_MS = 2000;

  private approvedTemplates: WhatsAppTemplate[] = [
    { name: 'booking_confirmation', language: 'es', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hola {{1}}, tu reserva en {{2}} está confirmada. Fechas: {{3}}.' }] },
    { name: 'check_in_instructions', language: 'es', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hola {{1}}, aquí tienes las instrucciones para entrar: {{2}}. WiFi: {{3}}.' }] },
    { name: 'hello_world', language: 'en_US', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello World' }] }
  ];

  public getTemplates(): WhatsAppTemplate[] {
    return this.approvedTemplates;
  }

  // --- IChannelProvider Implementation ---

  public async validateConfig(config: any): Promise<boolean> {
    return !!(config.phone_number_id && config.access_token);
  }

  public async syncInbound() {
    if (!navigator.onLine || this.isProcessing) return;
    this.isProcessing = true;
    try {
       // Mock probability of new message
       if (Math.random() > 0.95) {
          const store = projectManager.getStore();
          const travelers = await store.getTravelers();
          if (travelers.length > 0) {
             const t = travelers[Math.floor(Math.random() * travelers.length)];
             let convs = await store.getConversations();
             let conv = convs.find(c => c.traveler_id === t.id);
             
             if (!conv) {
                conv = {
                   id: crypto.randomUUID(),
                   traveler_id: t.id,
                   subject: t.telefono || 'Chat WhatsApp',
                   status: 'OPEN',
                   last_message_at: Date.now(),
                   last_message_preview: '',
                   unread_count: 0,
                   tags_json: '[]',
                   created_at: Date.now(),
                   updated_at: Date.now(),
                   last_message_direction: 'INBOUND'
                };
                await store.saveConversation(conv);
             }

             const msg: Message = {
                id: crypto.randomUUID(),
                conversation_id: conv.id,
                account_id: 'auto_inbound', 
                direction: 'INBOUND',
                channel: 'WHATSAPP',
                status: 'DELIVERED',
                body: 'Hola, tengo una duda sobre el check-in.',
                content_type: 'text/plain',
                created_at: Date.now()
             };
             await store.saveMessage(msg);
             
             conv.last_message_at = Date.now();
             conv.last_message_preview = msg.body;
             conv.unread_count += 1;
             conv.last_message_direction = 'INBOUND';
             await store.saveConversation(conv);
             
             notifyDataChanged('all');
          }
       }
    } finally {
       this.isProcessing = false;
    }
  }

  public async processQueue() {
    if (!navigator.onLine) return;

    try {
      const store = projectManager.getStore();
      const pendingMessages = await store.getPendingMessages();

      for (const msg of pendingMessages) {
        if (msg.channel !== 'WHATSAPP') continue;

        const retryCount = msg.retry_count || 0;
        if (retryCount > 0) {
           const delay = Math.pow(2, retryCount) * this.BACKOFF_BASE_MS;
           const timePassed = Date.now() - (msg.last_attempt_at || 0);
           if (timePassed < delay) continue;
        }

        try {
          const accounts = await store.getAccounts();
          const account = accounts.find(a => a.id === msg.account_id);
          if (!account) throw new Error("FATAL: Cuenta no encontrada");
          
          const config = securityService.decryptConfig(account.config_json) as WhatsAppConfig;
          
          let payload: any = {
             messaging_product: "whatsapp",
             recipient_type: "individual",
             to: await this.resolvePhoneNumber(msg.conversation_id), 
             type: msg.content_type === 'template' ? 'template' : 'text',
          };

          if (msg.content_type === 'template' && msg.metadata_json) {
             const templateData = JSON.parse(msg.metadata_json);
             payload.template = {
                name: templateData.name,
                language: { code: templateData.language || 'es' },
                components: templateData.components
             };
          } else {
             payload.text = { body: msg.body };
          }

          await this.sendToMetaAPI(config, payload);

          msg.status = 'SENT';
          msg.sent_at = Date.now();
          msg.error_message = undefined;
          await store.saveMessage(msg);

          const conv = await store.getConversationById(msg.conversation_id);
          if (conv) {
             conv.last_message_at = Date.now();
             conv.last_message_preview = msg.body.substring(0, 50);
             conv.last_message_direction = 'OUTBOUND';
             await store.saveConversation(conv);
          }

        } catch (err: any) {
          console.error(`WA Send Error ${msg.id}:`, err);
          const errorMsg = err.message || 'Unknown Error';
          const isFatal = errorMsg.includes('FATAL') || errorMsg.includes('Invalid Parameter') || retryCount >= this.MAX_RETRIES;

          if (isFatal) {
             msg.status = 'FAILED';
             msg.error_message = errorMsg;
          } else {
             msg.status = 'PENDING';
             msg.retry_count = retryCount + 1;
             msg.last_attempt_at = Date.now();
             msg.error_message = `Intento ${msg.retry_count}/${this.MAX_RETRIES} fallido.`;
          }
          await store.saveMessage(msg);
        }
      }
      notifyDataChanged('all');
    } catch (err) {
       console.error(err);
    }
  }

  // --- HELPERS ---

  private async resolvePhoneNumber(convId: string): Promise<string> {
     const store = projectManager.getStore();
     const conv = await store.getConversationById(convId);
     if (!conv) return '000000000';
     const traveler = await store.getTravelerById(conv.traveler_id);
     return traveler?.telefono || '000000000';
  }

  private async sendToMetaAPI(config: WhatsAppConfig, payload: any): Promise<void> {
     return new Promise((resolve, reject) => {
        setTimeout(() => {
           if (Math.random() > 0.8) reject(new Error("Network Error (Meta API)"));
           else resolve();
        }, 800);
     });
  }
  
  public startBackgroundSync() { /* Managed by ChannelManager now */ }
  public stop() { /* Managed by ChannelManager now */ }
}

export const whatsAppService = new WhatsAppSyncService();
