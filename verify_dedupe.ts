import { dedupeBookingsForDisplay } from './utils/bookingDedupe.js';

const apt1 = 'apt_1';
const manual = {
    id: 'manual_1',
    apartment_id: apt1,
    check_in: '2026-04-01',
    check_out: '2026-04-05',
    status: 'confirmed',
    event_origin: 'manual',
    ical_uid: 'uid_123',
    property_id: 'prop_1',
    traveler_id: 'trav_1',
    total_price: 100,
    guests: 2,
    source: 'manual',
    created_at: Date.now()
};

const ical = {
    id: 'ical_1',
    apartment_id: apt1,
    check_in: '2026-04-01',
    check_out: '2026-04-05',
    status: 'confirmed',
    event_origin: 'ical',
    ical_uid: 'uid_123',
    property_id: 'prop_1',
    traveler_id: '',
    total_price: 0,
    guests: 0,
    source: 'Airbnb',
    created_at: Date.now()
};

const { deduplicated, hiddenCount } = dedupeBookingsForDisplay([manual, ical]);

console.log('--- Test Results ---');
console.log('Deduplicated length:', deduplicated.length);
console.log('Hidden count:', hiddenCount);

if (deduplicated.length === 1 && deduplicated[0].id === 'manual_1' && hiddenCount === 1) {
    console.log('Test PASSED');
    process.exit(0);
} else {
    console.error('Test FAILED');
    process.exit(1);
}
