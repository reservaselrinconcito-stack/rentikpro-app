
import React, { useEffect, useState } from 'react';
import { PromptBuilder as PromptBuilderComponent } from '../components/PromptBuilder';
import { projectManager } from '../services/projectManager';
import { WebSite } from '../types';
import { logger } from '../services/logger';

export const PromptBuilder: React.FC = () => {
  const [site, setSite] = useState<WebSite | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const websites = await projectManager.getStore().getWebsites();
        // Default to the most recently updated site
        if (websites.length > 0) {
          setSite(websites[0]);
        }
      } catch (err) {
        logger.error("Failed to load websites for prompt context", err);
      }
    };
    load();
  }, []);

  return (
    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PromptBuilderComponent mode="PAGE" currentSite={site} />
    </div>
  );
};
