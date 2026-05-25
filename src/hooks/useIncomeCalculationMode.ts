import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../config/db';

export type IncomeCalculationMode = 'salary' | 'combined';

export function useIncomeCalculationMode(defaultMode: IncomeCalculationMode = 'salary') {
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const [mode, setLocalMode] = useState<IncomeCalculationMode>(defaultMode);

  useEffect(() => {
    if (appSettings?.incomeCalculationMode) {
      setLocalMode(appSettings.incomeCalculationMode);
    }
  }, [appSettings?.incomeCalculationMode]);

  const setMode = useCallback((newMode: IncomeCalculationMode) => {
    setLocalMode(newMode);
    db.appSettings.update('main', { incomeCalculationMode: newMode, updatedAt: Date.now() }).catch(console.error);
  }, []);

  return { mode, setMode };
}
