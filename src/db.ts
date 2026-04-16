import Dexie, { type Table } from 'dexie';
import { Deposit, TaxYearSettings, AppSettings, Bank } from './types';

export class MyDepositsDB extends Dexie {
  deposits!: Table<Deposit>;
  taxYearSettings!: Table<TaxYearSettings>;
  appSettings!: Table<AppSettings>;
  banks!: Table<Bank>;
  incomeState!: Table<any>;

  constructor() {
    super('MyDepositsDB');
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
import { collection, doc, setDoc, getDocs, query, where, getDoc } from 'firebase/firestore';

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

export async function syncWithFirebase() {
  const user = auth.currentUser;
  if (!user) return;

  emitSyncEvent('syncing');

  try {
    // 1. Upload local changes to Firebase
  const localDeposits = await db.deposits.toArray();
  for (const deposit of localDeposits) {
    if (!deposit.userId || deposit.userId === user.uid) {
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
          updatedAt: deposit.updatedAt || Date.now()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }

  // Upload appSettings
  const localSettings = await db.appSettings.get('main');
  if (localSettings) {
    const path = 'userSettings';
    try {
      await setDoc(doc(firestore, path, user.uid), {
        ...localSettings,
        userId: user.uid,
        updatedAt: localSettings.updatedAt || Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Upload custom banks
  const localBanks = await db.banks.toArray();
  for (const bank of localBanks) {
    if (bank.isCustom) {
      const { id, ...data } = bank;
      const path = 'banks';
      const firestoreDocId = typeof id === 'number' ? `${user.uid}_${id}` : String(id || user.uid + '_' + bank.name);
      try {
        await setDoc(doc(firestore, path, firestoreDocId), {
          ...data,
          userId: user.uid,
          updatedAt: bank.updatedAt || Date.now()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }

  // Upload Income State
  const localIncomeState = await db.incomeState.get('main');
  if (localIncomeState) {
    const path = `users/${user.uid}/data`;
    try {
      await setDoc(doc(firestore, path, 'income'), {
        ...localIncomeState,
        userId: user.uid,
        updatedAt: localIncomeState.updatedAt || Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // 2. Download remote changes from Firebase
  // Deposits
  const depositsPath = 'deposits';
  try {
    const qDeposits = query(collection(firestore, depositsPath), where('userId', '==', user.uid));
    const depositsSnapshot = await getDocs(qDeposits);
    for (const docSnap of depositsSnapshot.docs) {
      const remoteData = docSnap.data();
      
      let localId: string | number = docSnap.id;
      if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
        const numPart = localId.replace(`${user.uid}_`, '');
        if (!isNaN(Number(numPart))) {
          localId = Number(numPart);
        }
      }
      
      const localData = await db.deposits.get(localId);
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

  // Settings
  const settingsPath = 'userSettings';
  try {
    const settingsSnap = await getDoc(doc(firestore, settingsPath, user.uid));
    if (settingsSnap.exists()) {
      const remoteSettings = settingsSnap.data() as AppSettings;
      const localSettings = await db.appSettings.get('main');
      if (!localSettings || (remoteSettings.updatedAt && remoteSettings.updatedAt > (localSettings.updatedAt || 0))) {
        await db.appSettings.put({ ...remoteSettings, id: 'main' });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, settingsPath);
  }

  // Banks
  const banksPath = 'banks';
  try {
    const qBanks = query(collection(firestore, banksPath), where('userId', '==', user.uid));
    const banksSnapshot = await getDocs(qBanks);
    for (const docSnap of banksSnapshot.docs) {
      const remoteData = docSnap.data();
      
      let localId: string | number = docSnap.id;
      if (typeof localId === 'string' && localId.startsWith(`${user.uid}_`)) {
        const numPart = localId.replace(`${user.uid}_`, '');
        if (!isNaN(Number(numPart))) {
          localId = Number(numPart);
        }
      }
      
      const localData = await db.banks.get(localId);
      if (!localData || (remoteData.updatedAt > (localData.updatedAt || 0))) {
        await db.banks.put({ ...remoteData, id: localId } as Bank);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, banksPath);
  }

  // Income State
  const incomePath = `users/${user.uid}/data/income`;
  try {
    const incomeSnap = await getDoc(doc(firestore, 'users', user.uid, 'data', 'income'));
    if (incomeSnap.exists()) {
      const remoteIncome = incomeSnap.data();
      const localIncome = await db.incomeState.get('main');
      if (!localIncome || (remoteIncome.updatedAt && remoteIncome.updatedAt > (localIncome.updatedAt || 0))) {
        await db.incomeState.put({ ...remoteIncome, id: 'main' });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, incomePath);
  }

  emitSyncEvent('success');
} catch (error) {
  emitSyncEvent('error');
  throw error;
}
}

export async function initDB() {
  const settingsCount = await db.appSettings.count();
  if (settingsCount === 0) {
    await db.appSettings.add({
      id: 'main',
      theme: 'light',
      defaultNdflRate: 13,
      defaultLimit2025: 210000,
      incomeCalculationMode: 'salary'
    });
  }

  const taxSettingsCount = await db.taxYearSettings.count();
  if (taxSettingsCount === 0) {
    await db.taxYearSettings.bulkAdd([
      { year: 2024, limit: 150000, ndflRate: 13 },
      { year: 2025, limit: 210000, ndflRate: 13 },
      { year: 2026, limit: 250000, ndflRate: 13 }
    ]);
  }

  const depositsCount = await db.deposits.count();
  if (depositsCount === 0) {
    await db.deposits.bulkAdd([
      {
        bank: "ВТБ",
        isClosed: false,
        updatedAt: 1775221673760,
        sourceNote: "Папа 50/50",
        endDate: new Date("2026-05-29T21:00:00.000Z"),
        currency: "₽",
        startDate: new Date("2026-02-27T21:00:00.000Z"),
        splitIncome: false,
        amount: 500000,
        rate: 24.5,
        formula: "simple_days"
      },
      {
        sourceNote: "Мои",
        updatedAt: 1776087843319,
        isClosed: true,
        bank: "Альфа-Банк",
        currency: "₽",
        endDate: new Date("2026-02-28T21:00:00.000Z"),
        amount: 800000,
        rate: 18,
        formula: "simple_days",
        startDate: new Date("2025-11-30T21:00:00.000Z"),
        splitIncome: true,
        isArchived: 0
      },
      {
        bank: "БСПБ",
        startDate: new Date("2026-01-14T21:00:00.000Z"),
        endDate: new Date("2026-07-14T21:00:00.000Z"),
        amount: 2500000,
        currency: "₽",
        rate: 21,
        formula: "simple_days",
        sourceNote: "Тестовый вклад 1",
        isClosed: false,
        splitIncome: true,
        updatedAt: 1776155897196,
        isTest: true
      },
      {
        bank: "МКБ",
        startDate: new Date("2026-01-31T21:00:00.000Z"),
        endDate: new Date("2027-01-31T21:00:00.000Z"),
        amount: 1500000,
        currency: "₽",
        rate: 19.5,
        formula: "compound_monthly",
        sourceNote: "Тестовый вклад 2",
        isClosed: false,
        splitIncome: true,
        updatedAt: 1776155897196,
        isTest: true
      },
      {
        bank: "Ренессанс",
        startDate: new Date("2026-01-14T21:00:00.000Z"),
        endDate: new Date("2026-07-14T21:00:00.000Z"),
        amount: 2500000,
        currency: "₽",
        rate: 21,
        formula: "simple_days",
        sourceNote: "Тестовый вклад 1",
        isClosed: false,
        splitIncome: true,
        updatedAt: 1776155898155,
        isTest: true
      },
      {
        bank: "ПСБ",
        startDate: new Date("2026-01-31T21:00:00.000Z"),
        endDate: new Date("2027-01-31T21:00:00.000Z"),
        amount: 1500000,
        currency: "₽",
        rate: 19.5,
        formula: "compound_monthly",
        sourceNote: "Тестовый вклад 2",
        isClosed: false,
        splitIncome: true,
        updatedAt: 1776155898155,
        isTest: true
      },
      {
        bank: "Совкомбанк",
        startDate: new Date("2026-01-14T21:00:00.000Z"),
        endDate: new Date("2026-07-14T21:00:00.000Z"),
        amount: 2500000,
        currency: "₽",
        rate: 21,
        formula: "simple_days",
        sourceNote: "Тестовый вклад 1",
        isClosed: false,
        splitIncome: true,
        updatedAt: 1776155898688,
        isTest: true
      },
      {
        bank: "ОТП Банк",
        startDate: new Date("2026-01-31T21:00:00.000Z"),
        endDate: new Date("2027-01-31T21:00:00.000Z"),
        amount: 1500000,
        currency: "₽",
        rate: 19.5,
        formula: "compound_monthly",
        sourceNote: "Тестовый вклад 2",
        isClosed: false,
        splitIncome: true,
        updatedAt: 1776155898688,
        isTest: true
      }
    ]);
  }
}
