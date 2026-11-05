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
    const pending = await db.visits.where('synced').equals(0).toArray();
    if (!pending.length) return { synced: 0 };

    if (SYNC_URL) {
      const res = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visits: pending })
      });
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
    } else {
      await new Promise((r) => setTimeout(r, 700)); // simulated server for the demo
    }

    await db.visits.bulkPut(pending.map((v) => ({ ...v, synced: 1 })));
    return { synced: pending.length };
  } finally {
    running = false;
  }
}
