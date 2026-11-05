import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePatient } from '../src/lib/scoring.js';
import { extractFromTranscript, reviewFlags } from '../src/lib/extract.js';
import { buildPatientViews } from '../src/lib/patients.js';
import { addDays } from '../src/lib/util.js';

const TODAY = '2026-11-05';

test('demo sentence is extracted correctly', () => {
  const e = extractFromTranscript(
    'Lakshmi, 7 months pregnant, BP 150 by 100, headache since yesterday, taking iron tablets',
    [{ id: 'p1', name: 'Lakshmi' }]
  );
  assert.equal(e.patientId, 'p1');
  assert.deepEqual(e.bp, { sys: 150, dia: 100 });
  assert.equal(e.weeks, 30);
  assert.deepEqual(e.symptoms, ['headache']);
  assert.deepEqual(e.medicines, ['iron tablets']);
});

test('BP formats and weeks/weight/Hb', () => {
  assert.deepEqual(extractFromTranscript('bp 120/80').bp, { sys: 120, dia: 80 });
  assert.deepEqual(extractFromTranscript('BP 130 over 85').bp, { sys: 130, dia: 85 });
  const e = extractFromTranscript('36 weeks, weight 62.5 kg, haemoglobin 9.8');
  assert.equal(e.weeks, 36);
  assert.equal(e.weight, 62.5);
  assert.equal(e.hb, 9.8);
});

test('junk numbers are not treated as BP', () => {
  assert.equal(extractFromTranscript('visited 3 by 4 houses').bp, null);
});

test('missing fields are flagged', () => {
  assert.deepEqual(reviewFlags({ bp: null, weight: null }), ['BP not recorded', 'Weight not recorded']);
  assert.deepEqual(reviewFlags({ bp: { sys: 150, dia: 100 }, weight: 60 }), ['High BP']);
});

test('deck example: BP high + headache + 9 days overdue = 13, HIGH', () => {
  const r = scorePatient(
    { weeks: 30, nextVisitDue: addDays(TODAY, -9), bp: { sys: 150, dia: 100 }, symptoms: ['headache'] },
    TODAY
  );
  assert.equal(r.score, 13);
  assert.equal(r.level, 'HIGH');
});

test('levels: MEDIUM and LOW', () => {
  assert.equal(scorePatient({ weeks: 21, nextVisitDue: addDays(TODAY, -8), hb: 10.2 }, TODAY).level, 'MEDIUM');
  assert.equal(scorePatient({ weeks: 12, nextVisitDue: addDays(TODAY, 12), bp: { sys: 110, dia: 70 } }, TODAY).level, 'LOW');
});

test('patient list is sorted highest risk first', () => {
  const patients = [
    { id: 'a', name: 'A', weeks: 10, nextVisitDue: addDays(TODAY, 10) },
    { id: 'b', name: 'B', weeks: 30, nextVisitDue: addDays(TODAY, -9) }
  ];
  const visits = [{ id: 'v', patientId: 'b', date: TODAY, bp: { sys: 150, dia: 100 }, symptoms: ['headache'], updatedAt: 1 }];
  const v = buildPatientViews(patients, visits, TODAY);
  assert.equal(v[0].id, 'b');
  assert.equal(v[0].risk.level, 'HIGH');
});
