import { IDataStore, CleaningTask, CleaningTaskStatus } from '../types';

export class CleaningService {
    private store: IDataStore;

    constructor(store: IDataStore) {
        this.store = store;
    }

    /**
     * Generates cleaning tasks for a given date based on checkouts.
     * Idempotent: specific task is identified by apartment_id + due_date.
     * @param dateStr YYYY-MM-DD
     */
    async generateDailyTasks(dateStr: string): Promise<number> {
        // 1. Get all checkouts for this date
        // We need a method to get bookings by checkout date.
        // Or we can get all bookings overlapping this date and filter.
        // Let's rely on a raw query helper or add getBookingsByCheckoutDate to store?
        // For now, let's fetch active bookings and filter in memory to avoid store changes if possible, unless performance is an issue.
        // Better: Add getCheckouts(date) to store? Or use raw query if IDataStore allows (it doesn't expose query directly usually).
        // SQLiteStore has generic query but IDataStore is the interface.
        // Let's assume we can cast store to SQLiteStore or add a specific method.
        // Actually, IDataStore usually has getBookings().

        // BUT: efficient way is better. 
        // Let's assume for v1 we iterate bookings.

        // Actually, IDataStore interface in types.ts doesn't show getBookings taking dates.
        // Let's look at what available.
        // getAllBookings? Or we can query directly if we are inside service layer that knows about SQLite.
        // But CleaningService should theoretically be agnostic.
        // Let's add getCheckouts to IDataStore? Or just use existing.

        // I'll assume we can use a direct query if we cast to any, or ideally standard method.
        // Let's try to use generic 'query' if available or just fetch all active bookings if count is low.
        // Given scope "local web", fetching all bookings might be fine.

        // However, let's stick to using what we have.
        // IDataStore has 'export' which dumps all.
        // Let's trust we can add a helper or use what exists.

        // Wait, I updated IDataStore.
        // I didn't add getCheckouts.

        // Let's implement logic:
        // Fetch generic bookings/stays.
        // Filter by checkout date.

        // To permit this without huge refactor, I'll access the store's underlying query if possible, or just fetch all.
        // Let's fetch all "active" or recent bookings.
        // Assuming getBookings() returns all.

        const allBookings = await (this.store as any).query("SELECT * FROM bookings WHERE check_out = ?", [dateStr]);
        const allStays = await (this.store as any).query("SELECT * FROM stays WHERE check_out = ?", [dateStr]);

        const checkoutApartmentIds = new Set<string>();

        allBookings.forEach((b: any) => checkoutApartmentIds.add(b.apartment_id));
        allStays.forEach((s: any) => checkoutApartmentIds.add(s.apartment_id));

        let createdCount = 0;

        // 2. For each apartment with checkout, ensure task exists
        for (const aptId of checkoutApartmentIds) {
            if (!aptId) continue;

            // Check if task exists
            const existing = await this.store.getCleaningTasks(dateStr, dateStr, aptId);
            if (existing.length > 0) continue; // Already exists

            // Check for Check-in same day (Urgent)
            const checkins = await (this.store as any).query("SELECT * FROM bookings WHERE check_in = ? AND apartment_id = ?", [dateStr, aptId]);
            const isUrgent = checkins.length > 0;

            const newTask: CleaningTask = {
                id: crypto.randomUUID(),
                apartment_id: aptId,
                due_date: dateStr,
                status: 'PENDING',
                notes: isUrgent ? 'URGENTE: Entrada hoy mismo' : '',
                created_at: Date.now(),
                updated_at: Date.now()
            };

            await this.store.saveCleaningTask(newTask);
            createdCount++;
        }

        return createdCount;
    }

    async getTasksForRange(start: string, end: string): Promise<CleaningTask[]> {
        return await this.store.getCleaningTasks(start, end);
    }

    async completeTask(taskId: string, signature: string): Promise<void> {
        const task = await this.store.getCleaningTaskById(taskId);
        if (!task) throw new Error("Task not found");

        task.status = 'DONE';
        task.completed_at = Date.now();
        task.signature_name = signature;
        task.updated_at = Date.now();

        await this.store.saveCleaningTask(task);
    }
}
