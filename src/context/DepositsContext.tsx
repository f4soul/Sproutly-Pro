import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../config/db';
import { Deposit } from '../types';

interface DepositsContextType {
  deposits: Deposit[];
}

const DepositsContext = createContext<DepositsContextType | null>(null);

export const DepositsProvider = ({ children }: { children: ReactNode }) => {
  const depositsData = useLiveQuery(() => db.deposits.toArray());
  const deposits = useMemo(() => depositsData || [], [depositsData]);

  return (
    <DepositsContext.Provider value={{ deposits }}>
      {children}
    </DepositsContext.Provider>
  );
};

export const useDeposits = () => {
  const context = useContext(DepositsContext);
  if (!context) throw new Error('useDeposits must be used within a DepositsProvider');
  return context;
};
