import Dexie, { type Table } from 'dexie';
import { logger } from '../../lib/logger';
import { Deposit, CashAsset, InvestmentAsset, CryptoAsset, TaxYearSettings, AppSettings, Bank, DeletedRecord, ProductionCalendar } from '../../types';

export class MyDepositsDB extends Dexie {
  deposits!: Table<Deposit>;
  cashAssets!: Table<CashAsset>;
  investmentAssets!: Table<InvestmentAsset>;
  cryptoAssets!: Table<CryptoAsset>;
  taxYearSettings!: Table<TaxYearSettings>;
  appSettings!: Table<AppSettings>;
  banks!: Table<Bank>;
  incomeState!: Table<any>;
  calendarData!: Table<ProductionCalendar>;
  deletedQueue!: Table<DeletedRecord>;

  constructor() {
    super('MyDepositsDB');
    this.version(10).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      cashAssets: '++id, userId, name, isArchived',
      investmentAssets: '++id, userId, type, isArchived',
      cryptoAssets: '++id, userId, ticker, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id',
      calendarData: 'year',
      deletedQueue: '++id, collection, docId'
    }).upgrade(tx => {
      return tx.table('cashAssets').toCollection().modify(record => {
        try {
          record.name = record.currency;
          if (!record.purchaseDate) {
            record.purchaseDate = new Date(record.updatedAt || Date.now()).toISOString().split('T')[0];
          }
          record.updatedAt = Date.now();
        } catch (e) {
          logger.error("Migration error in cashAssets v10:", e);
        }
      });
    });
    this.version(9).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      cashAssets: '++id, userId, name, isArchived',
      investmentAssets: '++id, userId, type, isArchived',
      cryptoAssets: '++id, userId, ticker, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id',
      calendarData: 'year',
      deletedQueue: '++id, collection, docId'
    });
    this.version(8).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      cashAssets: '++id, userId, name, isArchived',
      investmentAssets: '++id, userId, type, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id',
      calendarData: 'year',
      deletedQueue: '++id, collection, docId'
    });
    this.version(7).stores({
      deposits: '++id, userId, bank, startDate, endDate, isClosed, isArchived',
      cashAssets: '++id, userId, name, isArchived',
      taxYearSettings: 'year',
      appSettings: 'id',
      banks: '++id, userId, name',
      incomeState: 'id',
      calendarData: 'year',
      deletedQueue: '++id, collection, docId'
    });
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

export const db = new MyDepositsDB();

export async function clearLocalData() {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    await db.deposits.clear();
    await db.banks.clear();
    await db.appSettings.clear();
    await db.incomeState.clear();
    await db.cashAssets.clear();
    await db.investmentAssets.clear();
    await db.cryptoAssets.clear();
    await db.deletedQueue.clear();
    await db.taxYearSettings.clear();
    await initDB();
  } catch (error: any) {
    if (error?.name === 'DatabaseClosedError') {
      logger.warn("Database closed while clearing local data.");
      return;
    }
    logger.error("Failed to clear local data:", error);
    throw error;
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
