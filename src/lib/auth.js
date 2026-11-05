import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';

const SESSION_KEY = 'gramcare-session';
const SESSION_DURATION = 12 * 60 * 60 * 1000;
const ITERATIONS = 120000;
const authContext = createContext(null);

// Fake demo accounts only. Passwords are PBKDF2 hashes; plaintext is shown only in the login UI.
const MOCK_USERS = [
  { id: 'admin-primary', email: 'admin@demo.gramcare', name: 'GramCare Admin', role: 'admin', hospital: 'Kaveri Community Hospital', salt: '9a250962d54ef1dc3f0cae6685e629f4', passwordHash: '9b224cff1d394547aec9a58c8c9fbcd586e1559ff856c726747620b43efe8418' },
  { id: 'admin-secondary', email: 'admin2@demo.gramcare', name: 'Assistant Admin', role: 'admin', hospital: 'Kaveri Community Hospital', salt: 'ab06080b9772318351e0c7f5f34f6499', passwordHash: 'ba18ac03a8e9d75f4b2600ed9eec064202bf8629f401d357605ce426e4543327' },
  { id: 'doctor-kumar', email: 'dr.kumar@demo.gramcare', name: 'Dr. Arjun Kumar', role: 'doctor', hospital: 'Kaveri Community Hospital', salt: '32ad7ae4f11d133b9ae1e311f8f377ef', passwordHash: 'b5fed882bfc6a8b2b9cd675972815d5ef8d4e32fb11649b1e7112b4e709f3146' },
  { id: 'doctor-mehta', email: 'dr.mehta@demo.gramcare', name: 'Dr. Nisha Mehta', role: 'doctor', hospital: 'Kaveri Community Hospital', salt: '6fc054951b11a0a7a59a7f0c1fca26dc', passwordHash: 'a48c7b62faa721bd790717a3ae0a65f0fce8b193e9f56cef5fe12c683aac02b8' },
  { id: 'doctor-rao', email: 'dr.rao@demo.gramcare', name: 'Dr. Dev Rao', role: 'doctor', hospital: 'Kaveri Community Hospital', salt: 'e3334bdacc5f6773da68a3fc19514d9f', passwordHash: '2ebe92ec87f4316195da07406e256acfe7628ed8030216ab91394454516df037' }
];

function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error('Secure password hashing is unavailable in this browser.');
  return globalThis.crypto;
}

const toHex = (bytes) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password, salt) {
  const crypto = cryptoApi();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(bits);
}

export function getRoleHome(role) {
  return role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/';
}

export function canAccessRole(userRole, requiredRole) {
  return userRole === requiredRole;
}

function safeUser(row) {
  if (!row) return null;
  const { passwordHash, salt, ...user } = row;
  return user;
}

export function readSession() {
  try {
    const stored = globalThis.localStorage?.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    const account = MOCK_USERS.find((user) => user.id === session?.userId && user.role === session?.role);
    if (!account || !Number.isFinite(session.loginAt) || session.loginAt > Date.now() || Date.now() - session.loginAt >= SESSION_DURATION) {
      globalThis.localStorage?.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return null;
  }
}

export async function login(email, password, role) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = MOCK_USERS.find((entry) => entry.email === normalizedEmail);
  if (!user || user.role !== role || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new Error('Email or password is incorrect.');
  }
  const session = { userId: user.id, role: user.role, name: user.name, loginAt: Date.now() };
  globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
  return safeUser(user);
}

export function logout() {
  globalThis.localStorage?.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const expiryTimer = useRef(null);

  useEffect(() => {
    const session = readSession();
    if (session) {
      const restored = MOCK_USERS.find((entry) => entry.id === session.userId);
      setUser(safeUser(restored));
      expiryTimer.current = window.setTimeout(() => {
        logout();
        setUser(null);
      }, Math.max(0, session.loginAt + SESSION_DURATION - Date.now()));
    }
    setLoading(false);
    return () => window.clearTimeout(expiryTimer.current);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password, role) => {
      const signedIn = await login(email, password, role);
      if (role === 'admin') globalThis.sessionStorage?.removeItem('gramcare-admin-consent');
      setUser(signedIn);
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = window.setTimeout(() => {
        logout();
        setUser(null);
      }, SESSION_DURATION);
      return signedIn;
    },
    logout: () => {
      window.clearTimeout(expiryTimer.current);
      logout();
      setUser(null);
    }
  }), [user, loading]);

  return createElement(authContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(authContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
