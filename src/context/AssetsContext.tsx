import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../config/db';
import { CashAsset, InvestmentAsset, CryptoAsset } from '../types';

interface AssetsContextType {
  cashAssets: CashAsset[];
  investmentAssets: InvestmentAsset[];
  cryptoAssets: CryptoAsset[];
}

const AssetsContext = createContext<AssetsContextType | null>(null);

const EMPTY_ARRAY: never[] = [];

export const AssetsProvider = ({ children }: { children: ReactNode }) => {
  const cashData = useLiveQuery(() => db.cashAssets.toArray());
  const investData = useLiveQuery(() => db.investmentAssets.toArray());
  const cryptoData = useLiveQuery(() => db.cryptoAssets.toArray());

  const cashAssets = useMemo(() => cashData ?? EMPTY_ARRAY, [cashData]);
  const investmentAssets = useMemo(() => investData ?? EMPTY_ARRAY, [investData]);
  const cryptoAssets = useMemo(() => cryptoData ?? EMPTY_ARRAY, [cryptoData]);

  return (
    <AssetsContext.Provider value={{ cashAssets, investmentAssets, cryptoAssets }}>
      {children}
    </AssetsContext.Provider>
  );
};

export const useAssets = () => {
  const context = useContext(AssetsContext);
  if (!context) throw new Error('useAssets must be used within a AssetsProvider');
  return context;
};
