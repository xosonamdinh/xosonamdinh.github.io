/**
 * auth.js - Firebase Authentication Module
 * XSKT Lô Tô Management System
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { db, auth } from './firebase-config.js';

// ---------------------------------------------------------------------------
// Role constants
// ---------------------------------------------------------------------------

export const ROLES = {
  ADMIN: 'admin',
  MAY: 'may',
  DAILY: 'daily',
};

/**
 * Hierarchy order: higher index = higher privilege.
 * @type {string[]}
 */
const ROLE_HIERARCHY = [ROLES.DAILY, ROLES.MAY, ROLES.ADMIN];

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

/**
 * Returns true when `role` has at least the privilege level of `requiredRole`.
 *
 * Hierarchy: admin > may > daily
 *
 * @param {string} role         - The role the current user holds.
 * @param {string} requiredRole - The minimum role required.
 * @returns {boolean}
 */
export function hasPermission(role, requiredRole) {
  const userLevel = ROLE_HIERARCHY.indexOf(role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);

  if (userLevel === -1 || requiredLevel === -1) {
    // Unknown role(s) → deny by default
    return false;
  }

  return userLevel >= requiredLevel;
}

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

/**
 * Normalise any login input (plain username or email) to Firebase compatible email format.
 * E.g. "k" -> "k@xskt.vn", "admin" -> "admin@xskt.vn", "user@gmail.com" -> "user@gmail.com".
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeLogin(input) {
  if (!input) return '';
  const trimmed = String(input).trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}@xskt.vn`;
}

/**
 * Sign in with plain username or email and password.
 *
 * @param {string} usernameOrEmail
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function signIn(usernameOrEmail, password) {
  try {
    const email = normalizeLogin(usernameOrEmail);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential;
  } catch (error) {
    console.error('[auth] signIn error:', error.code, error.message);
    throw error;
  }
}

/**
 * Register a new user and create their Firestore profile.
 *
 * @param {string} usernameOrEmail
 * @param {string} password
 * @param {{ displayName?: string, role?: string, maMay?: string, username?: string }} [profileData]
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function registerUser(usernameOrEmail, password, profileData = {}) {
  try {
    const email = normalizeLogin(usernameOrEmail);
    const rawUsername = String(usernameOrEmail).trim().toLowerCase().replace('@xskt.vn', '');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
      email,
      username: profileData.username || rawUsername,
      displayName: profileData.displayName || rawUsername,
      role: profileData.role || ROLES.ADMIN,
      maMay: profileData.maMay || 'A00',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return credential;
  } catch (error) {
    console.error('[auth] registerUser error:', error.code, error.message);
    throw error;
  }
}

/**
 * Sign the current user out.
 *
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('[auth] signOut error:', error.code, error.message);
    throw error;
  }
}

/**
 * Returns the currently signed-in Firebase user, or null.
 *
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

// ---------------------------------------------------------------------------
// Firestore user profile
// ---------------------------------------------------------------------------

/**
 * Fetch the Firestore user profile document at `users/{uid}`.
 *
 * @param {string} uid
 * @returns {Promise<{uid: string, role: string, [key: string]: any}|null>}
 */
export async function getUserProfile(uid) {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn('[auth] getUserProfile: no profile found for uid', uid);
      return null;
    }

    return { uid: snap.id, ...snap.data() };
  } catch (error) {
    console.error('[auth] getUserProfile error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Auth state listener
// ---------------------------------------------------------------------------

/**
 * Subscribe to auth state changes.
 *
 * The callback receives the Firebase User object (or null on sign-out).
 * Returns the unsubscribe function.
 *
 * @param {(user: import('firebase/auth').User|null) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
