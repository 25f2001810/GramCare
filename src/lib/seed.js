// FAKE demo data only. Never put real patient information or credentials in this file.
import { db } from '../db.js';
import { DOMAINS } from '../config/domains.js';
import { hashPassword } from './auth.js';
import { addDays, todayISO } from './util.js';

export const DEMO_USERS = [
  { id: 'doctor-kumar', email: 'dr.kumar@demo.gramcare', name: 'Dr. Arjun Kumar', role: 'doctor', phc: 'Kaveri PHC', password: 'doctor123' },
  { id: 'doctor-mehta', email: 'dr.mehta@demo.gramcare', name: 'Dr. Nisha Mehta', role: 'doctor', phc: 'Kaveri PHC', password: 'doctor123' },
  { id: 'doctor-rao', email: 'dr.rao@demo.gramcare', name: 'Dr. Dev Rao', role: 'doctor', phc: 'Kaveri PHC', password: 'doctor123' },
  { id: 'worker-demo', email: 'worker@demo.gramcare', name: 'Anu Worker', role: 'worker', phc: 'Kaveri PHC', password: 'worker123' }
];

export const DEMO_PATIENTS = [
  { id: 'p1', name: 'Lakshmi', age: 24, dob: '2002-04-15', village: 'Ward 4', gender: 'female', primary: 'pregnancy', due: -9, weeks: 30, bp: [118, 76], symptoms: [], hb: 11.8 },
  { id: 'p2', name: 'Meena', age: 27, dob: '1999-03-10', village: 'Ward 2', gender: 'female', primary: 'pregnancy', due: -2, weeks: 36, bp: [142, 92], symptoms: ['swelling'], hb: 11.2 },
  { id: 'p3', name: 'Revathi', age: 22, dob: '2004-01-19', village: 'Ward 4', gender: 'female', primary: 'pregnancy', due: -8, weeks: 21, bp: [116, 74], symptoms: [], hb: 10.2 },
  { id: 'p4', name: 'Priya', age: 21, dob: '2005-05-21', village: 'Ward 1', gender: 'female', primary: 'pregnancy', due: 12, weeks: 12, bp: [110, 70], symptoms: [], hb: 12.1 },
  { id: 'p5', name: 'Sunita', age: 29, dob: '1997-02-11', village: 'Ward 3', gender: 'female', primary: 'pregnancy', due: -1, weeks: 37, bp: [128, 82], symptoms: [], hb: 11.5, secondaryCancer: true, cancerType: 'Breast', stage: 'I', protocol: 'Follow-up', cycleNumber: 6 },
  { id: 'p6', name: 'Farah', age: 46, dob: '1980-02-08', village: 'Ward 2', gender: 'female', primary: 'cancer', due: -5, cancerType: 'Breast', stage: 'II', protocol: 'AC-T', cycleNumber: 3 },
  { id: 'p7', name: 'Rohan', age: 58, dob: '1968-07-14', village: 'Ward 1', gender: 'male', primary: 'cancer', due: 3, cancerType: 'Colorectal', stage: 'III', protocol: 'FOLFOX', cycleNumber: 5, symptoms: ['fever'], missedCycle: true },
  { id: 'p8', name: 'Kamala', age: 63, dob: '1963-09-22', village: 'Ward 5', gender: 'female', primary: 'cancer', due: -12, cancerType: 'Ovarian', stage: 'II', protocol: 'Carboplatin + Paclitaxel', cycleNumber: 2, symptoms: ['bleeding'] },
  { id: 'p9', name: 'Ravi', age: 51, dob: '1975-06-03', village: 'Ward 3', gender: 'male', primary: 'cancer', due: 9, cancerType: 'Lymphoma', stage: 'II', protocol: 'ABVD', cycleNumber: 4 },
  { id: 'p10', name: 'Anitha', age: 52, dob: '1974-04-17', village: 'Ward 5', gender: 'female', primary: 'diabetes', due: 4, diabetesType: 'Type 2', sugar: 138, sugarType: 'fasting', hba1c: 7.4 },
  { id: 'p11', name: 'Dev', age: 61, dob: '1965-08-28', village: 'Ward 4', gender: 'male', primary: 'diabetes', due: -6, diabetesType: 'Type 2', sugar: 258, sugarType: 'random', hba1c: 9.6 },
  { id: 'p12', name: 'Sita', age: 44, dob: '1982-02-03', village: 'Ward 2', gender: 'female', primary: 'diabetes', due: 18, diabetesType: 'Type 1', sugar: 66, sugarType: 'fasting', hba1c: 8.2 }
];

function conditionFor(patient, domain, today, dueOffset) {
  const nextDueDate = addDays(today, dueOffset);
  if (domain === 'pregnancy') {
    return {
      domain,
      details: { weeks: patient.weeks, edd: '' },
      nextDue: { date: nextDueDate, label: DOMAINS.pregnancy.nextDueLabel }
    };
  }
  if (domain === 'cancer') {
    return {
      domain,
      details: {
        cancerType: patient.cancerType,
        stage: patient.stage,
        protocol: patient.protocol,
        cycleNumber: patient.cycleNumber,
        nextChemoDate: nextDueDate
      },
      nextDue: { date: nextDueDate, label: DOMAINS.cancer.nextDueLabel }
    };
  }
  return {
    domain,
    details: {
      diabetesType: patient.diabetesType,
      lastFastingSugar: patient.sugarType === 'fasting' ? patient.sugar : null,
      lastHbA1c: patient.hba1c,
      nextCheckupDate: nextDueDate
    },
    nextDue: { date: nextDueDate, label: DOMAINS.diabetes.nextDueLabel }
  };
}

function patientRecord(patient, index, today, createdAt) {
  const conditions = [
    conditionFor(patient, patient.primary, today, patient.due),
    ...(patient.secondaryCancer ? [conditionFor(patient, 'cancer', today, 14)] : [])
  ];
  const domains = [...new Set(conditions.map((condition) => condition.domain))];
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    dob: patient.dob,
    gender: patient.gender,
    bloodGroup: '',
    phone: `+9100000000${String(index + 1).padStart(2, '0')}`,
    village: patient.village,
    conditions,
    domains,
    createdAt,
    updatedAt: createdAt,
    ...(patient.primary === 'pregnancy' ? {
      weeks: patient.weeks,
      nextVisitDue: conditions.find((condition) => condition.domain === 'pregnancy').nextDue.date
    } : {})
  };
}

function visitRecord(patient, today, updatedAt) {
  const date = addDays(today, patient.due - 28);
  const bp = patient.bp ? { sys: patient.bp[0], dia: patient.bp[1] } : null;
  const vitals = {
    bp,
    sugar: patient.sugar ?? null,
    hba1c: patient.hba1c ?? null,
    temp: null,
    weight: null,
    hb: patient.hb ?? null
  };
  return {
    id: `seed-${patient.id}`,
    patientId: patient.id,
    domain: patient.primary,
    date,
    vitals,
    bp,
    sugar: patient.sugar ?? null,
    sugarType: patient.sugarType,
    hba1c: patient.hba1c ?? null,
    symptoms: patient.symptoms || [],
    medicines: patient.primary === 'pregnancy' ? ['iron tablets'] : [],
    notes: '',
    transcript: '',
    weight: null,
    hb: patient.hb ?? null,
    missedCycle: patient.missedCycle || false,
    synced: 1,
    updatedAt
  };
}

export async function resetDemoData() {
  const today = todayISO();
  const createdAt = Date.now();
  await db.transaction('rw', db.patients, db.visits, db.reviews, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.reviews.clear();
    await db.patients.bulkPut(createDemoPatientRecords(today, createdAt));
    await db.visits.bulkPut(DEMO_PATIENTS.map((patient) => visitRecord(patient, today, createdAt)));
  });
}

export function createDemoPatientRecords(today = todayISO(), createdAt = Date.now()) {
  return DEMO_PATIENTS.map((patient, index) => patientRecord(patient, index, today, createdAt));
}

export async function seedDemoUsers() {
  for (const demo of DEMO_USERS) {
    const exists = await db.users.where('email').equals(demo.email).first();
    if (exists) continue;
    const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const salt = Array.from(saltBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    await db.users.add({
      id: demo.id,
      email: demo.email,
      name: demo.name,
      role: demo.role,
      phc: demo.phc,
      passwordHash: await hashPassword(demo.password, salt),
      salt
    });
  }
}

let seedPromise;
export function seedIfEmpty() {
  if (!seedPromise) {
    seedPromise = (async () => {
      if ((await db.patients.count()) === 0) await resetDemoData();
      await seedDemoUsers();
    })().catch((error) => {
      seedPromise = undefined;
      throw error;
    });
  }
  return seedPromise;
}
