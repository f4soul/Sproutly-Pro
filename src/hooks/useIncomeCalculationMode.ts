import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export type IncomeCalculationMode = 'salary' | 'combined';

export function useIncomeCalculationMode(defaultMode: IncomeCalculationMode = 'salary') {
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const [mode, setMode] = useState<IncomeCalculationMode>(defaultMode);

  useEffect(() => {
    if (appSettings?.incomeCalculationMode) {
      setMode(appSettings.incomeCalculationMode);
    }
  }, [appSettings?.incomeCalculationMode]);

  useEffect(() => {
    if (!appSettings) return;
    if (appSettings.incomeCalculationMode !== mode) {
      db.appSettings.update('main', { incomeCalculationMode: mode, updatedAt: Date.now() }).catch(console.error);
    }
  }, [appSettings, mode]);

  return { mode, setMode };
}
