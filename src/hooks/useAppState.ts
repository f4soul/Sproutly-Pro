import { useState, useEffect, useRef } from 'react';
import { AppState, Toast } from '../types';
import { generateDefaultYear } from '../lib/helpers';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { auth, onAuthStateChanged, User } from '../config/firebase';
import { db, syncWithFirebase, startRealTimeSync, stopRealTimeSync, clearLocalData } from '../config/db';
import { useLiveQuery } from 'dexie-react-hooks';

const getInitialState = (): AppState => {
  const currentYear = new Date().getFullYear();
  
  const years: Record<number, any> = {
    2024: generateDefaultYear(2024),
    2025: generateDefaultYear(2025),
    2026: generateDefaultYear(2026),
  };

  // Ensure current year is always generated if not 24, 25, 26
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

export const useAppState = () => {
  const [localState, setLocalState] = useState<AppState>(getInitialState());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'idle'>('offline');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const dbState = useLiveQuery(() => db.incomeState.get('main'));

  useEffect(() => {
    if (dbState) {
      // Avoid redundant updates if local state is already matched or newer
      if (globalIsLoaded && (dbState as any).updatedAt && (localState as any).updatedAt >= (dbState as any).updatedAt) {
        return;
      }
      const dataToSet = { ...dbState as AppState };
      if (!globalIsLoaded) {
        // Force the app to start with current calendar year only on very first load
        dataToSet.activeYear = new Date().getFullYear();
        if (!dataToSet.years[dataToSet.activeYear]) {
           dataToSet.years[dataToSet.activeYear] = generateDefaultYear(dataToSet.activeYear);
        }
      }
      setLocalState(dataToSet);
      setIsInitialized(true);
      globalIsLoaded = true;
    } else if (dbState === undefined && !globalIsLoaded) {
      // Still loading
    } else if (dbState === null && !globalIsLoaded) {
      // No data in DB, use initial
      setIsInitialized(true);
      globalIsLoaded = true;
    }
  }, [dbState]);


  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setState = (newState: AppState | ((prevState: AppState) => AppState)) => {
    setLocalState((prev) => {
      const updatedState = typeof newState === 'function' ? newState(prev) : newState;
      const updated = { ...updatedState, updatedAt: Date.now() };
      db.incomeState.put({ ...updated, id: 'main' }).then(() => {
        if (user) {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            syncWithFirebase().catch(console.error);
          }, 2000);
        }
      });
      return updated;
    });
  };

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth Listener
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

  // Sync listener
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

  // Hide sync status after success
  useEffect(() => {
    if (syncStatus === 'synced') {
      const timer = setTimeout(() => setSyncStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  // Migrate from localStorage if exists
  useEffect(() => {
    const migrate = async () => {
      const saved = localStorage.getItem('incomeCalculatorState_v4');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const count = await db.incomeState.count();
          if (count === 0) {
            await db.incomeState.put({ ...parsed, id: 'main', updatedAt: Date.now() });
            setLocalState(parsed);
          }
          localStorage.removeItem('incomeCalculatorState_v4');
        } catch (e) {
          console.error('Failed to migrate state', e);
        }
      } else {
        const count = await db.incomeState.count();
        if (count === 0) {
          await db.incomeState.put({ ...getInitialState(), id: 'main', updatedAt: 0 });
        }
      }
    };
    migrate();
  }, []);

  return {
    state: localState,
    setState,
    user,
    isAuthReady,
    isInitialized,
    syncStatus,
    toasts,
    addToast,
    removeToast,
  };
};
