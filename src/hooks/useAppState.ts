import { useState, useEffect, useRef } from 'react';
import { AppState, Toast } from '../types';
import { generateDefaultYear } from '../lib/helpers';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { auth, onAuthStateChanged, User } from '../config/firebase';
import { db, syncWithFirebase } from '../config/db';
import { useLiveQuery } from 'dexie-react-hooks';

const getInitialState = (): AppState => {
  return {
    years: {
      2024: generateDefaultYear(2024),
      2025: generateDefaultYear(2025),
      2026: generateDefaultYear(2026),
    },
    activeYear: 2025,
    taxBrackets: DEFAULT_TAX_BRACKETS,
    simulation: {
      isActive: false,
      salaryIncrease: 0,
      bonusMultiplier: 1,
      extraIncome: 0
    }
  };
};

export const useAppState = () => {
  const [localState, setLocalState] = useState<AppState>(getInitialState());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'idle'>('offline');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const isLoadedRef = useRef(false);

  const dbState = useLiveQuery(() => db.incomeState.get('main'));

  useEffect(() => {
    if (dbState) {
      // Avoid redundant updates if local state is already matched or newer
      if (isLoadedRef.current && (dbState as any).updatedAt && (localState as any).updatedAt >= (dbState as any).updatedAt) {
        return;
      }
      setLocalState(dbState as AppState);
      setIsInitialized(true);
      isLoadedRef.current = true;
    } else if (dbState === undefined && !isLoadedRef.current) {
      // Still loading
    } else if (dbState === null && !isLoadedRef.current) {
      // No data in DB, use initial
      setIsInitialized(true);
      isLoadedRef.current = true;
    }
  }, [dbState, localState]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setState = (newState: AppState | ((prevState: AppState) => AppState)) => {
    setLocalState((prev) => {
      const updated = typeof newState === 'function' ? newState(prev) : newState;
      db.incomeState.put({ ...updated, id: 'main', updatedAt: Date.now() }).then(() => {
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setSyncStatus('syncing');
      } else {
        setSyncStatus('offline');
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
          await db.incomeState.put({ ...getInitialState(), id: 'main', updatedAt: Date.now() });
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
