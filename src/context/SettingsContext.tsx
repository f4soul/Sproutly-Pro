import React, { createContext, useContext, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../config/db';

interface SettingsContextType {
  appSettings: any;
  taxSettings: any;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const taxSettings = useLiveQuery(() => db.taxYearSettings.toArray());
  
  return (
    <SettingsContext.Provider value={{ appSettings, taxSettings: taxSettings || [] }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
