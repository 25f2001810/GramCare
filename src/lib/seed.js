// FAKE demo data only. Never put real patient information in this file.
import { db } from '../db.js';
import { addDays, todayISO } from './util.js';

// due = days from today when the next ANC visit is due (negative = overdue)
const DEMO = [
  { id: 'p1', name: 'Lakshmi', age: 24, village: 'Ward 4', weeks: 30, due: -9, bp: [118, 76], symptoms: [], hb: 11.8 },
  { id: 'p2', name: 'Meena', age: 27, village: 'Ward 2', weeks: 36, due: -2, bp: [142, 92], symptoms: ['swelling'], hb: 11.2 },
  { id: 'p3', name: 'Revathi', age: 22, village: 'Ward 4', weeks: 21, due: -8, bp: [116, 74], symptoms: [], hb: 10.2 },
  { id: 'p4', name: 'Priya', age: 21, village: 'Ward 1', weeks: 12, due: 12, bp: [110, 70], symptoms: [], hb: 12.1 },
  { id: 'p5', name: 'Sunita', age: 29, village: 'Ward 3', weeks: 37, due: -1, bp: [128, 82], symptoms: [], hb: 11.5 },
  { id: 'p6', name: 'Kavitha', age: 26, village: 'Ward 2', weeks: 28, due: -4, bp: [120, 78], symptoms: ['bleeding'], hb: 11.0 },
  { id: 'p7', name: 'Anitha', age: 23, village: 'Ward 5', weeks: 8, due: 20, bp: [108, 68], symptoms: [], hb: 12.4 },
  { id: 'p8', name: 'Deepa', age: 31, village: 'Ward 3', weeks: 25, due: -10, bp: [144, 94], symptoms: [], hb: 11.4 },
  { id: 'p9', name: 'Mala', age: 25, village: 'Ward 5', weeks: 16, due: 5, bp: [112, 72], symptoms: [], hb: 11.9 },
  { id: 'p10', name: 'Selvi', age: 28, village: 'Ward 1', weeks: 32, due: -9, bp: [122, 80], symptoms: [], hb: 9.5 }
];

export async function resetDemoData() {
  const today = todayISO();
  await db.transaction('rw', db.patients, db.visits, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.patients.bulkPut(
      DEMO.map(({ id, name, age, village, weeks, due }) => ({ id, name, age, village, weeks, nextVisitDue: addDays(today, due) }))
    );
    await db.visits.bulkPut(
      DEMO.map((d) => ({
        id: `seed-${d.id}`,
        patientId: d.id,
        date: addDays(today, d.due - 28),
        bp: { sys: d.bp[0], dia: d.bp[1] },
        symptoms: d.symptoms,
        medicines: ['iron tablets'],
        weight: null,
        hb: d.hb,
        transcript: '',
        synced: 1,
        updatedAt: Date.now()
      }))
    );
  });
}

export async function seedIfEmpty() {
  if ((await db.patients.count()) === 0) await resetDemoData();
}
