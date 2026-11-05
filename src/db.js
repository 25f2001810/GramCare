import Dexie from 'dexie';

// IndexedDB via Dexie. "synced" is stored as 0/1 because booleans can't be indexed.
export const db = new Dexie('gramcare');
db.version(1).stores({
  patients: 'id, name',
  visits: 'id, patientId, date, synced'
});

db.version(2).stores({
  patients: 'id, name',
  visits: 'id, patientId, date, synced',
  users: 'id, email, role',
  reviews: 'id, patientId, doctorId, status, synced, createdAt'
});
