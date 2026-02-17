import { UserSettings } from '../types';
import { logger } from './logger';

export class SmtpService {
    private static instance: SmtpService;

    private constructor() { }

    public static getInstance(): SmtpService {
        if (!SmtpService.instance) {
            SmtpService.instance = new SmtpService();
        }
        return SmtpService.instance;
    }

    /**
     * Verifica si la configuración mínima necesaria está presente
     */
    public verifyConfig(settings: UserSettings): { valid: boolean; missing: string[] } {
        const missing: string[] = [];
        if (!settings.email_outgoing_from) missing.push('Email Remitente');
        if (!settings.smtp_host) missing.push('Servidor SMTP');
        if (!settings.smtp_user) missing.push('Usuario SMTP');
        if (!settings.smtp_pass) missing.push('Contraseña SMTP');

        return {
            valid: missing.length === 0,
            missing
        };
    }

    /**
     * Simula el envío de un email (Web) o llama al backend (Tauri)
     */
    public async sendEmail(
        to: string,
        subject: string,
        htmlBody: string,
        settings: UserSettings
    ): Promise<{ success: boolean; error?: string }> {

        // 1. Validar Configuración
        const check = this.verifyConfig(settings);
        if (!check.valid) {
            return { success: false, error: `Configuración incompleta: ${check.missing.join(', ')}` };
        }

        logger.log(`[SMTP] Preparando envío a ${to}...`);
        logger.log(`[SMTP] Asunto: ${subject}`);

        // 2. Simular Retardo de Red
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. Simular Fallo Aleatorio (5%) para probar robustez en logs
        if (Math.random() < 0.05) {
            logger.error(`[SMTP] Error simulado de red al enviar a ${to}`);
            return { success: false, error: "Error de conexión con servidor SMTP (Simulado)" };
        }

        // 4. Éxito
        logger.log(`[SMTP] Enviado CORRECTAMENTE a ${to}`);
        logger.log(`[SMTP] Contenido HTML (Preview):\n${htmlBody.substring(0, 200)}...`);

        return { success: true };
    }
}

export const smtpService = SmtpService.getInstance();
