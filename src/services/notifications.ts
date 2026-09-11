import { logger } from '../lib/logger';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, auth, db, firebaseConfig } from '../config/firebase';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export interface SyncFcmResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface TokenStatusResult {
  permission: NotificationPermission;
  isRegisteredInDb: boolean;
  tokensCount: number;
  currentToken: string | null;
  userEmail: string | null;
  error?: string;
}

export async function requestNotificationPermission(): Promise<SyncFcmResult> {
  try {
    if (!('Notification' in window)) {
      return { success: false, error: 'Браузер не поддерживает Web Notifications' };
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await syncFcmToken();
    }
    return { success: false, error: permission === 'denied' ? 'Уведомления заблокированы в браузере' : 'Разрешение не получено' };
  } catch (error: any) {
    logger.error("Failed to request notification permission:", error);
    return { success: false, error: error?.message || 'Ошибка запроса разрешения' };
  }
}

export async function getDeviceFcmToken(): Promise<string | null> {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      logger.warn("Firebase Messaging is not supported in this browser.");
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      logger.warn("VITE_FIREBASE_VAPID_KEY is missing in env.");
      return null;
    }

    const configStr = encodeURIComponent(JSON.stringify(firebaseConfig));
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?config=${configStr}`,
      { scope: '/firebase-push-scope/' }
    );

    // Ensure Service Worker is active
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing?.addEventListener('statechange', (e: any) => {
          if (e.target.state === 'activated') resolve();
        });
        setTimeout(resolve, 2000);
      });
    }

    return await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: registration
    });
  } catch (error) {
    logger.error("Error retrieving device FCM token:", error);
    throw error;
  }
}

export async function syncFcmToken(): Promise<SyncFcmResult> {
  try {
    if (!('Notification' in window)) {
      return { success: false, error: 'Браузер не поддерживает Push-уведомления' };
    }
    if (Notification.permission !== 'granted') {
      return { success: false, error: 'Уведомления не разрешены в браузере' };
    }

    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'Для сохранения токена необходимо войти в аккаунт' };
    }

    let token: string | null = null;
    try {
      token = await getDeviceFcmToken();
    } catch (err: any) {
      return { success: false, error: 'Ошибка получения токена: ' + (err?.message || 'сбой Service Worker') };
    }

    if (!token) {
      return { success: false, error: 'Не удалось сгенерировать токен устройства' };
    }

    await saveTokenToDatabase(token);
    return { success: true, token };
  } catch (error: any) {
    logger.error("Failed to sync FCM token:", error);
    return { success: false, error: error?.message || 'Ошибка синхронизации с базой' };
  }
}

export async function saveTokenToDatabase(token: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Пользователь не авторизован. Войдите в аккаунт.");
  }

  const uid = user.uid;
  const userRef = doc(db, 'users', uid);
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
  
  try {
    logger.log(`DIAGNOSTIC_BEFORE_WRITE: auth.uid=${uid}, userRef.path=${userRef.path}, projectId=${projectId}, databaseId=${databaseId}, operation=setDoc(merge:true)`);
    
    const { arrayUnion, setDoc } = await import('firebase/firestore');
    
    // Atomically save token without read-before-write
    await setDoc(userRef, {
      fcmTokens: arrayUnion(token),
      email: user.email || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    logger.log(`DIAGNOSTIC_AFTER_WRITE_SUCCESS: auth.uid=${uid}, userRef.path=${userRef.path}`);
  } catch (error: any) {
    logger.error(`DIAGNOSTIC_ERROR: Permission denied or error. Operation: setDoc(merge:true), auth.uid=${uid}, Project: ${projectId}, DB: ${databaseId}, Path: ${userRef.path}. error.code=${error.code}, error.message=${error.message}`, error);
    // Throw a clear error so it can be shown in the UI
    throw new Error(error.message || "Ошибка доступа к базе данных");
  }
}

export async function removeCurrentDeviceToken(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const token = await getDeviceFcmToken();
    if (!token) return false;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data()) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(token),
        updatedAt: new Date().toISOString()
      });
    }

    logger.log("FCM Token removed successfully from Firestore for user:", user.uid);
    return true;
  } catch (error) {
    logger.error("Failed to remove FCM token:", error);
    return false;
  }
}

export async function checkDeviceTokenStatus(): Promise<TokenStatusResult> {
  const permission = ('Notification' in window) ? Notification.permission : 'default';
  const user = auth.currentUser;

  if (permission !== 'granted' || !user) {
    return {
      permission,
      isRegisteredInDb: false,
      tokensCount: 0,
      currentToken: null,
      userEmail: user?.email || null
    };
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let tokens: string[] = [];
    if (userSnap.exists()) {
      const data = userSnap.data();
      tokens = Array.isArray(data?.fcmTokens) ? data.fcmTokens : [];
    }

    let currentToken: string | null = null;
    let isRegistered = false;
    try {
      currentToken = await getDeviceFcmToken();
      if (currentToken && tokens.includes(currentToken)) {
        isRegistered = true;
      }
    } catch {
      // Ignore get token errors, remain unregistered
    }

    return {
      permission,
      isRegisteredInDb: isRegistered,
      tokensCount: tokens.length,
      currentToken,
      userEmail: user.email || null
    };
  } catch (error: any) {
    logger.error("Error checking FCM token status in Firestore:", error);
    return {
      permission,
      isRegisteredInDb: false,
      tokensCount: 0,
      currentToken: null,
      userEmail: user.email || null,
      error: error?.message || 'Ошибка чтения из базы'
    };
  }
}

export async function setupMessageListener(onMessageReceived: (payload: any) => void) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    onMessageReceived(payload);
  });
}
