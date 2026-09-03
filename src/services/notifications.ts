import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, auth, db, firebaseConfig } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await syncFcmToken();
    }
  } catch (error) {
    console.error("Failed to request notification permission:", error);
  }
  return false;
}

export async function syncFcmToken(): Promise<boolean> {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return false;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("VITE_FIREBASE_VAPID_KEY is missing. Add it to .env.example and your .env file.");
      return false;
    }

    // Pass the config to the Service Worker via URL parameters
    const configStr = encodeURIComponent(JSON.stringify(firebaseConfig));
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${configStr}`);

    const token = await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: registration
    });
    if (token) {
      await saveTokenToDatabase(token);
      return true;
    }
  } catch (error) {
    console.error("Failed to sync FCM token:", error);
  }
  return false;
}

async function saveTokenToDatabase(token: string) {
  const user = auth.currentUser;
  if (!user) {
    console.log("No authenticated user, skipping Firestore token save.");
    return;
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      const tokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
      if (!tokens.includes(token)) {
        await updateDoc(userRef, {
          fcmTokens: [...tokens, token]
        });
      }
    } else {
      await setDoc(userRef, {
        fcmTokens: [token]
      }, { merge: true });
    }
    console.log("FCM Token saved successfully for user:", user.uid);
  } catch (error) {
    console.error("Error saving FCM token:", error);
  }
}

export async function setupMessageListener(onMessageReceived: (payload: any) => void) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    onMessageReceived(payload);
  });
}
