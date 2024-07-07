import admin from 'firebase-admin';
import serviceAccount from '../config/teamflow-14b29-firebase-adminsdk-gmwd3-a4c64cf73a.json' assert { type: "json" };
import { FIREBASE_STORAGE_BUCKET } from '../config/index.js';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: FIREBASE_STORAGE_BUCKET,
});

export const bucket = admin.storage().bucket();

export default admin;
