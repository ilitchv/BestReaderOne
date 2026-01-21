const admin = require('firebase-admin');
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        let serviceAccount;

        // 1. Try Environment Variable (Production/Vercel)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                console.log('[Firebase] Loading credentials from Environment Variable');
            } catch (e) {
                console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var');
            }
        }

        // 2. Fallback to Local File (Dev)
        if (!serviceAccount) {
            try {
                serviceAccount = require('../config/serviceAccountKey.json');
                console.log('[Firebase] Loading credentials from local file');
            } catch (e) {
                console.warn('[Firebase] No local serviceAccountKey.json found.');
            }
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('[Firebase] Admin SDK Initialized successfully');
        } else {
            console.error('[Firebase] CRITICAL: No credentials found. Auth will fail.');
        }

    } catch (error) {
        console.error('[Firebase] Error initializing Admin SDK:', error);
    }
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Synced Dual-Store Strategy:
 * When MongoDB writes, we push to Firestore asynchronously.
 * 
 * @param {string} collectionName - Target Firestore collection
 * @param {string} docId - Document ID (usually matches Mongo _id)
 * @param {object} data - Data object to sync
 */
const syncToFirestore = async (collectionName, docId, data) => {
    try {
        if (!docId) {
            console.warn('[Dual-Write] Skipped: No docId provided');
            return;
        }

        // Deep clone to sanitize and remove MongoDB-specific fields
        const payload = JSON.parse(JSON.stringify(data));

        // Clean up MongoDB fields that aren't needed in Firestore
        if (payload._id) delete payload._id;
        if (payload.__v !== undefined) delete payload.__v;

        // Add metadata for sync tracking
        payload.lastSyncedAt = admin.firestore.FieldValue.serverTimestamp();

        // Use set with merge: true to update or create
        await db.collection(collectionName).doc(docId.toString()).set(payload, { merge: true });

        // Optional: Log success (debug level)
        // console.log(`[Dual-Write] Synced ${collectionName}/${docId}`);
    } catch (error) {
        // IMPORTANT: We explicitly catch errors here so the main thread (MongoDB write) 
        // is NOT interrupted. This is a "best effort" backup.
        console.error(`[Dual-Write Error] Failed to sync ${collectionName}/${docId}:`, error.message);
    }
};

/**
 * Verifies a Firebase ID Token sent from the Frontend.
 * @param {string} idToken 
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
const verifyToken = async (idToken) => {
    try {
        return await auth.verifyIdToken(idToken);
    } catch (error) {
        throw new Error('Invalid Firebase Token');
    }
};

module.exports = {
    admin,
    db,
    auth,
    syncToFirestore,
    verifyToken
};
