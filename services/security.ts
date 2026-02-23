
/**
 * SECURITY SERVICE
 * Maneja el cifrado de configuraciones sensibles.
 * En una app real de escritorio, esto se conectaría con el Keychain del SO.
 * En esta versión portable/archivo, usamos un cifrado basado en claves internas
 * para asegurar que el archivo SQLite no contenga contraseñas en texto plano.
 */

// Simple XOR cipher for demo (In production use AES-GCM via SubtleCrypto)
const DEMO_KEY = "RENTIK_PRO_SECURE_KEY_2025";

const xorEncrypt = (text: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ DEMO_KEY.charCodeAt(i % DEMO_KEY.length));
  }
  return btoa(result);
};

const xorDecrypt = (base64: string): string => {
  try {
    const text = atob(base64);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ DEMO_KEY.charCodeAt(i % DEMO_KEY.length));
    }
    return result;
  } catch (e) {
    console.error("Decryption failed", e);
    return "";
  }
};

export class SecurityService {
  /**
   * Cifra un objeto de configuración completo.
   * Detecta campos sensibles comunes y los cifra.
   */
  encryptConfig(config: any): string {
    const safeConfig = { ...config };
    // Lista de campos a cifrar
    const sensitiveFields = ['password', 'encrypted_password', 'access_token', 'client_secret', 'api_key'];

    for (const field of sensitiveFields) {
      if (safeConfig[field] && !safeConfig[field].startsWith('ENC::')) {
        safeConfig[field] = `ENC::${xorEncrypt(safeConfig[field])}`;
      }
    }
    return JSON.stringify(safeConfig);
  }

  /**
   * Descifra la configuración para su uso en memoria.
   */
  decryptConfig(jsonConfig: string): any {
    try {
      const config = JSON.parse(jsonConfig);
      const sensitiveFields = ['password', 'encrypted_password', 'access_token', 'client_secret', 'api_key'];

      for (const field of sensitiveFields) {
        if (config[field] && typeof config[field] === 'string' && config[field].startsWith('ENC::')) {
          const cipherText = config[field].substring(5); // Remove ENC::
          config[field] = xorDecrypt(cipherText);
        }
      }
      return config;
    } catch (e) {
      console.error("Error parsing secure config", e);
      return {};
    }
  }

  async sha256(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const securityService = new SecurityService();
