import { projectManager } from './projectManager';
import { CommunicationAccount, CommunicationChannel, EmailConfig, Message, IChannelProvider, Conversation, EmailIngest, Booking } from '../types';
import { notifyDataChanged } from './dataRefresher';
import { securityService } from './security';
import { logger } from './logger';
import { bookingEmailParser } from './bookingEmailParser';

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
      const apartments = await store.getAllApartments(); // Fetch apartments for hints

      for (const acc of emailAccounts) {
        try {
          // Use Security Service to decrypt on the fly
          const config = securityService.decryptConfig(acc.config_json) as EmailConfig;

          const newEmails = await this.simulateImapFetch(config);

          if (newEmails.length > 0) {
            console.log(`IMAP: ${newEmails.length} nuevos correos para ${acc.name}`);

            for (const email of newEmails) {
              // 1. Create Conversation
              const convId = crypto.randomUUID();
              const conversation: Conversation = {
                id: convId,
                traveler_id: 'unknown_traveler', // In real app, match by email
                property_id: acc.property_id || undefined,
                subject: email.subject,
                status: 'OPEN',
                last_message_at: Date.now(),
                last_message_preview: email.body.substring(0, 50),
                unread_count: 1,
                tags_json: '[]',
                created_at: Date.now(),
                updated_at: Date.now(),
                last_message_direction: 'INBOUND'
              };
              await store.saveConversation(conversation);

              // 2. Create Message
              const msgId = crypto.randomUUID();
              const message: Message = {
                id: msgId,
                conversation_id: convId,
                account_id: acc.id,
                direction: 'INBOUND',
                channel: 'EMAIL',
                status: 'DELIVERED',
                body: email.body,
                content_type: 'text/plain',
                created_at: Date.now(),
                metadata_json: JSON.stringify({ from: email.from })
              };
              await store.saveMessage(message);

              // 3. Email Ingest & Parsing
              const ingestId = crypto.randomUUID();
              const emailIngest: EmailIngest = {
                id: ingestId,
                provider: 'OTHER', // Default, updated by parser if detected
                message_id: msgId,
                received_at: new Date(email.date).toISOString(),
                from_addr: email.from,
                subject: email.subject,
                body_text: email.body.substring(0, 20000), // Limit size
                raw_links_json: [],
                parsed_json: {},
                status: 'NEW',
                created_at: Date.now()
              };
              await store.saveEmailIngest(emailIngest);

              // 4. Parse with Apartments context
              const pb = await bookingEmailParser.parseBookingEmail(message, email.subject, ingestId, apartments);

              if (pb) {
                console.log(`[EmailSync] Created provisional booking from ${email.from}`);

                // Update Ingest with Parsed Data
                emailIngest.provider = pb.provider;
                emailIngest.status = 'PARSED';
                emailIngest.parsed_json = {
                  summary: 'Parsed successfuly',
                  heuristics: {
                    id: pb.provider_reservation_id,
                    hint: pb.apartment_hint,
                    dates: [pb.start_date, pb.end_date],
                    price: pb.total_price
                  },
                  found: Object.keys(pb).filter(k => pb[k as keyof typeof pb])
                };
                await store.saveEmailIngest(emailIngest);

                // Save Provisional
                await store.saveProvisionalBooking(pb);

                // --- IMMEDIATE BLOCKING (User Request) ---
                if (pb.start_date && pb.end_date && pb.apartment_hint) {
                  const matchedApt = apartments.find(a =>
                    a.name.toLowerCase() === (pb.apartment_hint || '').toLowerCase() ||
                    (pb.apartment_hint || '').toLowerCase().includes(a.name.toLowerCase())
                  );

                  if (matchedApt) {
                    // Check if blocking booking already exists
                    const existingBookings = await store.getBookings();
                    const blockingBooking = existingBookings.find(b => b.provisional_id === pb.id);

                    const bookingData: Booking = {
                      id: blockingBooking ? blockingBooking.id : crypto.randomUUID(),
                      property_id: matchedApt.property_id,
                      apartment_id: matchedApt.id,
                      traveler_id: 'email_trigger_placeholder', // Placeholder
                      check_in: pb.start_date,
                      check_out: pb.end_date,
                      status: 'confirmed', // BLOCKED
                      total_price: pb.total_price || 0,
                      guests: pb.pax_adults || 1,
                      source: 'EMAIL_TRIGGER', // Special source
                      external_ref: pb.provider_reservation_id,
                      created_at: blockingBooking ? blockingBooking.created_at : Date.now(),
                      guest_name: pb.guest_name || 'Unknown (Email Trigger)',
                      provisional_id: pb.id,
                      enrichment_status: 'PENDING',
                      summary: `Bloqueo preventivo por Email Trigger (${pb.provider})`
                    };

                    await store.saveBooking(bookingData);
                    console.log(`[EmailSync] Created/Updated BLOCKING booking for ${matchedApt.name}`);
                  } else {
                    console.warn(`[EmailSync] Could not block: Apartment hint '${pb.apartment_hint}' not resolved.`);
                  }
                }

                // Update Ingest Status to LINKED
                emailIngest.status = 'LINKED';
                await store.saveEmailIngest(emailIngest);

                notifyDataChanged('bookings');
              } else {
                // Mark as handled but not booking
                emailIngest.status = 'NEEDS_MANUAL';
                emailIngest.parsed_json = { error: 'No booking detected or confident' };
                await store.saveEmailIngest(emailIngest);
              }
            }

            // Update sync timestamp
            config.last_sync_at = Date.now();
            acc.config_json = securityService.encryptConfig(config);
            await store.saveAccount(acc);
          }
        } catch (e) {
          logger.error(`Error syncing account ${acc.name}:`, e);
        }
      }
    } finally {
      this.isProcessing = false;
    }
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

export const emailService = new EmailSyncService();
