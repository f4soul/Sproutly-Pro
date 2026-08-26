import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This requires FIREBASE_SERVICE_ACCOUNT environment variable to be set in Vercel.
// The value should be a JSON string containing your service account credentials.
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
      // Fallback for development if needed, but usually we just skip initialization
      // and handle the error during the request.
    } else {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    // Basic security: require a secret token to prevent unauthorized access
    // You should set CRON_SECRET in your Vercel Environment Variables
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized.' });
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    console.log("Starting daily cron job to check expiring deposits...");

    // 1. Get the current date in YYYY-MM-DD format (UTC)
    // You might want to adjust for specific timezones depending on your users.
    const today = new Date();
    
    // Check for deposits expiring today, tomorrow, and in 3 days.
    const targetDates = [
      { 
        date: new Date(today.getTime() + 0 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: (bank: string, amount: string) => `Ваш вклад в ${bank} на ${amount} заканчивается СЕГОДНЯ.`
      },
      { 
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: (bank: string, amount: string) => `Ваш вклад в ${bank} на ${amount} заканчивается ЗАВТРА.`
      },
      { 
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: (bank: string, amount: string) => `Ваш вклад в ${bank} на ${amount} заканчивается через 3 ДНЯ.`
      },
    ];

    let notificationsSent = 0;

    // 2. Query all users who have FCM tokens
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];
      const userId = userDoc.id;
      
      if (tokens.length === 0) continue;

      // 3. For each user, query their deposits that are not closed
      const depositsSnapshot = await db.collection('users').doc(userId).collection('deposits')
        .where('isClosed', '==', false)
        .where('isArchived', '==', false)
        .get();

      for (const depositDoc of depositsSnapshot.docs) {
        const deposit = depositDoc.data();
        const endDate = deposit.endDate;

        if (!endDate) continue;

        // Check if the end date matches any of our target dates
        const matchedTarget = targetDates.find(target => target.date === endDate);
        
        if (matchedTarget) {
          // Format amount for the message
          const amountStr = deposit.amount ? `${deposit.amount.toLocaleString('ru-RU')} ₽` : 'неизвестную сумму';
          const bankName = deposit.bank || 'вашем банке';

          const message = {
            notification: {
              title: 'Срок вклада подходит к концу',
              body: matchedTarget.message(bankName, amountStr),
            },
            data: {
              url: '/',
              depositId: depositDoc.id
            },
            tokens: tokens,
          };

          try {
            const response = await messaging.sendEachForMulticast(message);
            console.log(`Successfully sent ${response.successCount} messages for user ${userId}.`);
            notificationsSent += response.successCount;
            
            // Optional: clean up invalid tokens
            if (response.failureCount > 0) {
              const failedTokens: string[] = [];
              response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                  failedTokens.push(tokens[idx]);
                }
              });
              
              if (failedTokens.length > 0) {
                // Remove failed tokens from user document
                await userDoc.ref.update({
                  fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
                console.log(`Removed ${failedTokens.length} invalid tokens for user ${userId}.`);
              }
            }
          } catch (error) {
            console.error('Error sending message:', error);
          }
        }
      }
    }

    console.log(`Cron job finished. Sent ${notificationsSent} notifications.`);
    return res.status(200).json({ success: true, notificationsSent });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
