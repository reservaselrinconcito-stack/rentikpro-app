
import { CommunicationAccount, CommunicationChannel, IChannelProvider } from '../types';
import { emailService } from './emailSync';
import { whatsAppService } from './whatsappSync';
import { projectManager } from './projectManager';
import { securityService } from './security';

/**
 * CHANNEL MANAGER
 * Punto único de entrada para todas las comunicaciones externas.
 * Implementa el patrón Strategy/Adapter para soportar múltiples canales.
 */
class ChannelManager {
  private providers: Map<CommunicationChannel, IChannelProvider> = new Map();
  private isRunning = false;
  private intervalId: number | null = null;

  constructor() {
    // Registrar adaptadores disponibles
    this.registerProvider('EMAIL', emailService);
    this.registerProvider('WHATSAPP', whatsAppService);
    // Future: this.registerProvider('SMS', smsService);
    // Future: this.registerProvider('AIRBNB', airbnbService);
  }

  public registerProvider(type: CommunicationChannel, provider: IChannelProvider) {
    this.providers.set(type, provider);
  }

  public startBackgroundSync() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const loop = async () => {
      if (!navigator.onLine) return;
      
      for (const provider of this.providers.values()) {
        try {
          await provider.processQueue();
          await provider.syncInbound();
        } catch (e) {
          console.error(`Error en canal ${provider.channelType}:`, e);
        }
      }
    };

    loop(); // Immediate run
    this.intervalId = window.setInterval(loop, 30000); // Global sync cycle
  }

  public stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Guardado seguro de cuentas.
   * Utiliza SecurityService para cifrar credenciales antes de persistir.
   */
  public async saveAccount(account: CommunicationAccount, rawConfig: any): Promise<void> {
    const store = projectManager.getStore();
    
    // 1. Validar config con el proveedor correspondiente
    const provider = this.providers.get(account.type);
    if (provider) {
       // Optional: await provider.validateConfig(rawConfig);
    }

    // 2. Cifrar
    const secureJson = securityService.encryptConfig(rawConfig);
    
    // 3. Guardar
    const secureAccount = { ...account, config_json: secureJson };
    await store.saveAccount(secureAccount);
  }

  /**
   * Obtiene cuentas descifradas (solo para uso en memoria).
   */
  public async getDecryptedAccounts(): Promise<{account: CommunicationAccount, config: any}[]> {
    const store = projectManager.getStore();
    const accounts = await store.getAccounts();
    
    return accounts.map(acc => ({
      account: acc,
      config: securityService.decryptConfig(acc.config_json)
    }));
  }

  /**
   * Fuerza el procesamiento inmediato de la cola (ej: usuario pulsa enviar).
   */
  public async forceProcess() {
    for (const provider of this.providers.values()) {
        await provider.processQueue();
    }
  }
}

export const channelManager = new ChannelManager();
