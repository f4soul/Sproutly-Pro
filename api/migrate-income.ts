import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({ credential: cert(serviceAccount) });
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const db = getFirestore();
    const usersSnap = await db.collection('users').get();
    
    const result = {
      totalUsers: usersSnap.docs.length,
      migratedCount: 0,
      skippedExistCount: 0,
      skippedNoDataCount: 0,
      migratedIds: [] as string[],
      skippedExistIds: [] as string[],
      skippedNoDataIds: [] as string[],
    };

    const staleFields = ['appSettings', 'assetTabOrder', 'hiddenAssetTabs', 'privacyLock'];

    for (const userDoc of usersSnap.docs) {
      try {
        const userId = userDoc.id;
        const newRef = db.collection('income').doc(userId);
        
        if ((await newRef.get()).exists) {
          result.skippedExistCount++;
          result.skippedExistIds.push(userId);
          continue;
        }

        const oldRef = db.doc(`users/${userId}/data/income`);
        const oldSnap = await oldRef.get();
        
        if (!oldSnap.exists) {
          result.skippedNoDataCount++;
          result.skippedNoDataIds.push(userId);
          continue;
        }

        const data: Record<string, any> = { ...oldSnap.data(), userId };
        staleFields.forEach(f => delete data[f]);
        
        await newRef.set(data);
        result.migratedCount++;
        result.migratedIds.push(userId);
      } catch (err: any) {
        console.error(`Error migrating user ${userDoc.id}:`, err);
      }
    }

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
