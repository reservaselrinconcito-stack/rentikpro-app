
import { projectManager } from './projectManager';
import { CommunicationAccount, CommunicationChannel, EmailConfig, Message, IChannelProvider } from '../types';
import { notifyDataChanged } from './dataRefresher';
import { securityService } from './security';

export class EmailSyncService implements IChannelProvider {
  public channelType: CommunicationChannel = 'EMAIL';
  private isProcessing = false;
  private readonly MAX_RETRIES = 5;
  private readonly BACKOFF_BASE_MS = 2000;

  // Implement IChannelProvider Interface methods
  
  public async validateConfig(config: any): Promise<boolean> {
    return !!(config.email && config.imap_host && config.smtp_host);
  }

  public async syncInbound() {
    if (!navigator.onLine || this.isProcessing) return;
    this.isProcessing = true;

    try {
      const store = projectManager.getStore();
      const accounts = await store.getAccounts();
      const emailAccounts = accounts.filter(a => a.type === 'EMAIL');

      for (const acc of emailAccounts) {
        try {
           // Use Security Service to decrypt on the fly
           const config = securityService.decryptConfig(acc.config_json) as EmailConfig;
           
           const newMessages = await this.simulateImapFetch(config);
           
           if (newMessages.length > 0) {
              console.log(`IMAP: ${newMessages.length} nuevos correos para ${acc.name}`);
              // Update sync timestamp (re-encrypting needed if we change the JSON)
              config.last_sync_at = Date.now();
              acc.config_json = securityService.encryptConfig(config); 
              await store.saveAccount(acc);
           }
        } catch (e) {
           console.error(`Error syncing account ${acc.name}:`, e);
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
        if (msg.channel !== 'EMAIL') continue;

        // Backoff Logic
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
          
          const config = securityService.decryptConfig(account.config_json) as EmailConfig;

          await this.simulateSmtpSend(config, msg);

          msg.status = 'SENT';
          msg.sent_at = Date.now();
          msg.error_message = undefined;
          await store.saveMessage(msg);
          
          const conv = await store.getConversationById(msg.conversation_id);
          if (conv) {
             conv.last_message_preview = `✓ ${msg.body.substring(0, 50)}`;
             await store.saveConversation(conv);
          }

        } catch (err: any) {
          console.error(`Email Send Error ${msg.id}:`, err);
          const errorMsg = err.message || 'Unknown Error';
          const isFatal = errorMsg.includes('FATAL') || errorMsg.includes('Auth') || retryCount >= this.MAX_RETRIES;

          if (isFatal) {
             msg.status = 'FAILED';
             msg.error_message = errorMsg;
          } else {
             msg.status = 'PENDING';
             msg.retry_count = retryCount + 1;
             msg.last_attempt_at = Date.now();
             msg.error_message = `Intento ${msg.retry_count}/${this.MAX_RETRIES}: ${errorMsg}`;
          }
          await store.saveMessage(msg);
        }
      }
      notifyDataChanged('all');
    } catch (err) {
      console.error("Queue Error:", err);
    }
  }

  // --- MOCKS ---
  
  private async simulateSmtpSend(config: EmailConfig, msg: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.8) reject(new Error("Network Timeout (Simulated)"));
        else resolve();
      }, 1000);
    });
  }

  private async simulateImapFetch(config: EmailConfig): Promise<any[]> {
    return new Promise(resolve => {
       setTimeout(() => {
          if (Math.random() > 0.9) resolve([{ id: 'imap-123' }]);
          else resolve([]);
       }, 1500);
    });
  }
  
  // Legacy methods kept for compatibility if needed, but should rely on interface
  public startBackgroundSync() { /* Managed by ChannelManager now */ }
  public stop() { /* Managed by ChannelManager now */ }
}

export const emailService = new EmailSyncService();
