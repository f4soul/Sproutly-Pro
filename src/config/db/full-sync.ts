import { logger } from '../../lib/logger';
import { db, initDB } from './schema';
import { auth, db as firestore } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where, getDoc, deleteField, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import { Deposit, CashAsset, InvestmentAsset, CryptoAsset, TaxYearSettings, Bank, AppSettings } from '../../types';
import { handleFirestoreError, OperationType, stripUndefined, parseLocalId } from './transformers';

const TOMBSTONE_COLLECTIONS = ['cryptoAssets', 'cashAssets', 'investmentAssets', 'deposits', 'banks', 'taxYearSettings'] as const;
const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // не чаще раза в сутки

async function cleanupDeletedTombstones(userId: string) {
  const settings = await db.appSettings.get('main');
  const lastCleanup = settings?.lastTombstoneCleanup || 0;
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;

  for (const col of TOMBSTONE_COLLECTIONS) {
    try {
      const snap = await getDocs(query(
        collection(firestore, col),
        where('userId', '==', userId),
        where('isDeleted', '==', true)
      ));
      const staleDocs = snap.docs.filter(d => {
        const updatedAt = d.data().updatedAt || 0;
        return Date.now() - updatedAt > TOMBSTONE_MAX_AGE_MS;
      });
      for (const d of staleDocs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, col);
          
      // Не прерывать очистку остальных коллекций из-за ошибки в одной
    }
  }

  if (settings) {
    await db.appSettings.update('main', { lastTombstoneCleanup: Date.now() });
  }
}

export const emitSyncEvent = (status: 'syncing' | 'success' | 'error', error?: any) => {
  window.dispatchEvent(new CustomEvent('app:sync', { detail: { status, error } }));
};

let activeUnsubscribers: (() => void)[] = [];

export function stopRealTimeSync() {
  activeUnsubscribers.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      logger.error("Unsubscribe error:", e);
    }
  });
  activeUnsubscribers = [];
}


function subscribeToCollection<T>(
  collectionName: string,
  userId: string,
  table: any,
  customMapper?: (data: any, localId: string | number) => T
) {
  const q = query(collection(firestore, collectionName), where('userId', '==', userId));
  const unsub = onSnapshot(q, (snapshot) => {
(async () => {
      try {
        const pendingDeletes = await db.deletedQueue.toArray();
        await db.transaction('rw', table, async () => {
          for (const change of snapshot.docChanges()) {
          const docId = change.doc.id;
          const remoteData = change.doc.data() as any;

          let localId: string | number = parseLocalId(docId, userId);

          const isPendingDelete = pendingDeletes.some(d => d.collection === collectionName && d.docId === docId);
          if (isPendingDelete) {
            continue;
          }

          if (change.type === 'removed' || remoteData.isDeleted) {
            await table.delete(localId as any);
          } else {
            const localData = await table.get(localId as any);
            if (!localData || ((remoteData.updatedAt || 0) > (localData.updatedAt || 0))) {
              const objToSave = customMapper ? customMapper(remoteData, localId) : { ...remoteData, id: localId };
              if (!objToSave.userId) objToSave.userId = userId;
              await table.put(objToSave);
            }
          }
        }
        }); // end transaction
      } catch (err) {
        logger.error(`Real-time ${collectionName} sync error:`, err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, collectionName);
          
  });
  activeUnsubscribers.push(unsub);
}

function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  userId: string,
  table: any,
  customMapper?: (data: any) => T
) {
  const unsub = onSnapshot(doc(firestore, collectionName, docId), (snapshot) => {
    (async () => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          const localData = await table.get('main');
          if (!localData || ((remoteData.updatedAt || 0) > (localData.updatedAt || 0))) {
            const objToSave = customMapper ? customMapper(remoteData) : { ...remoteData, id: 'main', userId };
            await table.put(objToSave);
          }
        }
      } catch (err) {
        logger.error(`Real-time ${collectionName} sync error:`, err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, collectionName);
          
  });
  activeUnsubscribers.push(unsub);
}

export function startRealTimeSync(user: { uid: string }) {
  stopRealTimeSync();

  const parseDate = (val: any) => {
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val && (typeof val === 'string' || typeof val === 'number' || val instanceof Date)) return new Date(val);
    return val;
  };

  subscribeToCollection('deposits', user.uid, db.deposits, (remoteData: any, localId: string | number) => ({
    ...remoteData,
    id: localId,
    startDate: parseDate(remoteData.startDate),
    endDate: parseDate(remoteData.endDate)
  }));

  subscribeToCollection('banks', user.uid, db.banks);
  subscribeToCollection('cashAssets', user.uid, db.cashAssets);
  
  subscribeToCollection('investmentAssets', user.uid, db.investmentAssets, (remoteData: any, localId: string | number) => ({
    ...remoteData,
    id: localId,
    startDate: parseDate(remoteData.startDate)
  }));
  
  subscribeToCollection('cryptoAssets', user.uid, db.cryptoAssets);
  
  subscribeToCollection('taxYearSettings', user.uid, db.taxYearSettings, (remoteData) => ({
    ...remoteData
  })); // no 'id: localId' needed for taxYearSettings as it uses 'year' as PK usually. Wait, the custom mapper handles the return object.
  // Actually, taxYearSettings PK is `year`. So if we put `...remoteData` it should be fine.
  
  subscribeToDoc('userSettings', user.uid, user.uid, db.appSettings);
  subscribeToDoc('income', user.uid, user.uid, db.incomeState);
}

let pendingSync = false;
let syncPromise: Promise<void> | null = null;

export async function syncWithFirebase() {
  const user = auth.currentUser;
  if (!user) return;

  if (syncPromise) {
    pendingSync = true;
    return syncPromise;
  }

    const runSync = async () => {
    emitSyncEvent('syncing');

    try {
      let hasErrors = false;

      // 0. Process deleted queue first
      const pendingDeletes = await db.deletedQueue.toArray();
      for (const delRecord of pendingDeletes) {
        try {
          await setDoc(doc(firestore, delRecord.collection, delRecord.docId), { 
            userId: user.uid,
            isDeleted: true, 
            updatedAt: delRecord.timestamp 
          }, { merge: true });
          if (delRecord.id) await db.deletedQueue.delete(delRecord.id);
        } catch (error: any) {
          if (error && error.code === 'permission-denied') {
            // Tombstone creation failed because document never existed remotely. Drop it.
            if (delRecord.id) await db.deletedQueue.delete(delRecord.id);
          } else {
            const errRes = handleFirestoreError(error, OperationType.DELETE, delRecord.collection);
            if (!errRes?.isOfflineError) hasErrors = true;
          }
        }
      }

      const syncCollection = async (
        collectionName: string, table: any, pathName: string, customMapper?: (data: any, localId: string | number) => any
      ) => {
        try {
          const q = query(collection(firestore, pathName), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          
          await db.transaction('rw', table, async () => {
            for (const docSnap of snapshot.docs) {
              const isPendingDelete = pendingDeletes.some(d => d.collection === collectionName && d.docId === docSnap.id);
              if (isPendingDelete) continue;
              
              const remoteData = docSnap.data();
              let localId = parseLocalId(docSnap.id, user.uid);
              
              const localData = await table.get(localId as any);
              if (remoteData.isDeleted) {
                if (localData) {
                  await table.delete(localId as any);
                }
                continue;
              }
              
              if (!localData || (remoteData.updatedAt || 0) > (localData.updatedAt || 0)) {
                const objToSave = customMapper ? customMapper(remoteData, localId) : { ...remoteData, id: localId };
                if (!objToSave.userId) objToSave.userId = user.uid;
                await table.put(objToSave);
              }
            }
          });
        } catch (error) {
          const errRes = handleFirestoreError(error, OperationType.GET, pathName);
            if (!errRes?.isOfflineError) hasErrors = true;
        }
      };

      const parseDate = (val: any) => {
        if (val && typeof val.toDate === 'function') return val.toDate();
        if (val && (typeof val === 'string' || typeof val === 'number' || val instanceof Date)) return new Date(val);
        return val;
      };

      // Run syncs in parallel
      await Promise.allSettled([
        // Cash Assets
        (async () => {
          const localCash = await db.cashAssets.toArray();
          if (localCash.length > 0) {
            const remoteCashMap = new Map();
            try { const snap = await getDocs(query(collection(firestore, 'cashAssets'), where('userId', '==', user.uid))); snap.forEach((d) => remoteCashMap.set(d.id, d.data())); } catch {}
            for (const cash of localCash) {
              if (cash.userId !== user.uid) {
                cash.userId = user.uid;
                await db.cashAssets.put({...cash});
              }
              const { id, ...data } = cash;
              const path = 'cashAssets';
              const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + Date.now());
              try {
                const remoteCashUpdate = remoteCashMap.get(firestoreDocId)?.updatedAt || 0;
                const localCashUpdate = cash.updatedAt || 0;
                if (localCashUpdate > remoteCashUpdate || (localCashUpdate === 0 && !remoteCashMap.has(firestoreDocId))) {
                  await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                    ...data, currency: data.currency || 'RUB', userId: user.uid, isDeleted: deleteField(), updatedAt: localCashUpdate === 0 ? Date.now() : localCashUpdate
                  }), { merge: true });
                }
              } catch (error) {
                const errRes = handleFirestoreError(error, OperationType.SET, path);
            if (!errRes?.isOfflineError) hasErrors = true;
              }
            }
          }
          await syncCollection('cashAssets', db.cashAssets, 'cashAssets');
        })(),

        // Investment Assets
        (async () => {
          const localInv = await db.investmentAssets.toArray();
          if (localInv.length > 0) {
            const remoteInvMap = new Map();
            try { const snap = await getDocs(query(collection(firestore, 'investmentAssets'), where('userId', '==', user.uid))); snap.forEach((d) => remoteInvMap.set(d.id, d.data())); } catch {}
            for (const inv of localInv) {
              if (inv.userId !== user.uid) {
                inv.userId = user.uid;
                await db.investmentAssets.put({...inv});
              }
              const { id, ...data } = inv;
              const path = 'investmentAssets';
              const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + Date.now());
              try {
                const remoteInvUpdate = remoteInvMap.get(firestoreDocId)?.updatedAt || 0;
                const localInvUpdate = inv.updatedAt || 0;
                if (localInvUpdate > remoteInvUpdate || (localInvUpdate === 0 && !remoteInvMap.has(firestoreDocId))) {
                  await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                    ...data, currency: data.currency || 'RUB', userId: user.uid, isDeleted: deleteField(), updatedAt: localInvUpdate === 0 ? Date.now() : localInvUpdate
                  }), { merge: true });
                }
              } catch (error) {
                const errRes = handleFirestoreError(error, OperationType.SET, path);
            if (!errRes?.isOfflineError) hasErrors = true;
              }
            }
          }
          await syncCollection('investmentAssets', db.investmentAssets, 'investmentAssets', (remoteData, localId) => ({
            ...remoteData, id: localId, startDate: parseDate(remoteData.startDate)
          }));
        })(),

        // Crypto Assets
        (async () => {
          const localCrypto = await db.cryptoAssets.toArray();
          if (localCrypto.length > 0) {
            const remoteCryptoMap = new Map();
            try { const snap = await getDocs(query(collection(firestore, 'cryptoAssets'), where('userId', '==', user.uid))); snap.forEach((d) => remoteCryptoMap.set(d.id, d.data())); } catch {}
            for (const crypto of localCrypto) {
              if (crypto.userId !== user.uid) {
                crypto.userId = user.uid;
                await db.cryptoAssets.put({...crypto});
              }
              const { id, ...data } = crypto;
              const path = 'cryptoAssets';
              const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + Date.now());
              try {
                const remoteCryptoUpdate = remoteCryptoMap.get(firestoreDocId)?.updatedAt || 0;
                const localCryptoUpdate = crypto.updatedAt || 0;
                if (localCryptoUpdate > remoteCryptoUpdate || (localCryptoUpdate === 0 && !remoteCryptoMap.has(firestoreDocId))) {
                  await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                    ...data, userId: user.uid, isDeleted: deleteField(), updatedAt: localCryptoUpdate === 0 ? Date.now() : localCryptoUpdate
                  }), { merge: true });
                }
              } catch (error) {
                const errRes = handleFirestoreError(error, OperationType.SET, path);
            if (!errRes?.isOfflineError) hasErrors = true;
              }
            }
          }
          await syncCollection('cryptoAssets', db.cryptoAssets, 'cryptoAssets');
        })(),

        // Deposits
        (async () => {
          const localDeposits = await db.deposits.toArray();
          if (localDeposits.length > 0) {
            const remoteDepMap = new Map();
            try { const snap = await getDocs(query(collection(firestore, 'deposits'), where('userId', '==', user.uid))); snap.forEach((d) => remoteDepMap.set(d.id, d.data())); } catch {}
            for (const deposit of localDeposits) {
              if (deposit.isTest) continue;
              if (deposit.userId !== user.uid) {
                deposit.userId = user.uid;
                deposit.updatedAt = Date.now();
                await db.deposits.put(deposit);
              }
              const { id, ...data } = deposit;
              const path = 'deposits';
              const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + Date.now());
              try {
                const remoteDepUpdate = remoteDepMap.get(firestoreDocId)?.updatedAt || 0;
                if (!deposit.updatedAt && remoteDepUpdate > 0) continue;
                const localDepUpdate = deposit.updatedAt || Date.now();
                if (localDepUpdate > remoteDepUpdate) {
                  await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                    ...data, formula: data.formula || 'simple_days', currency: (data.currency === '₽' ? 'RUB' : (data.currency || 'RUB')), rate: data.rate || 0, amount: data.amount || 0, bank: data.bank || 'Unknown', userId: user.uid, isDeleted: deleteField(), updatedAt: localDepUpdate
                  }), { merge: true });
                }
              } catch (error) {
                const errRes = handleFirestoreError(error, OperationType.SET, path);
            if (!errRes?.isOfflineError) hasErrors = true;
              }
            }
          }
          await syncCollection('deposits', db.deposits, 'deposits', (remoteData, localId) => ({
            ...remoteData, id: localId, startDate: parseDate(remoteData.startDate), endDate: parseDate(remoteData.endDate)
          }));
        })(),

        // Banks
        (async () => {
          const localBanks = await db.banks.toArray();
          if (localBanks.length > 0) {
            const remoteBankMap = new Map();
            try { const snap = await getDocs(query(collection(firestore, 'banks'), where('userId', '==', user.uid))); snap.forEach((d) => remoteBankMap.set(d.id, d.data())); } catch {}
            for (const bank of localBanks) {
              if (bank.isTest) continue;
              if (bank.isCustom) {
                if (bank.userId !== user.uid) {
                  bank.userId = user.uid;
                  bank.updatedAt = Date.now();
                  await db.banks.put(bank);
                }
                const { id, ...data } = bank;
                const path = 'banks';
                const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + bank.name);
                try {
                  const remoteBankUpdate = remoteBankMap.get(firestoreDocId)?.updatedAt || 0;
                  if (!bank.updatedAt && remoteBankUpdate > 0) continue;
                  const localBankUpdate = bank.updatedAt || Date.now();
                  if (localBankUpdate > remoteBankUpdate) {
                    await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                      ...data, userId: user.uid, isDeleted: deleteField(), updatedAt: localBankUpdate
                    }), { merge: true });
                  }
                } catch (error) {
                  const errRes = handleFirestoreError(error, OperationType.SET, path);
            if (!errRes?.isOfflineError) hasErrors = true;
                }
              }
            }
          }
          await syncCollection('banks', db.banks, 'banks');
        })(),

        // Tax Year Settings
        (async () => {
          const localTax = await db.taxYearSettings.toArray();
          if (localTax.length > 0) {
            const remoteTaxMap = new Map();
            try { const snap = await getDocs(query(collection(firestore, 'taxYearSettings'), where('userId', '==', user.uid))); snap.forEach((d) => remoteTaxMap.set(d.id, d.data())); } catch {}
            for (const tax of localTax) {
              if (tax.userId !== user.uid) {
                tax.userId = user.uid;
                tax.updatedAt = Date.now();
                await db.taxYearSettings.put(tax);
              }
              const { ...data } = tax;
              const path = 'taxYearSettings';
              const firestoreDocId = `${user.uid}_${tax.year}`;
              try {
                const remoteTaxUpdate = remoteTaxMap.get(firestoreDocId)?.updatedAt || 0;
                const localTaxUpdate = tax.updatedAt || 0;
                if (localTaxUpdate > remoteTaxUpdate || (localTaxUpdate === 0 && !remoteTaxMap.has(firestoreDocId))) {
                  await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                    ...data, userId: user.uid, isDeleted: deleteField(), updatedAt: localTaxUpdate === 0 ? Date.now() : localTaxUpdate
                  }), { merge: true });
                }
              } catch (error) {
                const errRes = handleFirestoreError(error, OperationType.SET, path);
                if (!errRes?.isOfflineError) hasErrors = true;
              }
            }
          }
          await syncCollection('taxYearSettings', db.taxYearSettings, 'taxYearSettings', (remoteData, localId) => ({ ...remoteData }));
        })(),

        // Settings
        (async () => {
          const settingsPath = 'userSettings';
          try {
            const settingsSnap = await getDoc(doc(firestore, settingsPath, user.uid));
            const localSettings = await db.appSettings.get('main');
            const remoteSettings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;
            
            const localUpdated = localSettings?.updatedAt || 0;
            const remoteUpdated = remoteSettings?.updatedAt || 1;
            const isLocalSettingsFromGuest = !localSettings || !localSettings.userId || localSettings.userId === 'guest' || localSettings.userId !== user.uid;

            if (remoteSettings && (isLocalSettingsFromGuest || localUpdated === 0 || remoteUpdated > localUpdated)) {
              await db.appSettings.put({ ...remoteSettings, id: 'main', userId: user.uid });
            } else if (localSettings && (!remoteSettings || localUpdated > remoteUpdated)) {
              await setDoc(doc(firestore, settingsPath, user.uid), stripUndefined({
                ...localSettings, userId: user.uid, updatedAt: localUpdated === 0 ? Date.now() : localUpdated
              }));
              if (isLocalSettingsFromGuest) {
                await db.appSettings.put({ ...localSettings, id: 'main', userId: user.uid });
              }
            }
          } catch (error) {
            const errRes = handleFirestoreError(error, OperationType.GET, settingsPath);
            if (!errRes?.isOfflineError) hasErrors = true;
          }
        })(),

        // Income State
        (async () => {
          const incomePath = 'income';
          try {
            const incomeSnap = await getDoc(doc(firestore, incomePath, user.uid));
            const localIncomeState = await db.incomeState.get('main');
            let remoteIncome = incomeSnap.exists() ? incomeSnap.data() : null;

            const staleFields = ['appSettings', 'assetTabOrder', 'hiddenAssetTabs', 'privacyLock'];
            const hasStaleFields = staleFields.some(f => remoteIncome && f in remoteIncome);
            if (hasStaleFields && remoteIncome) {
              const cleaned = { ...remoteIncome };
              staleFields.forEach(f => delete cleaned[f]);
              await setDoc(doc(firestore, 'income', user.uid), cleaned);
              remoteIncome = cleaned;
            }

            const localUpdated = localIncomeState?.updatedAt || 0;
            const remoteUpdated = remoteIncome?.updatedAt || 1;
            const isLocalIncomeFromGuest = !localIncomeState || !localIncomeState.userId || localIncomeState.userId === 'guest' || localIncomeState.userId !== user.uid;

            if (remoteIncome && (isLocalIncomeFromGuest || localUpdated === 0 || remoteUpdated > localUpdated)) {
              await db.incomeState.put({ ...remoteIncome, id: 'main', userId: user.uid });
            } else if (localIncomeState && (!remoteIncome || localUpdated > remoteUpdated)) {
              await setDoc(doc(firestore, incomePath, user.uid), stripUndefined({
                ...localIncomeState, userId: user.uid, updatedAt: localUpdated === 0 ? Date.now() : localUpdated
              }));
              if (isLocalIncomeFromGuest) {
                await db.incomeState.put({ ...localIncomeState, id: 'main', userId: user.uid });
              }
            }
          } catch (error) {
            const errRes = handleFirestoreError(error, OperationType.GET, incomePath);
            if (!errRes?.isOfflineError) hasErrors = true;
          }
        })()
      ]);

      try {
        await cleanupDeletedTombstones(user.uid);
      } catch (error) {
        logger.error('Failed to cleanup tombstones:', error);
      }

      if (hasErrors) {
        emitSyncEvent('error', new Error('Partial sync failure'));
      } else {
        emitSyncEvent('success');
      }
    } catch (error) {
      emitSyncEvent('error', error);
      throw error;
    }
  };

  syncPromise = runSync();
  let success = false;
  try {
    await syncPromise;
    success = true;
  } catch (err) {
    logger.error("Sync failed, dropping pending sync to avoid endless loop", err);
  } finally {
    syncPromise = null;
    if (pendingSync) {
      pendingSync = false;
      if (success) {
        syncWithFirebase();
      }
    }
  }
}

