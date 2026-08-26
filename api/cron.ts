import { Request, Response } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
// This requires FIREBASE_SERVICE_ACCOUNT environment variable to be set in Vercel.
// The value should be a JSON string containing your service account credentials.
if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
      // Fallback for development if needed, but usually we just skip initialization
      // and handle the error during the request.
    } else {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount)
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

    if (!getApps().length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized.' });
    }

    const db = getFirestore();
    const messaging = getMessaging();

    console.log("Starting daily cron job to check expiring deposits...");

    const today = new Date();
    const formatter = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' });
    
    const getFormattedDate = (offsetDays: number) => {
      const date = new Date(today.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      return formatter.format(date);
    };

    // Check for deposits expiring today, tomorrow, and in 3 days.
    const targetDates = [
      { 
        date: getFormattedDate(0),
        message: (bank: string, amount: string) => `Ваш вклад в ${bank} на ${amount} заканчивается СЕГОДНЯ.`
      },
      { 
        date: getFormattedDate(1),
        message: (bank: string, amount: string) => `Ваш вклад в ${bank} на ${amount} заканчивается ЗАВТРА.`
      },
      { 
        date: getFormattedDate(3),
        message: (bank: string, amount: string) => `Ваш вклад в ${bank} на ${amount} заканчивается через 3 ДНЯ.`
      },
    ];

    let notificationsSent = 0;
    
    // Diagnostic object to return in the API response
    const debug = {
      targetDates: targetDates.map(t => t.date),
      usersChecked: 0,
      usersWithTokens: 0,
      totalDepositsChecked: 0,
      depositsMatched: 0,
      log: [] as string[]
    };

    // 2. Query all users who have FCM tokens
    const usersSnapshot = await db.collection('users').get();
    debug.log.push(`Found ${usersSnapshot.docs.length} total users in 'users' collection.`);
    
    for (const userDoc of usersSnapshot.docs) {
      debug.usersChecked++;
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];
      const userId = userDoc.id;
      
      if (tokens.length === 0) {
        debug.log.push(`User ${userId} skipped: No FCM tokens.`);
        continue;
      }
      
      debug.usersWithTokens++;
      debug.log.push(`User ${userId} has ${tokens.length} FCM tokens.`);

      // 3. For each user, query their deposits that are not closed
      const depositsSnapshot = await db.collection('deposits').where('userId', '==', userId).get();
      debug.log.push(`Queried deposits for ${userId}: found ${depositsSnapshot.docs.length} docs.`);

      for (const depositDoc of depositsSnapshot.docs) {
        debug.totalDepositsChecked++;
        const deposit = depositDoc.data();
        
        if (deposit.isClosed || deposit.isArchived || deposit.isDeleted) {
           debug.log.push(`Deposit ${depositDoc.id} skipped: isClosed=${deposit.isClosed}, isArchived=${deposit.isArchived}, isDeleted=${deposit.isDeleted}`);
           continue;
        }
        
        const endDateMs = deposit.endDate;
        if (!endDateMs) {
          debug.log.push(`Deposit ${depositDoc.id} skipped: No endDateMs (${endDateMs})`);
          continue;
        }

        const endDt = new Date(endDateMs);
        if (isNaN(endDt.getTime())) {
          debug.log.push(`Deposit ${depositDoc.id} skipped: Invalid endDateMs (${endDateMs})`);
          continue;
        }

        const endDateStr = formatter.format(endDt);
        debug.log.push(`Deposit ${depositDoc.id} (Bank: ${deposit.bank}) ends on ${endDateStr}`);

        // Check if the end date matches any of our target dates
        const matchedTarget = targetDates.find(target => target.date === endDateStr);
        
        if (matchedTarget) {
          debug.depositsMatched++;
          debug.log.push(`-> MATCH! Deposit ${depositDoc.id} matched target date ${endDateStr}`);

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
              response.responses.forEach((resp: SendResponse, idx: number) => {
                if (!resp.success) {
                  failedTokens.push(tokens[idx]);
                }
              });
              
              if (failedTokens.length > 0) {
                // Remove failed tokens from user document
                await userDoc.ref.update({
                  fcmTokens: FieldValue.arrayRemove(...failedTokens)
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
