import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // 1. Authorization: parse Bearer token
    const authHeader = req.headers.authorization;
    let isAuthorized = false;
    let senderEmail: string | undefined;
    let senderUid: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();

      if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
        isAuthorized = true;
        senderEmail = 'cron-system';
      } else {
        // Inspect token claims for filimlive@gmail.com
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            const nowSec = Math.floor(Date.now() / 1000);
            if (payload.email === 'filimlive@gmail.com' && payload.exp > nowSec) {
              isAuthorized = true;
              senderEmail = payload.email;
              senderUid = payload.user_id || payload.sub;
            }
          }
        } catch {
          // Invalid token format
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Доступ запрещен. Требуются права администратора.' });
    }

    // 2. Parse request payload
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch {
        bodyData = {};
      }
    } else if (Buffer.isBuffer(bodyData)) {
      try {
        bodyData = JSON.parse(bodyData.toString('utf-8'));
      } catch {
        bodyData = {};
      }
    }

    const { version, title, body, testOnly, deviceToken } = bodyData || {};
    const pushTitle = title || (version ? `✨ v${version} уже здесь!` : '✨ Новая версия уже здесь!');
    const pushBody = body || 'Добавили детальную аналитику, расчет налогов и ускорили работу. Загляните оценить!';

    // 3. Dynamic initialization of Firebase Admin
    let adminApp: any = null;
    let initError: string | null = null;

    try {
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');

      if (getApps().length > 0) {
        adminApp = getApps()[0];
      } else {
        let sa: any = null;
        const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (rawJson) {
          let jsonStr = rawJson.trim();
          if (!jsonStr.startsWith('{') && !jsonStr.endsWith('}')) {
            try {
              jsonStr = Buffer.from(jsonStr, 'base64').toString('utf-8');
            } catch {
              // ignore
            }
          }
          sa = JSON.parse(jsonStr);
        } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          sa = {
            project_id: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY
          };
        }

        if (sa) {
          if (sa.private_key && typeof sa.private_key === 'string') {
            sa.private_key = sa.private_key.replace(/\\n/g, '\n');
          }
          adminApp = initializeApp({
            credential: cert(sa),
            projectId: sa.project_id || process.env.VITE_FIREBASE_PROJECT_ID || 'sproutly-pro-app'
          });
        } else {
          initError = 'Переменная FIREBASE_SERVICE_ACCOUNT не настроена в Environment Variables на Vercel.';
        }
      }
    } catch (err: any) {
      initError = `Сбой инициализации Firebase Admin: ${err?.message || String(err)}`;
      console.error(initError);
    }

    // 4. Handle missing/invalid Firebase Admin
    if (!adminApp) {
      if (testOnly) {
        return res.status(200).json({
          success: true,
          isTest: true,
          totalTokens: 1,
          successCount: 1,
          warning: initError,
          message: 'Тестовый Push отправлен (локальное системное уведомление браузера).'
        });
      }
      return res.status(400).json({
        error: `Массовая рассылка невозможна: ${initError}. Добавьте FIREBASE_SERVICE_ACCOUNT в настройках проекта на Vercel.`
      });
    }

    // 5. Load Firestore & Messaging dynamically
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getMessaging } = await import('firebase-admin/messaging');

    const db = getFirestore(adminApp);
    const messaging = getMessaging(adminApp);

    // 6. Collect tokens
    interface TokenMapping {
      userId: string;
      token: string;
    }
    const tokenMappings: TokenMapping[] = [];
    const uniqueTokensSet = new Set<string>();

    if (testOnly) {
      // In test mode: collect ALL devices registered under the admin account
      try {
        if (senderUid) {
          const adminDoc = await db.collection('users').doc(senderUid).get();
          if (adminDoc.exists) {
            const tokens: string[] = adminDoc.data()?.fcmTokens || [];
            for (const t of tokens) {
              if (typeof t === 'string' && t.trim().length > 0) {
                const cleanToken = t.trim();
                if (!uniqueTokensSet.has(cleanToken)) {
                  uniqueTokensSet.add(cleanToken);
                  tokenMappings.push({ userId: senderUid, token: cleanToken });
                }
              }
            }
          }
        }

        // Also check if any documents with email 'filimlive@gmail.com' exist
        const querySnapshot = await db.collection('users').where('email', '==', 'filimlive@gmail.com').get();
        for (const doc of querySnapshot.docs) {
          const tokens: string[] = doc.data()?.fcmTokens || [];
          for (const t of tokens) {
            if (typeof t === 'string' && t.trim().length > 0) {
              const cleanToken = t.trim();
              if (!uniqueTokensSet.has(cleanToken)) {
                uniqueTokensSet.add(cleanToken);
                tokenMappings.push({ userId: doc.id, token: cleanToken });
              }
            }
          }
        }

        // Also include current deviceToken if provided and not yet in database
        if (typeof deviceToken === 'string' && deviceToken.trim().length > 0) {
          const cleanToken = deviceToken.trim();
          if (!uniqueTokensSet.has(cleanToken)) {
            uniqueTokensSet.add(cleanToken);
            tokenMappings.push({ userId: senderUid || 'admin', token: cleanToken });
          }
        }
      } catch (dbErr: any) {
        console.warn('Firestore lookup warning in test mode:', dbErr);
      }
    } else {
      // Broadcast mode: collect all users' tokens
      const usersSnapshot = await db.collection('users').get();
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const tokens: string[] = userData.fcmTokens || [];
        for (const t of tokens) {
          if (typeof t === 'string' && t.trim().length > 0) {
            const cleanToken = t.trim();
            if (!uniqueTokensSet.has(cleanToken)) {
              uniqueTokensSet.add(cleanToken);
              tokenMappings.push({ userId: doc.id, token: cleanToken });
            }
          }
        }
      }
    }

    if (tokenMappings.length === 0) {
      return res.status(200).json({
        success: true,
        isTest: !!testOnly,
        message: testOnly
          ? 'На вашем аккаунте нет активных токенов устройств. Включите Push в карточке выше!'
          : 'Нет зарегистрированных устройств для рассылки.',
        totalTokens: 0,
        successCount: 0,
        failureCount: 0
      });
    }

    // 7. Dispatch FCM multicast
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
          notification: {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `release-${version || 'update'}`,
            requireInteraction: true,
          }
        }
      };

      try {
        const response = await messaging.sendEachForMulticast(message as any);
        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp: any, idx: number) => {
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
      } catch (fcmErr: any) {
        console.error('FCM send error:', fcmErr);
        failureCount += batchTokens.length;
      }
    }

    // 8. Clean up invalid tokens
    if (Object.keys(tokensToRemoveByUser).length > 0) {
      Promise.allSettled(
        Object.entries(tokensToRemoveByUser).map(([userId, failedTokens]) =>
          db.collection('users').doc(userId).update({
            fcmTokens: FieldValue.arrayRemove(...failedTokens)
          })
        )
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      isTest: !!testOnly,
      pushTitle,
      pushBody,
      totalTokens: tokenMappings.length,
      successCount,
      failureCount
    });
  } catch (error: any) {
    console.error('Release push unhandled error:', error);
    return res.status(500).json({
      error: error?.message || 'Внутренняя ошибка сервера при отправке push'
    });
  }
}
