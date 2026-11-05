import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db.js';

const SESSION_KEY = 'gramcare-session';
const SESSION_DURATION = 12 * 60 * 60 * 1000;
const ITERATIONS = 120000;
const authContext = createContext(null);

function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error('Secure password hashing is unavailable in this browser.');
  return globalThis.crypto;
}

const toHex = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

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
  return role === 'doctor' ? '/doctor' : role === 'worker' ? '/visits' : '/login';
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
    if (
      !session?.userId ||
      !['doctor', 'worker'].includes(session.role) ||
      !Number.isFinite(session.loginAt) ||
      session.loginAt > Date.now() ||
      Date.now() - session.loginAt >= SESSION_DURATION
    ) {
      globalThis.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return null;
  }
}

export async function login(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await db.users.where('email').equals(normalizedEmail).first();
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
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
    let active = true;
    const session = readSession();
    if (!session) {
      setLoading(false);
      return () => { active = false; };
    }
    db.users.get(session.userId).then((row) => {
      if (active) {
        if (row && row.role === session.role) {
          setUser(safeUser(row));
          expiryTimer.current = window.setTimeout(() => {
            logout();
            setUser(null);
          }, Math.max(0, session.loginAt + SESSION_DURATION - Date.now()));
        }
        else globalThis.localStorage?.removeItem(SESSION_KEY);
        setLoading(false);
      }
    }).catch((error) => {
      if (active) {
        setLoading(false);
        console.error('Unable to restore the saved session.', error);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(expiryTimer.current);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password) => {
      const signedIn = await login(email, password);
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
    },
    isDoctor: user?.role === 'doctor'
  }), [user, loading]);

  return createElement(authContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(authContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
