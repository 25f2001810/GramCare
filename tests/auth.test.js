import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { canAccessRole, getRoleHome, login, readSession } from '../src/lib/auth.js';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;

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

afterEach(() => {
  if (realStorage) Object.defineProperty(globalThis, 'localStorage', realStorage);
  else delete globalThis.localStorage;
});

test('login accepts the correct admin password and stores an expiring session without password data', async () => {
  installStorage();
  const user = await login(' ADMIN@DEMO.GRAMCARE ', 'admin123', 'admin');
  assert.equal(user.id, 'admin-primary');
  assert.equal(user.role, 'admin');
  assert.equal('passwordHash' in user, false);
  assert.equal('salt' in user, false);
  const session = JSON.parse(storage.getItem('gramcare-session'));
  assert.deepEqual(Object.keys(session).sort(), ['loginAt', 'name', 'role', 'userId']);
  assert.equal(readSession().userId, user.id);
});

test('login accepts the correct doctor password for the doctor role', async () => {
  installStorage();
  const user = await login('dr.kumar@demo.gramcare', 'doctor123', 'doctor');
  assert.equal(user.id, 'doctor-kumar');
  assert.equal(user.role, 'doctor');
});

test('login rejects an incorrect password', async () => {
  installStorage();
  await assert.rejects(login('admin@demo.gramcare', 'wrong-password', 'admin'), {
    message: 'Email or password is incorrect.'
  });
});

test('login rejects an unknown email', async () => {
  installStorage();
  await assert.rejects(login('missing@example.test', 'any-password', 'doctor'), {
    message: 'Email or password is incorrect.'
  });
});

test('login rejects a valid account when the selected role is wrong', async () => {
  installStorage();
  await assert.rejects(login('dr.kumar@demo.gramcare', 'doctor123', 'admin'), {
    message: 'Email or password is incorrect.'
  });
  assert.equal(storage.getItem('gramcare-session'), null);
});

test('session expires after twelve hours and is removed from storage', () => {
  installStorage();
  storage.setItem('gramcare-session', JSON.stringify({
    userId: 'doctor-kumar', role: 'doctor', name: 'Dr. Arjun Kumar', loginAt: Date.now() - 12 * 60 * 60 * 1000 - 1
  }));
  assert.equal(readSession(), null);
  assert.equal(storage.getItem('gramcare-session'), null);
});

test('role routing maps each role to its own landing page', () => {
  assert.equal(getRoleHome('admin'), '/admin');
  assert.equal(getRoleHome('doctor'), '/doctor');
  assert.equal(getRoleHome('unknown'), '/');
  assert.equal(canAccessRole('doctor', 'doctor'), true);
  assert.equal(canAccessRole('doctor', 'admin'), false);
  assert.equal(canAccessRole('admin', 'admin'), true);
});
