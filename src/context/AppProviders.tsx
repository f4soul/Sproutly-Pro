import React, { ReactNode } from 'react';
import { AuthSyncProvider } from './AuthSyncContext';
import { SettingsProvider } from './SettingsContext';
import { DepositsProvider } from './DepositsContext';
import { AssetsProvider } from './AssetsContext';
import { IncomeProvider } from './IncomeContext';

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <AuthSyncProvider>
      <SettingsProvider>
        <DepositsProvider>
          <AssetsProvider>
            <IncomeProvider>
              {children}
            </IncomeProvider>
          </AssetsProvider>
        </DepositsProvider>
      </SettingsProvider>
    </AuthSyncProvider>
  );
};
