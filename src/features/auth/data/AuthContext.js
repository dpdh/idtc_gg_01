import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeCredential, saveCredential, verifyCredential } from './credentialStore';

const USERS_KEY = '@twini/users/v1';
const SESSION_KEY = '@twini/session/v1';
const AuthContext = createContext(null);

const normalizeEmail = (email) => email.trim().toLowerCase();
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

async function readUsers() {
  const serialized = await AsyncStorage.getItem(USERS_KEY);
  if (!serialized) return [];
  try {
    const users = JSON.parse(serialized);
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
}

function validateEmail(email) {
  const normalized = normalizeEmail(email || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Enter a valid email address.');
  }
  return normalized;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [sessionId, users] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          readUsers(),
        ]);
        if (mounted && sessionId) setUser(users.find((item) => item.id === sessionId) || null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const register = useCallback(async (profile, password) => {
    const fullName = (profile.fullName || '').trim();
    if (!fullName) throw new Error('Enter your full name.');
    const email = validateEmail(profile.email);
    validatePassword(password);

    const users = await readUsers();
    if (users.some((item) => normalizeEmail(item.email) === email)) {
      throw new Error('An account with this email already exists.');
    }

    const nextUser = {
      id: makeId(),
      fullName,
      email,
      organization: (profile.organization || '').trim(),
      industry: (profile.industry || '').trim(),
      country: (profile.country || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCredential(nextUser.id, password);
    try {
      await writeUsers([...users, nextUser]);
      await AsyncStorage.setItem(SESSION_KEY, nextUser.id);
    } catch (error) {
      await removeCredential(nextUser.id);
      throw error;
    }
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(async (rawEmail, password) => {
    const email = validateEmail(rawEmail);
    if (!password) throw new Error('Enter your password.');
    const users = await readUsers();
    const account = users.find((item) => normalizeEmail(item.email) === email);
    if (!account || !(await verifyCredential(account.id, password))) {
      throw new Error('Email or password is incorrect.');
    }
    await AsyncStorage.setItem(SESSION_KEY, account.id);
    setUser(account);
    return account;
  }, []);

  const updateProfile = useCallback(async (changes) => {
    if (!user) throw new Error('Sign in to edit your profile.');
    const fullName = (changes.fullName || '').trim();
    if (!fullName) throw new Error('Name cannot be empty.');
    const email = validateEmail(changes.email);
    const users = await readUsers();
    if (users.some((item) => item.id !== user.id && normalizeEmail(item.email) === email)) {
      throw new Error('An account with this email already exists.');
    }
    const updated = {
      ...user,
      fullName,
      email,
      organization: (changes.organization || '').trim(),
      industry: (changes.industry || '').trim(),
      country: (changes.country || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    await writeUsers(users.map((item) => item.id === user.id ? updated : item));
    setUser(updated);
    return updated;
  }, [user]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!user) throw new Error('Sign in to change your password.');
    validatePassword(newPassword);
    if (!(await verifyCredential(user.id, currentPassword))) {
      throw new Error('Current password is incorrect.');
    }
    await saveCredential(user.id, newPassword);
  }, [user]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password) => {
    if (!user || !(await verifyCredential(user.id, password))) {
      throw new Error('Password is incorrect.');
    }
    const users = await readUsers();
    await writeUsers(users.filter((item) => item.id !== user.id));
    await removeCredential(user.id);
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, [user]);

  const value = useMemo(() => ({
    user,
    isReady,
    register,
    login,
    updateProfile,
    changePassword,
    logout,
    deleteAccount,
  }), [user, isReady, register, login, updateProfile, changePassword, logout, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
