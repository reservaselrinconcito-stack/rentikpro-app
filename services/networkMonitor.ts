
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private online: boolean = navigator.onLine;
  private listeners: ((online: boolean) => void)[] = [];

  private constructor() {
    window.addEventListener('online', () => this.updateState(true));
    window.addEventListener('offline', () => this.updateState(false));
  }

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  public isOnline(): boolean {
    return this.online;
  }

  public subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.online);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private updateState(isOnline: boolean) {
    if (this.online !== isOnline) {
      this.online = isOnline;
      this.listeners.forEach(l => l(isOnline));
      console.log(`Network Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    }
  }
}

export const networkMonitor = NetworkMonitor.getInstance();
