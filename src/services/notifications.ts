import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, auth } from '../config/firebase';
import { db } from '../config/db';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return false;

      // Ensure the VAPID key is provided in the environment.
      // Usually starts with B...
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn("VITE_FIREBASE_VAPID_KEY is missing. Add it to .env.example and your .env file.");
        return false;
      }

      const token = await getToken(messaging, { vapidKey });
      
      if (token) {
        // Save the token to the user's document in Firestore if logged in
        await saveTokenToDatabase(token);
        return true;
      }
    }
  } catch (error) {
    console.error("Failed to request notification permission:", error);
  }
  return false;
}

async function saveTokenToDatabase(token: string) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const tokens = userSnap.data().fcmTokens || [];
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
    console.log("FCM Token saved successfully.");
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
