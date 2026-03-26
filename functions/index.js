/**
 * Firebase Cloud Functions for RamaDone
 * 
 * Handles:
 * - Admin role management (Custom Claims)
 * - User tracking in Firestore
 * - Subscription management
 * - API access control
 * 
 * DEPLOY: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

// Admin emails - only these can access admin dashboard
const ADMIN_EMAILS = [
  'anosy.arbic@gmail.com',
];

// Admin UIDs - users who should be admin by UID
const ADMIN_UIDS = [
  'fEykvZFFpYS4x67hs1Zv89092uH2',
];

/**
 * On user creation - set up user document in Firestore
 * and assign admin claim if applicable
 * 
 * NEW USERS START WITH apiAccess: false - admin must grant access
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const isAdminUser = ADMIN_EMAILS.includes(user.email?.toLowerCase()) || ADMIN_UIDS.includes(user.uid);
  
  // Create user document in Firestore
  await db.collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAdmin: isAdminUser,
    subscription: 'free', // 'free' | 'pro'
    apiAccess: isAdminUser, // Only admin gets API access by default
    totalMessages: 0,
    totalTokens: 0,
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastAiRequest: null,
  });

  // Set admin custom claim if applicable
  if (isAdminUser) {
    await admin.auth().setCustomUserClaims(user.uid, { admin: true, apiAccess: true });
    console.log(`[Admin] Set admin claim for ${user.email || user.uid}`);
  }

  console.log(`[User Created] ${user.email || user.uid} (admin: ${isAdminUser}, apiAccess: ${isAdminUser})`);
});

/**
 * Update user profile on sign-in (callable from client)
 * Also syncs admin claims for existing users
 * Call with: functions.httpsCallable('updateUserProfile')()
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const uid = context.auth.uid;
  const user = await admin.auth().getUser(uid);

  // Check if this user should be admin (by email or UID)
  const shouldBeAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase()) || ADMIN_UIDS.includes(uid);
  
  // Get current claims
  const currentClaims = user.customClaims || {};
  const currentAdmin = currentClaims.admin === true;

  // If admin status changed, update claims
  if (shouldBeAdmin && !currentAdmin) {
    await admin.auth().setCustomUserClaims(uid, { ...currentClaims, admin: true, apiAccess: true });
    console.log(`[Admin] Synced admin claim for ${user.email || uid}`);
  }

  // Update Firestore
  const updateData = {
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
  
  if (shouldBeAdmin) {
    updateData.isAdmin = true;
    updateData.apiAccess = true;
  }

  await db.collection('users').doc(uid).update(updateData);

  return { success: true, adminUpgraded: shouldBeAdmin && !currentAdmin };
});

/**
 * Track AI usage - call from client after each AI request
 * REQUIRES: apiAccess must be true (granted by admin)
 * 
 * POST to: https://us-central1-ramadone-f28bb.cloudfunctions.net/trackAiUsage
 */
exports.trackAiUsage = functions.https.onRequest((req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  const { tokens = 0 } = req.body || {};

  admin.auth().verifyIdToken(idToken)
    .then((decodedToken) => {
      const uid = decodedToken.uid;
      const apiAccess = decodedToken.apiAccess;

      if (!apiAccess) {
        res.status(403).json({ error: 'API access not granted. Contact admin.' });
        return;
      }

      return db.collection('users').doc(uid).update({
        totalMessages: admin.firestore.FieldValue.increment(1),
        totalTokens: admin.firestore.FieldValue.increment(tokens),
        lastAiRequest: admin.firestore.FieldValue.serverTimestamp(),
      });
    })
    .then((result) => {
      if (result) {
        res.json({ success: true });
      }
    })
    .catch((error) => {
      console.error('trackAiUsage error:', error);
      res.status(500).json({ error: error.message });
    });
});

/**
 * Check if user has API access
 * Call with: functions.httpsCallable('checkApiAccess')()
 */
exports.checkApiAccess = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { apiAccess } = context.auth.token;
  return { 
    hasAccess: !!apiAccess,
  };
});

/**
 * Grant API access to user - ADMIN ONLY
 * POST to: https://us-central1-ramadone-f28bb.cloudfunctions.net/grantApiAccess
 */
exports.grantApiAccess = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  const { uid } = req.body || {};

  if (!uid) {
    res.status(400).json({ error: 'uid is required' });
    return;
  }

  admin.auth().verifyIdToken(idToken)
    .then((decodedToken) => {
      const adminUid = decodedToken.uid;
      const adminEmail = decodedToken.email || '';
      const adminClaim = decodedToken.admin;
      
      const ADMIN_UIDS = ['fEykvZFFpYS4x67hs1Zv89092uH2'];
      const adminEmails = ['anosy.arbic@gmail.com'];
      const isAdmin = adminClaim || ADMIN_UIDS.includes(adminUid) || adminEmails.includes(adminEmail.toLowerCase());
      
      if (!isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      return db.collection('users').doc(uid).update({ apiAccess: true })
        .then(() => admin.auth().getUser(uid))
        .then((userRecord) => {
          const existingClaims = userRecord.customClaims || {};
          return admin.auth().setCustomUserClaims(uid, { ...existingClaims, apiAccess: true });
        });
    })
    .then(() => res.json({ success: true }))
    .catch((error) => {
      console.error('grantApiAccess error:', error);
      res.status(500).json({ error: error.message });
    });
});

/**
 * Revoke API access from user - ADMIN ONLY
 * POST to: https://us-central1-ramadone-f28bb.cloudfunctions.net/revokeApiAccess
 */
exports.revokeApiAccess = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  const { uid } = req.body || {};

  if (!uid) {
    res.status(400).json({ error: 'uid is required' });
    return;
  }

  admin.auth().verifyIdToken(idToken)
    .then((decodedToken) => {
      const adminUid = decodedToken.uid;
      const adminEmail = decodedToken.email || '';
      const adminClaim = decodedToken.admin;
      
      const ADMIN_UIDS = ['fEykvZFFpYS4x67hs1Zv89092uH2'];
      const adminEmails = ['anosy.arbic@gmail.com'];
      const isAdmin = adminClaim || ADMIN_UIDS.includes(adminUid) || adminEmails.includes(adminEmail.toLowerCase());
      
      if (!isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      return db.collection('users').doc(uid).update({ apiAccess: false })
        .then(() => admin.auth().getUser(uid))
        .then((userRecord) => {
          const existingClaims = userRecord.customClaims || {};
          return admin.auth().setCustomUserClaims(uid, { ...existingClaims, apiAccess: false });
        });
    })
    .then(() => res.json({ success: true }))
    .catch((error) => {
      console.error('revokeApiAccess error:', error);
      res.status(500).json({ error: error.message });
    });
});

/**
 * Get all users - ADMIN ONLY
 * HTTP version with explicit CORS support
 * 
 * URL: https://us-central1-ramadone-f28bb.cloudfunctions.net/getAllUsers
 */
exports.getAllUsers = functions.https.onRequest((req, res) => {
  // CORS headers - must be set before any other response
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only accept POST (Firebase callable protocol)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get auth token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  // Verify token and return users
  admin.auth().verifyIdToken(idToken)
    .then((decodedToken) => {
      const uid = decodedToken.uid;
      const email = decodedToken.email || '';
      
      // Admin check
      const ADMIN_UIDS = ['fEykvZFFpYS4x67hs1Zv89092uH2'];
      const adminEmails = ['anosy.arbic@gmail.com'];
      const isAdmin = ADMIN_UIDS.includes(uid) || adminEmails.includes(email.toLowerCase());
      
      if (!isAdmin) {
        res.status(403).json({ error: 'Not admin' });
        return;
      }

      // Return users from Firestore
      return db.collection('users').get();
    })
    .then((snapshot) => {
      if (!snapshot) return; // Already sent response
      
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      
      res.json({ users });
    })
    .catch((error) => {
      console.error('getAllUsers error:', error);
      res.status(500).json({ error: error.message });
    });
});

/**
 * Upgrade user to Pro - ADMIN ONLY (for manual upgrades)
 * In production, this would be triggered by Stripe webhook
 * 
 * Call with: functions.httpsCallable('upgradeToPro')({ uid: 'target-user-uid' })
 */
exports.upgradeToPro = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { admin } = context.auth.token;
  if (!admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required');
  }

  await db.collection('users').doc(uid).update({
    subscription: 'pro',
    upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Set pro claim
  await admin.auth().setCustomUserClaims(uid, { pro: true });

  return { success: true };
});

/**
 * Check subscription status - returns user's subscription tier
 * 
 * Call with: functions.httpsCallable('getSubscription')()
 */
exports.getSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  
  if (!userDoc.exists) {
    return { subscription: 'free' };
  }

  return { 
    subscription: userDoc.data().subscription || 'free',
  };
});

/**
 * Request Pro upgrade - user initiates upgrade request
 * In production, this would redirect to Stripe checkout
 * 
 * Call with: functions.httpsCallable('requestProUpgrade')()
 */
exports.requestProUpgrade = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const uid = context.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const email = userDoc.data()?.email;

  // Log upgrade request (in production, create Stripe checkout session)
  await db.collection('upgradeRequests').add({
    uid,
    email,
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'pending',
  });

  // For now, auto-upgrade for development
  // REMOVE THIS IN PRODUCTION - use Stripe instead
  await db.collection('users').doc(uid).update({
    subscription: 'pro',
    upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await admin.auth().setCustomUserClaims(uid, { pro: true });

  return { 
    success: true, 
    message: 'Upgraded to Pro! (Development mode - auto-approved)',
  };
});
