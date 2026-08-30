import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, YearData, Deposit, CashAsset, InvestmentAsset, CryptoAsset } from '../types';
import { generateDefaultYear } from '../lib/helpers';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { auth, onAuthStateChanged, User } from '../config/firebase';
import { db, syncWithFirebase, startRealTimeSync, stopRealTimeSync, clearLocalData } from '../config/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface AppDataContextType {
  state: AppState;
  setState: (newState: AppState | ((prevState: AppState) => AppState)) => void;
  user: User | null;
  isAuthReady: boolean;
  isInitialized: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline' | 'idle';
  appSettings: any; // Using unknown for now or import AppSettings if needed
  deposits: Deposit[];
  cashAssets: CashAsset[];
  investmentAssets: InvestmentAsset[];
  cryptoAssets: CryptoAsset[];
}

const AppDataContext = createContext<AppDataContextType | null>(null);

const getInitialState = (): AppState => {
  const currentYear = new Date().getFullYear();
  
  const years: Record<number, YearData> = {
    2024: generateDefaultYear(2024),
    2025: generateDefaultYear(2025),
    2026: generateDefaultYear(2026),
  };

  if (!years[currentYear]) {
    years[currentYear] = generateDefaultYear(currentYear);
  }

  return {
    years,
    activeYear: currentYear,
    taxBrackets: DEFAULT_TAX_BRACKETS,
    simulation: {
      isActive: false,
      salaryIncrease: 0,
      bonusMultiplier: 1,
      extraIncome: 0
    }
  };
};

let globalAuthInitialized = false;
let globalLastUserUid: string | null = null;
let globalIsLoaded = false;

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [localState, setLocalState] = useState<AppState>(getInitialState());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'idle'>('offline');
  const [isInitialized, setIsInitialized] = useState(false);

  const deposits = useLiveQuery(() => db.deposits.toArray()) || [];
  const cashAssets = useLiveQuery(() => db.cashAssets.toArray()) || [];
  const investmentAssets = useLiveQuery(() => db.investmentAssets.toArray()) || [];
  const cryptoAssets = useLiveQuery(() => db.cryptoAssets.toArray()) || [];

  const dbState = useLiveQuery(() => db.incomeState.get('main'));
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));

  useEffect(() => {
    if (dbState) {
      const dbStateWithTime = dbState as AppState & { updatedAt?: number };
      const localStateWithTime = localState as AppState & { updatedAt?: number };
      if (globalIsLoaded && (!dbStateWithTime.updatedAt || (localStateWithTime.updatedAt && localStateWithTime.updatedAt >= dbStateWithTime.updatedAt))) {
         
        if (!isInitialized) setIsInitialized(true);
        return;
      }
      const dataToSet = { ...dbState as AppState };
      if (!globalIsLoaded) {
        dataToSet.activeYear = new Date().getFullYear();
        if (!dataToSet.years[dataToSet.activeYear]) {
           dataToSet.years[dataToSet.activeYear] = generateDefaultYear(dataToSet.activeYear);
        }
      }
      // Fix nulls turning into Infinity in tax brackets due to JSON serialization
      if (dataToSet.taxBrackets) {
        Object.keys(dataToSet.taxBrackets).forEach(year => {
          dataToSet.taxBrackets[Number(year)] = dataToSet.taxBrackets[Number(year)].map((b, idx, arr) => ({
            ...b,
            limit: (b.limit === null || b.limit === 0 && idx === arr.length - 1) ? Infinity : b.limit
          }));
        });
      }
      setLocalState(dataToSet);
      setIsInitialized(true);
      globalIsLoaded = true;
    } else if (dbState === undefined && !globalIsLoaded) {
      // Still loading
    } else if (dbState === null && !globalIsLoaded) {
      setIsInitialized(true);
      globalIsLoaded = true;
    }
  }, [dbState]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setState = (newState: AppState | ((prevState: AppState) => AppState)) => {
    setLocalState((prev) => {
      const updatedState = typeof newState === 'function' ? newState(prev) : newState;
      const updated = { ...updatedState, updatedAt: Date.now(), userId: user?.uid || 'guest' };
      db.incomeState.put({ ...updated, id: 'main' }).then(() => {
        if (user) {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            syncWithFirebase().catch(console.error);
          }, 5000);
        }
      });
      return updated;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      const uid = currentUser?.uid || null;

      if (currentUser) {
        if (!globalAuthInitialized || globalLastUserUid !== uid) {
          globalAuthInitialized = true;
          globalLastUserUid = uid;
          setSyncStatus('syncing');
          startRealTimeSync(currentUser);
          syncWithFirebase().catch(console.error);
        }
      } else {
        setSyncStatus('offline');
        stopRealTimeSync();
        if (globalLastUserUid !== null) {
          globalLastUserUid = null;
          globalAuthInitialized = false;
          try {
            await clearLocalData();
          } catch (e) {
            console.error("Failed to clear local data on logout:", e);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: 'syncing' | 'success' | 'error' }>;
      if (customEvent.detail.status === 'success') {
        setSyncStatus('synced');
      } else if (customEvent.detail.status === 'error') {
        setSyncStatus('error');
      } else {
        setSyncStatus('syncing');
      }
    };

    window.addEventListener('app:sync', handleSync);
    return () => window.removeEventListener('app:sync', handleSync);
  }, []);

  useEffect(() => {
    if (syncStatus === 'synced') {
      const timer = setTimeout(() => setSyncStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  useEffect(() => {
    const migrate = async () => {
      const saved = localStorage.getItem('incomeCalculatorState_v4');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const count = await db.incomeState.count();
          if (count === 0) {
            await db.incomeState.put({ ...parsed, id: 'main', updatedAt: Date.now(), userId: user?.uid || 'guest' });
            setLocalState(parsed);
          }
          localStorage.removeItem('incomeCalculatorState_v4');
        } catch (e) {
          console.error('Failed to migrate state', e);
        }
      } else {
        const count = await db.incomeState.count();
        if (count === 0) {
          await db.incomeState.put({ ...getInitialState(), id: 'main', updatedAt: 0, userId: 'guest' });
        }
      }
    };
    migrate();
  }, [user]);

  return (
    <AppDataContext.Provider value={{
      state: localState,
      setState,
      user,
      isAuthReady,
      isInitialized,
      syncStatus,
      appSettings,
      deposits,
      cashAssets,
      investmentAssets,
      cryptoAssets
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
