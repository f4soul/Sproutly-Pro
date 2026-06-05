import Dexie, { type Table } from 'dexie';
import { Deposit, CashAsset, TaxYearSettings, AppSettings, Bank, DeletedRecord } from '../types';

export class MyDepositsDB extends Dexie {
  deposits!: Table<Deposit>;
  cashAssets!: Table<CashAsset>;
  taxYearSettings!: Table<TaxYearSettings>;
  appSettings!: Table<AppSettings>;
  banks!: Table<Bank>;
  incomeState!: Table<any>;
  deletedQueue!: Table<DeletedRecord>;

  constructor() {
    super('MyDepositsDB');
    this.version(6).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      cashAssets: '++id, userId, name, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id',
      deletedQueue: '++id, collection, docId'
    });
    this.version(5).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id',
      deletedQueue: '++id, collection, docId'
    });
    this.version(4).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id'
    });
  }
}

import { auth, db as firestore } from './firebase';
import { collection, doc, setDoc, getDocs, query, where, getDoc, deleteField, onSnapshot } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function stripUndefined(obj: any): any {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

export const db = new MyDepositsDB();

export const emitSyncEvent = (status: 'syncing' | 'success' | 'error', error?: any) => {
  window.dispatchEvent(new CustomEvent('app:sync', { detail: { status, error } }));
};

let activeUnsubscribers: (() => void)[] = [];

export function stopRealTimeSync() {
  activeUnsubscribers.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      console.error("Unsubscribe error:", e);
    }
  });
  activeUnsubscribers = [];
}

export function startRealTimeSync(user: { uid: string }) {
  stopRealTimeSync();

  // Listen to deposits
  const qDeposits = query(collection(firestore, 'deposits'), where('userId', '==', user.uid));
  const unsubDeposits = onSnapshot(qDeposits, (snapshot) => {
    (async () => {
      try {
        const pendingDeletes = await db.deletedQueue.toArray();
        for (const change of snapshot.docChanges()) {
          const docId = change.doc.id;
          const remoteData = change.doc.data();
          
          let localId: string | number = docId;
          if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
            const numPart = localId.replace(`${user.uid}_`, '');
            if (!isNaN(Number(numPart))) {
              localId = Number(numPart);
            }
          }

          const isPendingDelete = pendingDeletes.some(d => d.collection === 'deposits' && d.docId === docId);
          if (isPendingDelete) {
            continue;
          }

          if (change.type === 'removed' || remoteData.isDeleted) {
            await db.deposits.delete(localId as any);
          } else {
            const localData = await db.deposits.get(localId);
            if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
              // Convert fields appropriately
              let startDateVal = remoteData.startDate;
              if (startDateVal && typeof startDateVal.toDate === 'function') {
                startDateVal = startDateVal.toDate();
              } else if (startDateVal && (typeof startDateVal === 'string' || typeof startDateVal === 'number' || startDateVal instanceof Date)) {
                startDateVal = new Date(startDateVal);
              }
              
              let endDateVal = remoteData.endDate;
              if (endDateVal && typeof endDateVal.toDate === 'function') {
                endDateVal = endDateVal.toDate();
              } else if (endDateVal && (typeof endDateVal === 'string' || typeof endDateVal === 'number' || endDateVal instanceof Date)) {
                endDateVal = new Date(endDateVal);
              }

              await db.deposits.put({ 
                ...remoteData, 
                id: localId,
                startDate: startDateVal,
                endDate: endDateVal
              } as Deposit);
            }
          }
        }
      } catch (err) {
        console.error("Real-time deposits sync error:", err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'deposits');
  });
  activeUnsubscribers.push(unsubDeposits);

  // Listen to banks
  const qBanks = query(collection(firestore, 'banks'), where('userId', '==', user.uid));
  const unsubBanks = onSnapshot(qBanks, (snapshot) => {
    (async () => {
      try {
        const pendingDeletes = await db.deletedQueue.toArray();
        for (const change of snapshot.docChanges()) {
          const docId = change.doc.id;
          const remoteData = change.doc.data();
          
          let localId: string | number = docId;
          if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
            const numPart = localId.replace(`${user.uid}_`, '');
            if (!isNaN(Number(numPart))) {
              localId = Number(numPart);
            }
          }

          const isPendingDelete = pendingDeletes.some(d => d.collection === 'banks' && d.docId === docId);
          if (isPendingDelete) {
            continue;
          }

          if (change.type === 'removed' || remoteData.isDeleted) {
            await db.banks.delete(localId as any);
          } else {
            const localData = await db.banks.get(localId);
            if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
              await db.banks.put({ ...remoteData, id: localId } as Bank);
            }
          }
        }
      } catch (err) {
        console.error("Real-time banks sync error:", err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'banks');
  });
  activeUnsubscribers.push(unsubBanks);

  // Listen to userSettings
  const unsubSettings = onSnapshot(doc(firestore, 'userSettings', user.uid), (snapshot) => {
    (async () => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as AppSettings;
          const localData = await db.appSettings.get('main');
          if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
            await db.appSettings.put({ ...remoteData, id: 'main' });
          }
        }
      } catch (err) {
        console.error("Real-time settings sync error:", err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'userSettings');
  });
  activeUnsubscribers.push(unsubSettings);

  // Listen to incomeState
  const unsubIncome = onSnapshot(doc(firestore, `users/${user.uid}/data`, 'income'), (snapshot) => {
    (async () => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          const localData = await db.incomeState.get('main');
          if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
            await db.incomeState.put({ ...remoteData, id: 'main' });
          }
        }
      } catch (err) {
        console.error("Real-time incomeState sync error:", err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data`);
  });
  activeUnsubscribers.push(unsubIncome);

  // Listen to taxYearSettings
  const qTax = query(collection(firestore, 'taxYearSettings'), where('userId', '==', user.uid));
  const unsubTax = onSnapshot(qTax, (snapshot) => {
    (async () => {
      try {
        for (const change of snapshot.docChanges()) {
          const remoteData = change.doc.data() as TaxYearSettings & { isDeleted?: boolean };
          if (change.type === 'removed' || remoteData.isDeleted) {
            await db.taxYearSettings.delete(remoteData.year);
          } else {
            const localData = await db.taxYearSettings.get(remoteData.year);
            if (!localData || ((remoteData.updatedAt || 0) > (localData.updatedAt || 0))) {
              await db.taxYearSettings.put(remoteData);
            }
          }
        }
      } catch (err) {
        console.error("Real-time tax settings sync error:", err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'taxYearSettings');
  });
  activeUnsubscribers.push(unsubTax);

  // Listen to cashAssets
  const qCashAssets = query(collection(firestore, 'cashAssets'), where('userId', '==', user.uid));
  const unsubCashAssets = onSnapshot(qCashAssets, (snapshot) => {
    (async () => {
      try {
        const pendingDeletes = await db.deletedQueue.toArray();
        for (const change of snapshot.docChanges()) {
          const docId = change.doc.id;
          const remoteData = change.doc.data() as CashAsset & { isDeleted?: boolean };
          
          let localId: string | number = docId;
          if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
            const numPart = localId.replace(`${user.uid}_`, '');
            if (!isNaN(Number(numPart))) {
              localId = Number(numPart);
            }
          }

          const isPendingDelete = pendingDeletes.some(d => d.collection === 'cashAssets' && d.docId === docId);
          if (isPendingDelete) {
            continue;
          }

          if (change.type === 'removed' || remoteData.isDeleted) {
            await db.cashAssets.delete(localId as any);
          } else {
            await db.cashAssets.put({ ...remoteData, id: localId } as CashAsset);
          }
        }
      } catch (err) {
        console.error("Real-time cashAssets sync error:", err);
      }
    })();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'cashAssets');
  });
  activeUnsubscribers.push(unsubCashAssets);
}

export async function clearLocalData() {
  await db.deposits.clear();
  await db.banks.clear();
  await db.appSettings.clear();
  await db.incomeState.clear();
  await db.deletedQueue.clear();
  await db.taxYearSettings.clear();
  await initDB();
}

let syncPromise: Promise<void> | null = null;
let pendingSync = false;

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
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, delRecord.collection);
        }
      }

      // Upload local changes to Firebase
      let remoteCashMap = new Map();
      try { const snap = await getDocs(query(collection(firestore, 'cashAssets'), where('userId', '==', user.uid))); snap.forEach((d) => remoteCashMap.set(d.id, d.data())); } catch(e) {}
      
      const localCash = await db.cashAssets.toArray();
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
          if (localCashUpdate >= remoteCashUpdate) {
            await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
              ...data,
              currency: data.currency || 'RUB',
              userId: user.uid,
              isDeleted: deleteField(),
              updatedAt: localCashUpdate === 0 ? Date.now() : localCashUpdate
            }), { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }

      let remoteDepMap = new Map();
      try { const snap = await getDocs(query(collection(firestore, 'deposits'), where('userId', '==', user.uid))); snap.forEach((d) => remoteDepMap.set(d.id, d.data())); } catch(e) {}
      
      const localDeposits = await db.deposits.toArray();
      for (const deposit of localDeposits) {
        if (deposit.isTest) continue; // Skip test records
        
        // If the deposit belongs to a different userId, or has no userId, 
        // migrate it to the current logged-in user so we don't lose the local data
        if (deposit.userId !== user.uid) {
          deposit.userId = user.uid;
          deposit.updatedAt = Date.now(); // Mark as updated to trigger upload
          await db.deposits.put(deposit);
        }

        const { id, ...data } = deposit;
        const path = 'deposits';
        const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + Date.now());
        try {
          const remoteDepUpdate = remoteDepMap.get(firestoreDocId)?.updatedAt || 0;
          const localDepUpdate = deposit.updatedAt || Date.now();
          if (localDepUpdate >= remoteDepUpdate) {
            await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
              ...data,
              formula: data.formula || 'simple_days',
              currency: (data.currency === '₽' ? 'RUB' : (data.currency || 'RUB')),
              rate: data.rate || 0,
              amount: data.amount || 0,
              bank: data.bank || 'Unknown',
              userId: user.uid,
              isDeleted: deleteField(),
              updatedAt: localDepUpdate
            }), { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }

      // Download remote changes first
      
      // Upload custom banks
      let remoteBankMap = new Map();
      try { const snap = await getDocs(query(collection(firestore, 'banks'), where('userId', '==', user.uid))); snap.forEach((d) => remoteBankMap.set(d.id, d.data())); } catch(e) {}
      
      const localBanks = await db.banks.toArray();
      for (const bank of localBanks) {
        if (bank.isTest) continue; // Skip test records
        if (bank.isCustom) {
          // If the custom bank belongs to a different userId, or has no userId, 
          // migrate it to the current logged-in user so we don't lose the local data
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
            const localBankUpdate = bank.updatedAt || Date.now();
            if (localBankUpdate >= remoteBankUpdate) {
              await setDoc(doc(firestore, path, firestoreDocId), stripUndefined({
                ...data,
                userId: user.uid,
                isDeleted: deleteField(),
                updatedAt: localBankUpdate
              }), { merge: true });
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
          }
        }
      }

  // Settings
  const settingsPath = 'userSettings';
  try {
    const settingsSnap = await getDoc(doc(firestore, settingsPath, user.uid));
    const localSettings = await db.appSettings.get('main');
    const remoteSettings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;
    
    const localUpdated = localSettings?.updatedAt || 0;
    const remoteUpdated = remoteSettings?.updatedAt || 1;

    if (remoteSettings && (!localSettings || localUpdated === 0 || remoteUpdated > localUpdated)) {
      await db.appSettings.put({ ...remoteSettings, id: 'main' });
    } else if (localSettings && (!remoteSettings || localUpdated > remoteUpdated)) {
      await setDoc(doc(firestore, settingsPath, user.uid), stripUndefined({
        ...localSettings,
        userId: user.uid,
        updatedAt: localUpdated === 0 ? Date.now() : localUpdated
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, settingsPath);
  }

  // Income State
  const incomePath = `users/${user.uid}/data`;
  try {
    const incomeSnap = await getDoc(doc(firestore, incomePath, 'income'));
    const localIncomeState = await db.incomeState.get('main');
    const remoteIncome = incomeSnap.exists() ? incomeSnap.data() : null;

    const localUpdated = localIncomeState?.updatedAt || 0;
    const remoteUpdated = remoteIncome?.updatedAt || 1;

    if (remoteIncome && (!localIncomeState || localUpdated === 0 || remoteUpdated > localUpdated)) {
      await db.incomeState.put({ ...remoteIncome, id: 'main' });
    } else if (localIncomeState && (!remoteIncome || localUpdated > remoteUpdated)) {
      await setDoc(doc(firestore, incomePath, 'income'), stripUndefined({
        ...localIncomeState,
        userId: user.uid,
        updatedAt: localUpdated === 0 ? Date.now() : localUpdated
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, incomePath);
  }

  // Deposits
  const depositsPath = 'deposits';
  try {
    const qDeposits = query(collection(firestore, depositsPath), where('userId', '==', user.uid));
    const depositsSnapshot = await getDocs(qDeposits);
    for (const docSnap of depositsSnapshot.docs) {
      // Avoid race conditions: if this document is pending deletion locally, do not recreate it
      const isPendingDelete = pendingDeletes.some(d => d.collection === 'deposits' && d.docId === docSnap.id);
      if (isPendingDelete) {
        continue;
      }

      const remoteData = docSnap.data();
      
      let localId: string | number = docSnap.id;
      if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
        const numPart = localId.replace(`${user.uid}_`, '');
        if (!isNaN(Number(numPart))) {
          localId = Number(numPart);
        }
      }
      
      const localData = await db.deposits.get(localId);
      if (remoteData.isDeleted) {
        if (localData) {
          await db.deposits.delete(localId as any);
        }
        continue;
      }
      
      if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
        // Convert Timestamps to Dates
        if (remoteData.startDate && typeof remoteData.startDate.toDate === 'function') {
          remoteData.startDate = remoteData.startDate.toDate();
        }
        if (remoteData.endDate && typeof remoteData.endDate.toDate === 'function') {
          remoteData.endDate = remoteData.endDate.toDate();
        }
        if (remoteData.currency === '₽') {
          remoteData.currency = 'RUB';
        }
        await db.deposits.put({ ...remoteData, id: localId } as Deposit);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, depositsPath);
  }

  // TaxYearSettings
  const taxSettingsPath = 'taxYearSettings';
  try {
    // Get all remote settings for this user
    const qSettings = query(collection(firestore, taxSettingsPath), where('userId', '==', user.uid));
    const settingsSnapshot = await getDocs(qSettings);
    const remoteSettingsList = settingsSnapshot.docs.map(doc => doc.data() as TaxYearSettings & { isDeleted?: boolean });
    
    // Get all local settings
    const localSettingsList = await db.taxYearSettings.toArray();

    // Map by year for easy lookup
    const remoteByYear = new Map(remoteSettingsList.map(s => [s.year, s]));
    const localByYear = new Map(localSettingsList.map(s => [s.year, s]));

    // Sync remote to local and local to remote
    for (const remoteData of remoteSettingsList) {
      const localData = localByYear.get(remoteData.year);
      
      if (remoteData.isDeleted) {
        if (localData) {
          await db.taxYearSettings.delete(remoteData.year);
        }
        continue;
      }
      
      const remoteUpdated = remoteData.updatedAt || 1;
      const localUpdated = localData?.updatedAt || 0;

      if (!localData || remoteUpdated > localUpdated) {
        await db.taxYearSettings.put(remoteData);
      }
    }

    // Now upload local changes that are newer or don't exist remotely
    for (const localData of localSettingsList) {
      const remoteData = remoteByYear.get(localData.year);
      const localUpdated = localData.updatedAt || 0;
      const remoteUpdated = remoteData?.updatedAt || 1;

      if (!remoteData || localUpdated > remoteUpdated) {
        const firestoreDocId = `${user.uid}_${localData.year}`;
        await setDoc(doc(firestore, taxSettingsPath, firestoreDocId), stripUndefined({
          ...localData,
          userId: user.uid,
          updatedAt: localUpdated === 0 ? Date.now() : localUpdated
        }));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, taxSettingsPath);
  }

  // CashAssets
  const cashPath = 'cashAssets';
  try {
    const qCash = query(collection(firestore, cashPath), where('userId', '==', user.uid));
    const cashSnapshot = await getDocs(qCash);
    for (const docSnap of cashSnapshot.docs) {
      const isPendingDelete = pendingDeletes.some(d => d.collection === 'cashAssets' && d.docId === docSnap.id);
      if (isPendingDelete) {
        continue;
      }
      const remoteData = docSnap.data();
      let localId: string | number = docSnap.id;
      if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
        const numPart = localId.replace(`${user.uid}_`, '');
        if (!isNaN(Number(numPart))) {
          localId = Number(numPart);
        }
      }
      
      const localData = await db.cashAssets.get(localId);
      if (remoteData.isDeleted) {
        if (localData) {
          await db.cashAssets.delete(localId as any);
        }
        continue;
      }
      
      // Since Cash Asset doesn't have updatedAt yet, we just overwrite if different, or we can add updatedAt
      // Simple sync: just overwrite it if we don't have updatedAt for cash assets.
      await db.cashAssets.put({ ...remoteData, id: localId } as CashAsset);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, cashPath);
  }

  // Banks
  const banksPath = 'banks';
  try {
    const qBanks = query(collection(firestore, banksPath), where('userId', '==', user.uid));
    const banksSnapshot = await getDocs(qBanks);
    for (const docSnap of banksSnapshot.docs) {
      // Avoid race conditions: if this document is pending deletion locally, do not recreate it
      const isPendingDelete = pendingDeletes.some(d => d.collection === 'banks' && d.docId === docSnap.id);
      if (isPendingDelete) {
        continue;
      }

      const remoteData = docSnap.data();
      
      let localId: string | number = docSnap.id;
      if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
        const numPart = localId.replace(`${user.uid}_`, '');
        if (!isNaN(Number(numPart))) {
          localId = Number(numPart);
        }
      }
      
      const localData = await db.banks.get(localId);
      if (remoteData.isDeleted) {
        if (localData) {
          await db.banks.delete(localId as any);
        }
        continue;
      }
      
      if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
        await db.banks.put({ ...remoteData, id: localId } as Bank);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, banksPath);
  }

  emitSyncEvent('success');
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
    console.error("Sync failed, dropping pending sync to avoid endless loop", err);
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

export async function initDB() {
  const settingsCount = await db.appSettings.count();
  if (settingsCount === 0) {
    await db.appSettings.put({
      id: 'main',
      theme: 'light',
      defaultNdflRate: 13,
      defaultLimit2025: 210000,
      incomeCalculationMode: 'salary',
      updatedAt: 0
    });
  }

  const taxSettingsCount = await db.taxYearSettings.count();
  if (taxSettingsCount === 0) {
    await db.taxYearSettings.bulkPut([
      { year: 2024, limit: 150000, ndflRate: 13 },
      { year: 2025, limit: 210000, ndflRate: 13 },
      { year: 2026, limit: 160000, ndflRate: 13 }
    ]);
  }

  // Cleanup: Remove any "ghost" test deposits. Test data should stay in session only.
  const allDeposits = await db.deposits.toArray();
  const testIds = allDeposits
    .filter(d => (d as any).isTest === true)
    .map(d => d.id)
    .filter((id): id is number => id !== undefined);
  if (testIds.length > 0) {
    await db.deposits.bulkDelete(testIds);
  }
}
