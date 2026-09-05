import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncWithFirebase } from '../config/db';
import { AppState, YearData } from '../types';
import { generateDefaultYear } from '../lib/helpers';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { logger } from '../lib/logger';
import { useAuthSync } from './AuthSyncContext';

interface IncomeContextType {
  state: AppState;
  setState: (newState: AppState | ((prevState: AppState) => AppState)) => void;
  isInitialized: boolean;
}

const IncomeContext = createContext<IncomeContextType | null>(null);

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
    taxBrackets: DEFAULT_TAX_BRACKETS
  };
};

/**
 * Normalize incoming Dexie state — ensure required fields exist.
 * Runs on EVERY dbState update, not just the first one.
 * Existing valid data is preserved; only missing/invalid fields are filled.
 */
const normalizeIncomeState = (data: any): AppState => {
  const result = { ...data } as AppState;

  // activeYear must be a valid number
  if (!result.activeYear || typeof result.activeYear !== 'number') {
    result.activeYear = new Date().getFullYear();
  }

  // years must be a non-null object
  if (!result.years || typeof result.years !== 'object') {
    result.years = {};
  }

  // Ensure the active year has data
  if (!result.years[result.activeYear]) {
    result.years[result.activeYear] = generateDefaultYear(result.activeYear);
  }

  // taxBrackets fallback
  if (!result.taxBrackets) {
    result.taxBrackets = DEFAULT_TAX_BRACKETS;
  }

  return result;
};

export const IncomeProvider = ({ children }: { children: ReactNode }) => {
  const [localState, setLocalState] = useState<AppState>(getInitialState());
  const [isInitialized, setIsInitialized] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuthSync();
  const userUid = user?.uid || null;
  const prevUserUid = useRef<string | null>(userUid);

  // Re-fetch from Dexie when user changes — deps array triggers re-query
  const dbState = useLiveQuery(
    () => db.incomeState.get('main'),
    [userUid]
  );

  // Handle user change — reset local state
  useEffect(() => {
    if (userUid !== prevUserUid.current) {
      setLocalState(getInitialState());
      setIsInitialized(false);
      prevUserUid.current = userUid;
    }
  }, [userUid]);

  // Sync localState from Dexie dbState.
  // CRITICAL: userUid is in deps so this effect re-runs after user change reset.
  useEffect(() => {
    // No user — not initialized, wait for login
    if (userUid === null) {
      return;
    }

    // Still loading from Dexie
    if (dbState === undefined) {
      return;
    }

    // No income record in Dexie — initialized but empty (wait for sync)
    if (dbState === null) {
      if (!isInitialized) setIsInitialized(true);
      return;
    }

    // Dexie has data — verify it belongs to the current user
    // This prevents loading stale data from a previous user if clearLocalData failed
    if (dbState.userId && dbState.userId !== userUid) {
      // Stale data — mark as initialized (show defaults) and wait for sync to write correct data
      if (!isInitialized) setIsInitialized(true);
      return;
    }

    // Check if we should skip (local is newer or equal — prevents overwriting optimistic updates)
    const localUpdated = (localState as AppState & { updatedAt?: number }).updatedAt || 0;
    const dbUpdated = (dbState as AppState & { updatedAt?: number }).updatedAt || 0;

    if (localUpdated > 0 && localUpdated >= dbUpdated) {
      // Local is newer or equal — skip, just ensure initialized
      if (!isInitialized) setIsInitialized(true);
      return;
    }

    // Normalize and set — this runs on every dbState update where remote is newer
    const normalized = normalizeIncomeState(dbState);
    setLocalState(normalized);
    setIsInitialized(true);
  }, [dbState, userUid]);

  const setState = (newStateOrUpdater: AppState | ((prevState: AppState) => AppState)) => {
    setLocalState((prev) => {
      const newState = typeof newStateOrUpdater === 'function' ? newStateOrUpdater(prev) : newStateOrUpdater;
      const stateWithTime = { ...newState, updatedAt: Date.now(), userId: userUid || 'guest' };

      db.incomeState.put({ ...stateWithTime, id: 'main' }).then(() => {
        if (user) {
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = setTimeout(() => {
            syncWithFirebase().catch((e) => logger.error('Sync failed', e));
          }, 5000);
        }
      }).catch((e) => {
        logger.error('Failed to update db state', e);
      });
      return stateWithTime;
    });
  };

  return (
    <IncomeContext.Provider value={{ state: localState, setState, isInitialized }}>
      {children}
    </IncomeContext.Provider>
  );
};

export const useIncome = () => {
  const context = useContext(IncomeContext);
  if (!context) throw new Error('useIncome must be used within a IncomeProvider');
  return context;
};
