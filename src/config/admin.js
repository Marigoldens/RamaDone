/**
 * @fileoverview Admin configuration - defines admin accounts and provides secure admin check.
 * 
 * For production security, admin status is verified via Firebase Custom Claims.
 * This file provides client-side helpers but real security is server-side.
 */
import { functions } from './firebase';
import { auth } from './firebase';
import { httpsCallable } from 'firebase/functions';

/** Admin email addresses - used for initial setup only */
export const ADMIN_EMAILS = [
  'anosy.arbic@gmail.com',
];

/** Admin UIDs - users who should be admin by UID */
export const ADMIN_UIDS = [
  'fEykvZFFpYS4x67hs1Zv89092uH2',
];

/**
 * Check if current user has admin custom claim.
 * This is the SECURE way to check admin status.
 * 
 * @param {object} user - Firebase user object (with getIdTokenResult)
 * @param {boolean} forceRefresh - Force refresh the token
 * @returns {Promise<boolean>}
 */
export async function isAdminAsync(user, forceRefresh = false) {
  if (!user) return false;
  
  // Check UID fallback first (for immediate UI update)
  if (ADMIN_UIDS.includes(user.uid)) return true;
  if (ADMIN_EMAILS.includes(user?.email?.toLowerCase())) return true;
  
  // Check Firebase Custom Claim (secure, server-side set)
  try {
    const tokenResult = await user.getIdTokenResult(forceRefresh);
    return tokenResult?.claims?.admin === true;
  } catch {
    return false;
  }
}

/**
 * Sync version for components that can't use async
 * @param {object} user - Firebase user object
 * @returns {boolean}
 */
export function isAdmin(user) {
  // Check UID fallback first
  if (ADMIN_UIDS.includes(user?.uid)) return true;
  if (ADMIN_EMAILS.includes(user?.email?.toLowerCase())) return true;
  
  // Check cached token result
  if (user?.getIdTokenResult) {
    return user.getIdTokenResult()?.claims?.admin === true;
  }
  return false;
}

/**
 * Check if user has API access.
 * @param {object} user - Firebase user object
 * @returns {boolean}
 */
export function hasApiAccess(user) {
  if (user?.getIdTokenResult) {
    return user.getIdTokenResult()?.claims?.apiAccess === true;
  }
  return false;
}

/**
 * Check if user has Pro subscription.
 * @param {object} user - Firebase user object
 * @returns {boolean}
 */
export function isPro(user) {
  if (user?.getIdTokenResult) {
    return user.getIdTokenResult()?.claims?.pro === true;
  }
  return false;
}

/**
 * Check API access via Cloud Function.
 * @returns {Promise<{hasAccess: boolean}>}
 */
export async function checkApiAccess() {
  const check = httpsCallable(functions, 'checkApiAccess');
  const result = await check();
  return result.data;
}

/**
 * Fetch all users from server (admin only).
 * Uses HTTP endpoint with explicit CORS support.
 * 
 * @returns {Promise<Array>}
 */
export async function fetchAllUsers() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://us-central1-ramadone-f28bb.cloudfunctions.net/getAllUsers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({})
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }
  
  const data = await response.json();
  return data.users;
}

/**
 * Track AI usage via HTTP endpoint.
 * @param {number} tokens - Approximate tokens used
 * @returns {Promise<void>}
 */
export async function trackAiUsageSecure(tokens = 0) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://us-central1-ramadone-f28bb.cloudfunctions.net/trackAiUsage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ tokens })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to track usage');
  }
}

/**
 * Grant API access to user - ADMIN ONLY.
 * @param {string} uid - User ID to grant access
 * @returns {Promise<{success: boolean}>}
 */
export async function grantApiAccess(uid) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://us-central1-ramadone-f28bb.cloudfunctions.net/grantApiAccess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ uid })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to grant access');
  }
  
  return await response.json();
}

/**
 * Revoke API access from user - ADMIN ONLY.
 * @param {string} uid - User ID to revoke access
 * @returns {Promise<{success: boolean}>}
 */
export async function revokeApiAccess(uid) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://us-central1-ramadone-f28bb.cloudfunctions.net/revokeApiAccess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ uid })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to revoke access');
  }
  
  return await response.json();
}

/**
 * Request Pro upgrade.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestProUpgrade() {
  const upgrade = httpsCallable(functions, 'requestProUpgrade');
  const result = await upgrade();
  return result.data;
}
