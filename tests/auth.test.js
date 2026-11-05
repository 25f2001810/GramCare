import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { db } from '../src/db.js';
import { canAccessRole, getRoleHome, hashPassword, login, readSession } from '../src/lib/auth.js';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;

const realWhere = db.users.where;
let storage;
const realStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function installStorage() {
  const values = new Map();
  storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
}

function mockUser(user) {
  db.users.where = (field) => ({
    equals(value) {
      return { first: async () => field === 'email' && user?.email === value ? user : undefined };
    }
  });
}

afterEach(() => {
  db.users.where = realWhere;
  if (realStorage) Object.defineProperty(globalThis, 'localStorage', realStorage);
  else delete globalThis.localStorage;
});

test('login accepts the correct password and stores only an expiring session', async () => {
  installStorage();
  const salt = 'test-salt';
  const user = {
    id: 'doctor-test',
    email: 'doctor@example.test',
    name: 'Dr. Example',
    role: 'doctor',
    phc: 'Test PHC',
    salt,
    passwordHash: await hashPassword('secret-demo', salt)
  };
  mockUser(user);

  const result = await login(' DOCTOR@example.test ', 'secret-demo');

  assert.equal(result.id, user.id);
  assert.equal(result.name, user.name);
  assert.equal('passwordHash' in result, false);
  assert.equal('salt' in result, false);
  const session = JSON.parse(storage.getItem('gramcare-session'));
  assert.deepEqual(Object.keys(session).sort(), ['loginAt', 'name', 'role', 'userId']);
  assert.equal(session.userId, user.id);
  assert.equal(readSession().role, 'doctor');
});

test('login rejects an incorrect password with the same clear error', async () => {
  installStorage();
  const salt = 'test-salt';
  mockUser({
    id: 'worker-test',
    email: 'worker@example.test',
    name: 'Worker',
    role: 'worker',
    salt,
    passwordHash: await hashPassword('correct-password', salt)
  });

  await assert.rejects(login('worker@example.test', 'wrong-password'), {
    message: 'Email or password is incorrect.'
  });
});

test('login rejects an unknown email without disclosing account existence', async () => {
  installStorage();
  mockUser(undefined);
  await assert.rejects(login('missing@example.test', 'any-password'), {
    message: 'Email or password is incorrect.'
  });
});

test('session expires after twelve hours and is removed from storage', () => {
  installStorage();
  storage.setItem('gramcare-session', JSON.stringify({
    userId: 'doctor-test',
    role: 'doctor',
    name: 'Dr. Example',
    loginAt: Date.now() - 12 * 60 * 60 * 1000 - 1
  }));
  assert.equal(readSession(), null);
  assert.equal(storage.getItem('gramcare-session'), null);
});

test('role routing maps each role to its own landing page', () => {
  assert.equal(getRoleHome('doctor'), '/doctor');
  assert.equal(getRoleHome('worker'), '/visits');
  assert.equal(getRoleHome('unknown'), '/login');
  assert.equal(canAccessRole('doctor', 'doctor'), true);
  assert.equal(canAccessRole('doctor', 'worker'), false);
  assert.equal(canAccessRole('worker', 'worker'), true);
});
