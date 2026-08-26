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

function parseDateValue(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch {
      // Fallback
    }
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (val && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  if (val && typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000);
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  return null;
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
    const formatter = new Intl.DateTimeFormat('ru-RU', { 
      timeZone: 'Europe/Moscow', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    
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
      serverNowUTC: today.toISOString(),
      moscowToday: formatter.format(today),
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
        debug.log.push(`User ${userId}: 0 FCM tokens (skipped).`);
        continue;
      }
      
      debug.usersWithTokens++;
      debug.log.push(`User ${userId}: has ${tokens.length} FCM token(s).`);

      // 3. For each user, query their deposits that are not closed
      const depositsSnapshot = await db.collection('deposits').where('userId', '==', userId).get();
      debug.log.push(`User ${userId}: retrieved ${depositsSnapshot.docs.length} deposits from Firestore.`);

      for (const depositDoc of depositsSnapshot.docs) {
        debug.totalDepositsChecked++;
        const deposit = depositDoc.data();
        
        if (deposit.isClosed || deposit.isArchived || deposit.isDeleted) {
           debug.log.push(`Deposit ${depositDoc.id} (${deposit.bank || 'Unknown'}): skipped (isClosed=${deposit.isClosed}, isArchived=${deposit.isArchived}, isDeleted=${deposit.isDeleted})`);
           continue;
        }
        
        const rawEndDate = deposit.endDate;
        const endDt = parseDateValue(rawEndDate);
        
        if (!endDt) {
          debug.log.push(`Deposit ${depositDoc.id} (${deposit.bank || 'Unknown'}): skipped (unparseable endDate: ${JSON.stringify(rawEndDate)})`);
          continue;
        }

        const endDateStr = formatter.format(endDt);
        debug.log.push(`Deposit ${depositDoc.id} (${deposit.bank || 'Unknown'} ${deposit.amount} ₽) ends on ${endDateStr}`);

        // Check if the end date matches any of our target dates
        const matchedTarget = targetDates.find(target => target.date === endDateStr);
        
        if (matchedTarget) {
          debug.depositsMatched++;
          debug.log.push(`==> MATCH! Deposit ${depositDoc.id} matches target date ${endDateStr}! Sending push...`);

          // Format amount for the message
          const amountStr = deposit.amount ? `${deposit.amount.toLocaleString('ru-RU')} ₽` : 'неизвестную сумму';
          const bankName = deposit.bank || 'вашем банке';

          const message = {
            notification: {
              title: 'Закрытие вклада',
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
            debug.log.push(`FCM send result for user ${userId}: success=${response.successCount}, failure=${response.failureCount}`);
            if (response.failureCount > 0) {
              response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                  debug.log.push(`Token [${idx}] failed with error: ${resp.error?.message || resp.error?.code}`);
                }
              });
            }

            notificationsSent += response.successCount;
            
            // Clean up invalid tokens
            if (response.failureCount > 0) {
              const failedTokens: string[] = [];
              response.responses.forEach((resp: SendResponse, idx: number) => {
                if (!resp.success) {
                  failedTokens.push(tokens[idx]);
                }
              });
              
              if (failedTokens.length > 0) {
                await userDoc.ref.update({
                  fcmTokens: FieldValue.arrayRemove(...failedTokens)
                });
                debug.log.push(`Cleaned up ${failedTokens.length} expired FCM token(s) for user ${userId}.`);
              }
            }
          } catch (error: any) {
            debug.log.push(`Error invoking messaging.sendEachForMulticast: ${error.message}`);
            console.error('Error sending message:', error);
          }
        }
      }
    }

    console.log(`Cron job finished. Sent ${notificationsSent} notifications.`);
    return res.status(200).json({ success: true, notificationsSent, debug });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
