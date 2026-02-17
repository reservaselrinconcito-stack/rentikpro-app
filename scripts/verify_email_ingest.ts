import { projectManager } from '../services/projectManager';
import { emailService } from '../services/emailSync';
import { bookingEmailParser } from '../services/bookingEmailParser';

async function verifyEmailIngest() {
    console.log("Starting Email Ingest Verification...");

    // 1. Ensure Store
    const store = projectManager.getStore();
    if (!store) {
        console.error("Store not initialized");
        return;
    }

    // 2. Get Initial Counts
    const initialEmails = await store.getPendingEmailIngests();
    const initialProvisionals = await store.getProvisionalBookings();
    console.log(`Initial: ${initialEmails.length} pending emails, ${initialProvisionals.length} provisional bookings`);

    // 3. Trigger Sync (Simulate)
    console.log("Triggering Sync...");
    await emailService.syncInbound();

    // 4. Wait for processing (sync is async but logs should show activity)
    setTimeout(async () => {
        const finalEmails = await store.getPendingEmailIngests();
        const finalProvisionals = await store.getProvisionalBookings();

        console.log(`Final: ${finalEmails.length} pending emails, ${finalProvisionals.length} provisional bookings`);

        if (finalProvisionals.length > initialProvisionals.length) {
            console.log("SUCCESS: New provisional booking created.");
            const newPb = finalProvisionals[0];
            console.log("New Booking Details:", {
                id: newPb.id,
                status: newPb.status, // Should be CONFIRMED if heuristics worked
                reservation_id: newPb.provider_reservation_id, // Should extract ID
                apartment_hint: newPb.apartment_hint, // Should match mock apt name if exists
                dates: `${newPb.start_date} -> ${newPb.end_date}`,
                guest: newPb.guest_name,
                price: `${newPb.total_price} ${newPb.currency}`,
                missing: newPb.missing_fields
            });

            // Check linkage
            const emailIngest = await store.getEmailIngestById(newPb.email_ingest_id);
            if (emailIngest) {
                console.log("SUCCESS: Linked Email Ingest found:", emailIngest.id);
                console.log("Parsing Metadata:", JSON.stringify(emailIngest.parsed_json, null, 2));
            } else {
                console.error("FAILURE: Linked Email Ingest NOT found.");
            }
        } else {
            console.log("No new booking created (Simulation might not have triggered a booking email or no new emails).");
        }
    }, 5000);
}

verifyEmailIngest();
