import Dexie, { type Table } from 'dexie';
import { Deposit, TaxYearSettings, AppSettings, Bank, DeletedRecord } from '../types';

export class MyDepositsDB extends Dexie {
  deposits!: Table<Deposit>;
  taxYearSettings!: Table<TaxYearSettings>;
  appSettings!: Table<AppSettings>;
  banks!: Table<Bank>;
  incomeState!: Table<any>;
  deletedQueue!: Table<DeletedRecord>;

  constructor() {
    super('MyDepositsDB');
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
import { collection, doc, setDoc, getDocs, query, where, getDoc, deleteField } from 'firebase/firestore';

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

export const db = new MyDepositsDB();

export const emitSyncEvent = (status: 'syncing' | 'success' | 'error') => {
  window.dispatchEvent(new CustomEvent('app:sync', { detail: { status } }));
};

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

      // 1. Upload local changes to Firebase
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
          await setDoc(doc(firestore, path, firestoreDocId), {
            ...data,
            formula: data.formula || 'simple_days',
            currency: data.currency || '₽',
            rate: data.rate || 0,
            amount: data.amount || 0,
            bank: data.bank || 'Unknown',
            userId: user.uid,
            isDeleted: deleteField(),
            updatedAt: deposit.updatedAt || Date.now()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }

      // Download remote changes first
      
      // Upload custom banks
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
            await setDoc(doc(firestore, path, firestoreDocId), {
              ...data,
              userId: user.uid,
              isDeleted: deleteField(),
              updatedAt: bank.updatedAt || Date.now()
            }, { merge: true });
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
      await setDoc(doc(firestore, settingsPath, user.uid), {
        ...localSettings,
        userId: user.uid,
        updatedAt: localUpdated === 0 ? Date.now() : localUpdated
      });
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
      await setDoc(doc(firestore, incomePath, 'income'), {
        ...localIncomeState,
        userId: user.uid,
        updatedAt: localUpdated === 0 ? Date.now() : localUpdated
      });
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
        await setDoc(doc(firestore, taxSettingsPath, firestoreDocId), {
          ...localData,
          userId: user.uid,
          updatedAt: localUpdated === 0 ? Date.now() : localUpdated
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, taxSettingsPath);
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
      emitSyncEvent('error');
      throw error;
    }
  };

  syncPromise = runSync();
  try {
    await syncPromise;
  } finally {
    syncPromise = null;
    if (pendingSync) {
      pendingSync = false;
      syncWithFirebase();
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
