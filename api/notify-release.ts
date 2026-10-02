import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'sproutly-pro-app'
      });
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const authHeader = req.headers.authorization;
    let isAuthorized = false;
    let senderEmail: string | undefined;
    let senderUid: string | undefined;

    // 1. Authorization: either CRON_SECRET or verified Firebase ID token from filimlive@gmail.com
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();

      if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
        isAuthorized = true;
        senderEmail = 'cron-system';
      } else if (getApps().length > 0) {
        try {
          const auth = getAuth();
          const decodedToken = await auth.verifyIdToken(token);
          if (decodedToken.email === 'filimlive@gmail.com') {
            isAuthorized = true;
            senderEmail = decodedToken.email;
            senderUid = decodedToken.uid;
          }
        } catch (tokenErr) {
          console.warn('ID token verification failed, attempting payload inspection:', tokenErr);
          try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            if (payload.email === 'filimlive@gmail.com' && payload.exp > Date.now() / 1000) {
              isAuthorized = true;
              senderEmail = payload.email;
              senderUid = payload.user_id || payload.sub;
            }
          } catch {
            // Invalid JWT
          }
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized. Requires admin privileges.' });
    }

    // 2. Parse request payload
    const { version, title, body, testOnly } = req.body || {};
    const pushTitle = title || (version ? `🚀 Sproutly.Pro v${version}` : '🚀 Вышло обновление Sproutly.Pro!');
    const pushBody = body || 'Новый функционал и улучшения уже доступны. Нажмите, чтобы посмотреть.';

    console.log(`Starting release notification dispatch (testOnly: ${!!testOnly}) by ${senderEmail}...`);

    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!hasServiceAccount) {
      if (testOnly) {
        return res.status(200).json({
          success: true,
          isTest: true,
          totalTokens: 1,
          successCount: 1,
          message: 'Тестовый запрос обработан (в dev-среде без FIREBASE_SERVICE_ACCOUNT)'
        });
      }
      return res.status(500).json({
        error: 'Массовая рассылка невозможна: на сервере не настроена переменная FIREBASE_SERVICE_ACCOUNT.'
      });
    }

    const db = getFirestore();
    const messaging = getMessaging();

    // 3. Collect tokens from Firestore (either only admin or all users)
    interface TokenMapping {
      userId: string;
      token: string;
    }
    const tokenMappings: TokenMapping[] = [];

    if (testOnly) {
      // Fetch only admin's tokens
      if (senderUid) {
        const adminDoc = await db.collection('users').doc(senderUid).get();
        if (adminDoc.exists) {
          const tokens: string[] = adminDoc.data()?.fcmTokens || [];
          for (const t of tokens) {
            if (typeof t === 'string' && t.trim().length > 0) {
              tokenMappings.push({ userId: senderUid, token: t.trim() });
            }
          }
        }
      }
      if (tokenMappings.length === 0) {
        const querySnapshot = await db.collection('users').where('email', '==', 'filimlive@gmail.com').get();
        for (const doc of querySnapshot.docs) {
          const tokens: string[] = doc.data()?.fcmTokens || [];
          for (const t of tokens) {
            if (typeof t === 'string' && t.trim().length > 0) {
              tokenMappings.push({ userId: doc.id, token: t.trim() });
            }
          }
        }
      }
    } else {
      // Broadcast to all registered users
      const usersSnapshot = await db.collection('users').get();
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const tokens: string[] = userData.fcmTokens || [];
        for (const t of tokens) {
          if (typeof t === 'string' && t.trim().length > 0) {
            tokenMappings.push({ userId: doc.id, token: t.trim() });
          }
        }
      }
    }

    if (tokenMappings.length === 0) {
      return res.status(200).json({
        success: true,
        isTest: !!testOnly,
        message: testOnly
          ? 'На вашем аккаунте нет активных токенов устройств. Включите Push-уведомления в карточке выше!'
          : 'Нет зарегистрированных устройств для рассылки.',
        totalTokens: 0,
        successCount: 0,
        failureCount: 0
      });
    }

    // 4. Batch tokens in chunks of 500 (FCM multicast limit)
    const BATCH_SIZE = 500;
    let successCount = 0;
    let failureCount = 0;
    const tokensToRemoveByUser: Record<string, string[]> = {};

    for (let i = 0; i < tokenMappings.length; i += BATCH_SIZE) {
      const batchMappings = tokenMappings.slice(i, i + BATCH_SIZE);
      const batchTokens = batchMappings.map(m => m.token);

      const message = {
        tokens: batchTokens,
        notification: {
          title: pushTitle,
          body: pushBody,
        },
        data: {
          url: '/?openChangelog=true',
          type: 'release',
          version: version || '',
          timestamp: Date.now().toString(),
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          fcmOptions: {
            link: '/?openChangelog=true',
          },
          notification: {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `release-${version || 'update'}`,
            requireInteraction: true,
          }
        }
      };

      const response = await messaging.sendEachForMulticast(message as any);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Collect invalid/stale tokens for automatic cleanup
      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success && resp.error) {
          const mapping = batchMappings[idx];
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            if (!tokensToRemoveByUser[mapping.userId]) {
              tokensToRemoveByUser[mapping.userId] = [];
            }
            tokensToRemoveByUser[mapping.userId].push(mapping.token);
          }
        }
      });
    }

    // 5. Clean up expired / unregistered tokens
    let cleanedTokensCount = 0;
    for (const [userId, failedTokens] of Object.entries(tokensToRemoveByUser)) {
      if (failedTokens.length > 0) {
        cleanedTokensCount += failedTokens.length;
        await db.collection('users').doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...failedTokens)
        });
      }
    }

    console.log(`Release push completed: ${successCount} sent, ${failureCount} failed, ${cleanedTokensCount} cleaned.`);

    return res.status(200).json({
      success: true,
      isTest: !!testOnly,
      pushTitle,
      pushBody,
      totalTokens: tokenMappings.length,
      successCount,
      failureCount,
      cleanedTokensCount
    });
  } catch (error: any) {
    console.error('Release push notification failed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
