const databaseName = process.env.DB_NAME || 'mergeflow';

export const DB_URL = process.env.DB_URL || `mongodb://127.0.0.1:27017/${databaseName}`;

export const PORT = process.env.PORT || 5000;

export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3031';

export const SENDER_EMAIL = process.env.SENDER_EMAIL;

export const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

export const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;