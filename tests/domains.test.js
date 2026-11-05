import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS } from '../src/config/domains.js';
import { db, migratePatientRecord, migrateVisitRecord } from '../src/db.js';
import { buildPatientViews } from '../src/lib/patients.js';
import { scorePatient } from '../src/lib/scoring.js';
import { createDemoPatientRecords, DEMO_PATIENTS } from '../src/lib/seed.js';
import { addDays } from '../src/lib/util.js';

const TODAY = '2026-11-05';

test('version upgrade mapping preserves old patient and visit values', () => {
  const patient = migratePatientRecord({
    id: 'legacy-1',
    name: 'Lakshmi',
    age: 24,
    village: 'Ward 4',
    weeks: 30,
    nextVisitDue: '2026-10-27',
    updatedAt: 123
  }, 456);
  const visit = migrateVisitRecord({
    id: 'legacy-visit',
    patientId: 'legacy-1',
    date: '2026-10-01',
    bp: { sys: 142, dia: 92 },
    hb: 10.8,
    weight: 59,
    symptoms: ['swelling'],
    medicines: ['iron tablets'],
    transcript: 'Demo transcript',
    synced: 0
  });

  assert.equal(patient.name, 'Lakshmi');
  assert.equal(patient.weeks, 30);
  assert.equal(patient.nextVisitDue, '2026-10-27');
  assert.deepEqual(patient.domains, ['pregnancy']);
  assert.deepEqual(patient.conditions[0], {
    domain: 'pregnancy',
    details: { weeks: 30 },
    nextDue: { date: '2026-10-27', label: DOMAINS.pregnancy.nextDueLabel }
  });
  assert.equal(patient.createdAt, 123);
  assert.deepEqual(visit.bp, { sys: 142, dia: 92 });
  assert.deepEqual(visit.vitals, {
    bp: { sys: 142, dia: 92 },
    sugar: null,
    hba1c: null,
    temp: null,
    weight: 59,
    hb: 10.8
  });
  assert.deepEqual(visit.symptoms, ['swelling']);
  assert.deepEqual(visit.medicines, ['iron tablets']);
  assert.equal(visit.transcript, 'Demo transcript');
  assert.equal(visit.synced, 0);
});

test('domain definitions include the extension metadata and clinical review marker targets', () => {
  const domainsIndex = db.patients.schema.indexes.find((index) => index.name === 'domains');
  assert.equal(db.verno, 3);
  assert.equal(domainsIndex?.multi, true);
  assert.deepEqual(Object.keys(DOMAINS), ['pregnancy', 'cancer', 'diabetes']);
  assert.deepEqual(DOMAINS.pregnancy.detailFields, ['weeks', 'edd']);
  assert.deepEqual(DOMAINS.cancer.detailFields, ['cancerType', 'stage', 'protocol', 'cycleNumber', 'nextChemoDate']);
  assert.deepEqual(DOMAINS.diabetes.detailFields, ['diabetesType', 'lastFastingSugar', 'lastHbA1c', 'nextCheckupDate']);
  for (const domain of Object.values(DOMAINS)) {
    assert.ok(domain.id && domain.label && domain.labelTa && domain.labelHi && domain.icon);
    assert.ok(Array.isArray(domain.dangerSigns));
    assert.ok(domain.nextDueLabel);
    assert.deepEqual(Object.keys(domain.defaultFollowUpDays), ['HIGH', 'MEDIUM', 'LOW']);
  }
});

test('demo seed builds twelve normalized fake patients with one multi-condition patient', () => {
  const records = createDemoPatientRecords(TODAY, 123);
  assert.equal(records.length, 12);
  assert.equal(DEMO_PATIENTS.filter((patient) => patient.primary === 'pregnancy').length, 5);
  assert.equal(DEMO_PATIENTS.filter((patient) => patient.primary === 'cancer').length, 4);
  assert.equal(DEMO_PATIENTS.filter((patient) => patient.primary === 'diabetes').length, 3);
  assert.equal(records.filter((patient) => patient.conditions.length === 2).length, 1);
  for (const patient of records) {
    assert.match(patient.phone, /^\+\d{11,15}$/);
    assert.deepEqual(patient.domains, [...new Set(patient.conditions.map((condition) => condition.domain))]);
    assert.equal(patient.createdAt, 123);
  }
});

test('cancer scoring flags overdue appointments and configured danger signs', () => {
  const condition = {
    domain: 'cancer',
    details: { cancerType: 'Ovarian', protocol: 'Demo protocol', nextChemoDate: addDays(TODAY, -2) },
    nextDue: { date: addDays(TODAY, -2), label: DOMAINS.cancer.nextDueLabel }
  };
  const risk = scorePatient(
    { conditions: [condition] },
    { domain: 'cancer', date: TODAY, symptoms: ['fever'] },
    TODAY
  );
  assert.equal(risk.level, 'HIGH');
  assert.equal(risk.overdueDays, 2);
  assert.ok(risk.reasons.includes('Danger sign: fever'));
  assert.equal(risk.conditionResults[0].domain, 'cancer');
});

test('cancer scoring flags an explicitly missed treatment cycle', () => {
  const condition = {
    domain: 'cancer',
    details: { cancerType: 'Demo', stage: 'II', protocol: 'Demo', cycleNumber: 2 },
    nextDue: { date: addDays(TODAY, 4), label: DOMAINS.cancer.nextDueLabel }
  };
  const risk = scorePatient(
    { conditions: [condition] },
    { domain: 'cancer', date: TODAY, missedCycle: true, symptoms: [] },
    TODAY
  );
  assert.equal(risk.level, 'MEDIUM');
  assert.ok(risk.reasons.includes('Missed treatment cycle'));
});

test('diabetes scoring evaluates fasting, random, low sugar, HbA1c, and overdue data', () => {
  const condition = {
    domain: 'diabetes',
    details: { lastFastingSugar: 126, lastHbA1c: 9.1 },
    nextDue: { date: addDays(TODAY, -1), label: DOMAINS.diabetes.nextDueLabel }
  };
  const fasting = scorePatient({ conditions: [condition] }, { domain: 'diabetes', vitals: { sugar: 126 } }, TODAY);
  assert.equal(fasting.level, 'HIGH');
  assert.ok(fasting.reasons.includes('Fasting sugar 126'));
  assert.ok(fasting.reasons.includes('HbA1c 9.1'));
  assert.equal(fasting.overdueDays, 1);

  const random = scorePatient(
    { conditions: [condition] },
    { domain: 'diabetes', vitals: { sugar: { value: 250, type: 'random' } } },
    TODAY
  );
  assert.equal(random.level, 'HIGH');
  assert.ok(random.reasons.includes('Random sugar 250'));

  const low = scorePatient(
    { conditions: [condition] },
    { domain: 'diabetes', vitals: { sugar: 69, sugarType: 'fasting' } },
    TODAY
  );
  assert.equal(low.level, 'HIGH');
  assert.ok(low.reasons.includes('Low sugar 69'));
});

test('multi-condition patient receives the highest condition risk and earliest next due', () => {
  const patient = {
    id: 'multi-1',
    name: 'Demo patient',
    age: 40,
    village: 'Ward 1',
    domains: ['pregnancy', 'cancer'],
    conditions: [
      {
        domain: 'pregnancy',
        details: { weeks: 20 },
        nextDue: { date: addDays(TODAY, 5), label: 'ANC' }
      },
      {
        domain: 'cancer',
        details: { cancerType: 'Demo', stage: 'II', protocol: 'Demo', cycleNumber: 2 },
        nextDue: { date: addDays(TODAY, -1), label: 'Oncology' }
      }
    ]
  };
  const views = buildPatientViews([patient], [
    { id: 'v1', patientId: 'multi-1', domain: 'pregnancy', date: TODAY, bp: { sys: 110, dia: 70 }, symptoms: [] },
    { id: 'v2', patientId: 'multi-1', domain: 'cancer', date: TODAY, symptoms: ['bleeding'] }
  ], TODAY);

  assert.equal(views[0].risk.domain, 'cancer');
  assert.equal(views[0].risk.level, 'HIGH');
  assert.deepEqual(views[0].risk.conditionResults.map((result) => result.domain), ['pregnancy', 'cancer']);
  assert.deepEqual(views[0].domains, ['pregnancy', 'cancer']);
  assert.deepEqual(views[0].nextDue, { date: addDays(TODAY, -1), label: 'Oncology' });
});
