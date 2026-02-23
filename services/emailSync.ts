import { projectManager } from './projectManager';
import { CommunicationAccount, CommunicationChannel, EmailConfig, Message, IChannelProvider, Conversation, EmailIngest, Booking } from '../types';
import { notifyDataChanged } from './dataRefresher';
import { securityService } from './security';
import { logger } from './logger';
import { bookingEmailParser } from './bookingEmailParser';
import { checkinService } from './checkinService';

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
      const apartments = await store.getAllApartments();

      for (const acc of emailAccounts) {
        try {
          const config = securityService.decryptConfig(acc.config_json) as EmailConfig;
          const newEmails = await this.simulateGmailFetch(config);

          for (const email of newEmails) {
            // 1. DEDUPLICATION (Persistent)
            const existingIngests = await store.query("SELECT id FROM email_ingest WHERE gmail_message_id = ?", [email.id]);
            if (existingIngests.length > 0) continue;

            // 2. CREATE INGEST RECORD
            const ingestId = crypto.randomUUID();
            const emailIngest: EmailIngest = {
              id: ingestId,
              provider: 'OTHER',
              gmail_message_id: email.id,
              received_at: new Date(email.date).toISOString(),
              from_addr: email.from,
              subject: email.subject,
              body_text: email.body,
              raw_links_json: [],
              parsed_json: {},
              status: 'NEW',
              created_at: Date.now()
            };
            await store.saveEmailIngest(emailIngest);

            // 3. PARSE
            const msgPlaceholder: Message = { id: crypto.randomUUID(), conversation_id: '', account_id: acc.id, direction: 'INBOUND', channel: 'EMAIL', status: 'DELIVERED', body: email.body, content_type: 'text/plain', created_at: Date.now() };
            const pb = await bookingEmailParser.parseBookingEmail(msgPlaceholder, email.subject, ingestId, apartments);

            if (pb) {
              emailIngest.provider = pb.provider;
              emailIngest.status = 'PARSED';
              emailIngest.parsed_json = pb;
              await store.saveEmailIngest(emailIngest);

              // 4. DEDUPLICATE BOOKING (Provider + Locator or HASH)
              const existingBookings = await store.getBookings();
              const isDuplicate = existingBookings.some(b =>
                (b.external_ref && pb.provider_reservation_id && b.external_ref === pb.provider_reservation_id && b.source === 'EMAIL_TRIGGER') ||
                (b.check_in === pb.start_date && b.check_out === pb.end_date && b.guest_name === pb.guest_name && b.apartment_id === pb.apartment_id)
              );

              if (isDuplicate) {
                emailIngest.status = 'LINKED';
                await store.saveEmailIngest(emailIngest);
                continue;
              }

              // 5. RESOLVE APARTMENT
              const matchedApt = apartments.find(a =>
                a.name.toLowerCase() === (pb.apartment_hint || '').toLowerCase() ||
                (pb.apartment_hint || '').toLowerCase().includes(a.name.toLowerCase())
              );

              if (matchedApt) {
                // 6. CREATE BOOKING
                const isBookingProvider = pb.provider === 'BOOKING';
                const isMissingDetails = pb.missing_fields && pb.missing_fields.length > 0;

                const bookingData: Booking = {
                  id: crypto.randomUUID(),
                  property_id: matchedApt.property_id,
                  apartment_id: matchedApt.id,
                  traveler_id: 'email_ingest_' + ingestId,
                  check_in: pb.start_date || '',
                  check_out: pb.end_date || '',
                  status: (isBookingProvider && isMissingDetails) ? 'pending' : 'confirmed',
                  total_price: pb.total_price || 0,
                  guests: pb.pax_adults || 1,
                  source: 'EMAIL_TRIGGER',
                  external_ref: pb.provider_reservation_id,
                  created_at: Date.now(),
                  guest_name: pb.guest_name || (isBookingProvider ? 'Booking.com (sin datos)' : 'Huésped Pendiente'),
                  notes: isMissingDetails ? `Datos faltantes: ${pb.missing_fields?.join(', ')}. Origen: ${pb.provider}` : `Ingesta automática ${pb.provider}`,
                  needs_details: isMissingDetails || isBookingProvider,
                  provisional_id: pb.id,
                  enrichment_status: isMissingDetails ? 'PENDING' : 'COMPLETE'
                };

                await store.saveBooking(bookingData);

                // 7. AUTO CHECK-IN REQUEST
                if (bookingData.status === 'confirmed') {
                  await checkinService.regenerateRequests();
                }

                emailIngest.status = 'LINKED';
                await store.saveEmailIngest(emailIngest);
                notifyDataChanged('bookings');
              } else {
                emailIngest.status = 'NEEDS_MANUAL';
                emailIngest.error_message = 'No se encontró el apartamento: ' + (pb.apartment_hint || 'Desconocido');
                await store.saveEmailIngest(emailIngest);
              }
            } else {
              emailIngest.status = 'NEEDS_MANUAL';
              emailIngest.parsed_json = { info: 'No se detectó reserva en este correo.' };
              await store.saveEmailIngest(emailIngest);
            }
          }

          config.last_sync_at = Date.now();
          acc.config_json = securityService.encryptConfig(config);
          await store.saveAccount(acc);
        } catch (e) {
          logger.error(`Error syncing account ${acc.name}:`, e);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async simulateGmailFetch(config: EmailConfig): Promise<Array<{ id: string, subject: string, body: string, from: string, date: number }>> {
    return new Promise(resolve => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          const providers = ['airbnb', 'booking', 'vrbo', 'escapada'];
          const p = providers[Math.floor(Math.random() * providers.length)];

          if (p === 'airbnb') {
            resolve([{
              id: 'GMAIL_' + crypto.randomUUID(),
              subject: 'Reserva confirmada - ABC123XYZ para 10 Feb',
              from: 'automated@airbnb.com',
              date: Date.now(),
              body: 'Reservation confirmed. Guest: Juan Demo. Code: ABC123XYZ. Check-in: 2026-02-10. Check-out: 2026-02-15. House: Loft Central. Total: 450€.'
            }]);
          } else if (p === 'booking') {
            resolve([{
              id: 'GMAIL_' + crypto.randomUUID(),
              subject: 'Booking.com: Nueva reserva #9988776655',
              from: 'reservations@booking.com',
              date: Date.now(),
              body: 'Nueva reserva recibida via Pulse. Numero de reserva: 9988776655. Check-in: 2026-03-01. Check-out: 2026-03-05. Apartment: Loft Central.'
            }]);
          } else if (p === 'vrbo') {
            resolve([{
              id: 'GMAIL_' + crypto.randomUUID(),
              subject: 'Reserva confirmada en Vrbo: HA-12345',
              from: 'reserva@vrbo.com',
              date: Date.now(),
              body: 'Reservation ID: HA-12345. Traveler: Maria Lopez. Dates: 15/04/2026 - 20/04/2026. Total: 600€. Accommodation: Loft Central.'
            }]);
          } else {
            resolve([{
              id: 'GMAIL_' + crypto.randomUUID(),
              subject: 'Solicitud de reserva en EscapadaRural: 22-ER-99',
              from: 'contacto@escapadarural.com',
              date: Date.now(),
              body: 'Nueva reserva confirmada: 22-ER-99. Nombre cliente: Pedro Ruiz. Fecha entrada: 01/05/2026. Fecha salida: 05/05/2026. Importe total: 300 EUR.'
            }]);
          }
        } else resolve([]);
      }, 1000);
    });
  }

  // (processQueue and Mocks same as before)
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
          logger.error(`Email Send Error ${msg.id}:`, err);
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
      logger.error("Queue Error:", err);
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

  private async simulateImapFetch(config: EmailConfig): Promise<Array<{ id: string, subject: string, body: string, from: string, date: number }>> {
    return new Promise(resolve => {
      setTimeout(() => {
        // 30% chance of receiving a booking email
        if (Math.random() > 0.7) {
          const types = ['airbnb', 'booking'];
          const type = types[Math.floor(Math.random() * types.length)];

          if (type === 'airbnb') {
            resolve([{
              id: crypto.randomUUID(),
              subject: 'Reservation confirmed - HM4SW2Q981 arrives Oct 15',
              from: 'automated@airbnb.com',
              date: Date.now(),
              body: `
                      Reservation confirmed
                      Guest: Juan Perez
                      Check-in: 15 Oct 2023
                      Check-out: 20 Oct 2023
                      Reservation code: HM4SW2Q981
                      Total: $450.00
                      Guests: 2 adults
                      House: Beach Villa 1
                    `
            }]);
          } else {
            resolve([{
              id: crypto.randomUUID(),
              subject: 'Booking.com: New booking! #3459281231',
              from: 'reservations@booking.com',
              date: Date.now(),
              body: `
                      Sending you a new booking!
                      Booking number: 3459281231
                      Check-in: 12/12/2023
                      Check-out: 15/12/2023
                      Guest: Maria Gonzalez
                      Price: € 320.00
                      Apartment: City Center Loft
                    `
            }]);
          }
        } else {
          resolve([]);
        }
      }, 1500);
    });
  }
  public startBackgroundSync() { /* Managed by ChannelManager now */ }
  public stop() { /* Managed by ChannelManager now */ }
}

export const emailSyncService = new EmailSyncService();
