// Offline-first sync. Visits are saved with synced:0 and pushed when the network is back.
// Conflict rule (simple): last write wins by updatedAt. Replace with a real strategy later.
import { db } from '../db.js';

const SYNC_URL = import.meta.env.VITE_SYNC_URL;
let running = false;

export async function syncPending() {
  if (running) return { synced: 0, busy: true };
  if (!navigator.onLine) return { synced: 0, offline: true };
  running = true;
  try {
    const [pendingVisits, pendingReviews] = await Promise.all([
      db.visits.where('synced').equals(0).toArray(),
      db.reviews.where('synced').equals(0).toArray()
    ]);
    if (!pendingVisits.length && !pendingReviews.length) return { synced: 0 };

    if (SYNC_URL) {
      const res = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visits: pendingVisits, reviews: pendingReviews })
      });
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
    } else {
      await new Promise((r) => setTimeout(r, 700)); // simulated server for the demo
    }

    await Promise.all([
      pendingVisits.length && db.visits.bulkPut(pendingVisits.map((visit) => ({ ...visit, synced: 1 }))),
      pendingReviews.length && db.reviews.bulkPut(pendingReviews.map((review) => ({ ...review, synced: 1 })))
    ]);
    const synced = pendingVisits.length + pendingReviews.length;
    globalThis.localStorage?.setItem('gramcare-last-synced', String(Date.now()));
    return { synced };
  } finally {
    running = false;
  }
}
