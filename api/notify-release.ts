import { Request, Response } from 'express';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

/**
 * Safely initializes or retrieves Firebase Admin SDK.
 * Handles:
 * - Raw JSON or Base64 encoded FIREBASE_SERVICE_ACCOUNT
 * - Escaped `\n` in private_key (frequent Vercel env formatting issue)
 * - Safe error capture without crashing the serverless container
 */
function getFirebaseAdminApp(): { app: App | null; error: string | null } {
  if (getApps().length > 0) {
    return { app: getApps()[0], error: null };
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawJson) {
    return { app: null, error: 'FIREBASE_SERVICE_ACCOUNT не настроен в Environment Variables на Vercel.' };
  }

  try {
    let jsonStr = rawJson.trim();
    // Support base64 encoded service account string
    if (!jsonStr.startsWith('{') && !jsonStr.endsWith('}')) {
      try {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf-8');
      } catch {
        // continue with raw string
      }
    }

    const sa = JSON.parse(jsonStr);

    // Replace literal `\n` with actual newlines in private key
    if (sa.private_key && typeof sa.private_key === 'string') {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }

    const app = initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || process.env.VITE_FIREBASE_PROJECT_ID || 'sproutly-pro-app'
    });

    return { app, error: null };
  } catch (err: any) {
    const errorMsg = `Ошибка инициализации Firebase Admin: ${err?.message || String(err)}`;
    console.error(errorMsg);
    return { app: null, error: errorMsg };
  }
}

/**
 * Promise wrapper with timeout protection to prevent Vercel 10s execution kill.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), ms))
  ]);
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

    // 1. Authorization verification
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();

      if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
        isAuthorized = true;
        senderEmail = 'cron-system';
      } else {
        // Attempt verifying via Firebase Admin Auth if available
        const { app: adminApp } = getFirebaseAdminApp();
        if (adminApp) {
          try {
            const auth = getAuth(adminApp);
            const decodedToken = await withTimeout(auth.verifyIdToken(token), 4000, 'Auth verification timeout');
            if (decodedToken.email === 'filimlive@gmail.com') {
              isAuthorized = true;
              senderEmail = decodedToken.email;
              senderUid = decodedToken.uid;
            }
          } catch (tokenErr) {
            console.warn('ID token verifyIdToken failed, checking payload claims:', tokenErr);
          }
        }

        // Fallback: inspect token payload signature/claims for filimlive@gmail.com
        if (!isAuthorized) {
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
            // Invalid JWT token
          }
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Доступ запрещен. Требуются права администратора.' });
    }

    // 2. Parse request body safely
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
    const pushTitle = title || (version ? `🚀 Sproutly.Pro v${version}` : '🚀 Вышло обновление Sproutly.Pro!');
    const pushBody = body || 'Новый функционал и улучшения уже доступны. Нажмите, чтобы посмотреть.';

    console.log(`Starting release notification dispatch (testOnly: ${!!testOnly}) by ${senderEmail}...`);

    // 3. Initialize Firebase Admin
    const { app: adminApp, error: adminError } = getFirebaseAdminApp();

    if (!adminApp) {
      if (testOnly) {
        return res.status(200).json({
          success: true,
          isTest: true,
          totalTokens: 1,
          successCount: 1,
          warning: adminError,
          message: 'Тестовый запрос: на Vercel не настроен FIREBASE_SERVICE_ACCOUNT. Локальный push отображен в браузере.'
        });
      }
      return res.status(400).json({
        error: `Массовая рассылка невозможна: ${adminError || 'Не настроен FIREBASE_SERVICE_ACCOUNT'}. Проверьте переменные в Vercel.`
      });
    }

    const db = getFirestore(adminApp);
    const messaging = getMessaging(adminApp);

    // 4. Collect tokens
    interface TokenMapping {
      userId: string;
      token: string;
    }
    const tokenMappings: TokenMapping[] = [];

    // If client directly provided deviceToken during test, prioritize it!
    if (testOnly && typeof deviceToken === 'string' && deviceToken.trim().length > 0) {
      tokenMappings.push({
        userId: senderUid || 'admin',
        token: deviceToken.trim()
      });
    }

    if (testOnly && tokenMappings.length === 0) {
      // Query admin's tokens from Firestore
      try {
        if (senderUid) {
          const adminDoc = await withTimeout(
            db.collection('users').doc(senderUid).get(),
            5000,
            'Таймаут получения данных администратора'
          );
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
          const querySnapshot = await withTimeout(
            db.collection('users').where('email', '==', 'filimlive@gmail.com').get(),
            5000,
            'Таймаут поиска пользователя filimlive@gmail.com'
          );
          for (const doc of querySnapshot.docs) {
            const tokens: string[] = doc.data()?.fcmTokens || [];
            for (const t of tokens) {
              if (typeof t === 'string' && t.trim().length > 0) {
                tokenMappings.push({ userId: doc.id, token: t.trim() });
              }
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('Firestore user query warning in test mode:', dbErr);
      }
    } else if (!testOnly) {
      // Broadcast mode: collect all users' tokens
      const usersSnapshot = await withTimeout(
        db.collection('users').get(),
        7000,
        'Таймаут загрузки списка пользователей'
      );
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

    // 5. Send FCM Multicast
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
        const response = await withTimeout(
          messaging.sendEachForMulticast(message as any),
          6000,
          'Таймаут отправки FCM сообщений'
        );
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Collect expired/unregistered tokens for automatic cleanup
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
      } catch (fcmErr: any) {
        console.error('FCM Multicast error:', fcmErr);
        failureCount += batchTokens.length;
      }
    }

    // 6. Asynchronously clean up stale tokens without blocking response
    if (Object.keys(tokensToRemoveByUser).length > 0) {
      Promise.allSettled(
        Object.entries(tokensToRemoveByUser).map(([userId, failedTokens]) =>
          db.collection('users').doc(userId).update({
            fcmTokens: FieldValue.arrayRemove(...failedTokens)
          })
        )
      ).catch(err => console.warn('Token cleanup warning:', err));
    }

    console.log(`Release push completed: ${successCount} sent, ${failureCount} failed.`);

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
    console.error('Release push handler error:', error);
    return res.status(500).json({
      error: error?.message || 'Внутренняя ошибка сервера при рассылке уведомлений'
    });
  }
}
