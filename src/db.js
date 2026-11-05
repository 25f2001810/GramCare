import Dexie from 'dexie';
import { DOMAINS } from './config/domains.js';

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

export function migratePatientRecord(patient, migratedAt = Date.now()) {
  const conditions = Array.isArray(patient.conditions) && patient.conditions.length
    ? patient.conditions.map((condition) => {
      const domain = DOMAINS[condition.domain] ? condition.domain : 'pregnancy';
      const nextDueDate = condition.nextDue?.date ||
        condition.details?.nextChemoDate ||
        condition.details?.nextCheckupDate ||
        (domain === 'pregnancy' ? patient.nextVisitDue : null);
      return {
        ...condition,
        domain,
        details: { ...(condition.details || {}) },
        nextDue: {
          ...(condition.nextDue || {}),
          date: nextDueDate || '',
          label: condition.nextDue?.label || DOMAINS[domain].nextDueLabel
        }
      };
    })
    : [{
      domain: 'pregnancy',
      details: {
        ...(patient.weeks != null ? { weeks: patient.weeks } : {}),
        ...(patient.edd ? { edd: patient.edd } : {})
      },
      nextDue: {
        date: patient.nextVisitDue || '',
        label: DOMAINS.pregnancy.nextDueLabel
      }
    }];
  const domains = [...new Set(conditions.map((condition) => condition.domain))];

  return {
    ...patient,
    dob: patient.dob || '',
    gender: patient.gender || '',
    bloodGroup: patient.bloodGroup || '',
    phone: patient.phone || '',
    conditions,
    domains,
    createdAt: patient.createdAt ?? patient.updatedAt ?? migratedAt,
    updatedAt: patient.updatedAt ?? migratedAt
  };
}

export function migrateVisitRecord(visit) {
  const vitals = visit.vitals || {};
  return {
    ...visit,
    domain: DOMAINS[visit.domain] ? visit.domain : 'pregnancy',
    vitals: {
      bp: vitals.bp ?? visit.bp ?? null,
      sugar: vitals.sugar ?? visit.sugar ?? null,
      hba1c: vitals.hba1c ?? visit.hba1c ?? null,
      temp: vitals.temp ?? visit.temp ?? null,
      weight: vitals.weight ?? visit.weight ?? null,
      hb: vitals.hb ?? visit.hb ?? null
    },
    symptoms: Array.isArray(visit.symptoms) ? visit.symptoms : [],
    medicines: Array.isArray(visit.medicines) ? visit.medicines : [],
    notes: visit.notes || '',
    transcript: visit.transcript || '',
    synced: visit.synced ? 1 : 0
  };
}

db.version(3)
  .stores({
    patients: 'id, name, age, dob, gender, bloodGroup, phone, village, *domains, createdAt, updatedAt',
    visits: 'id, patientId, domain, date, synced, updatedAt',
    users: 'id, email, role',
    reviews: 'id, patientId, doctorId, status, synced, createdAt'
  })
  .upgrade(async (transaction) => {
    await transaction.table('patients').toCollection().modify((patient) => {
      Object.assign(patient, migratePatientRecord(patient));
    });
    await transaction.table('visits').toCollection().modify((visit) => {
      Object.assign(visit, migrateVisitRecord(visit));
    });
  });
