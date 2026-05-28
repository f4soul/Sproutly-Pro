import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { GlobalToasts } from './components/ui/GlobalToasts';
import { DevTools } from './components/devtools/DevTools';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './config/db';

import { UnifiedDashboard } from './components/dashboard/UnifiedDashboard';
import { DepositList } from './components/deposits/DepositList';
import { DepositHeatmap } from './components/deposits/DepositHeatmap';
import { Settings } from './components/settings/Settings';
import { IncomeTracker } from './components/income/IncomeTracker';
import { SecurityLock } from './components/auth/SecurityLock';
import { useAppState } from './hooks/useAppState';

const Fallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"/>
      <div className="text-sm font-medium text-slate-400">Загрузка модуля...</div>
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar'>('dashboard');
  const [isPrivate, setIsPrivate] = useState(false);
  const _appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const _deposits = useLiveQuery(() => db.deposits.toArray());
  const _taxSettings = useLiveQuery(() => db.taxYearSettings.toArray());
  
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const theme = _appSettings?.theme || localTheme;

  useEffect(() => {
    if (_appSettings?.theme) {
      localStorage.setItem('theme', _appSettings.theme);
      setLocalTheme(_appSettings.theme);
    }
    // Auto-unlock if not enabled
    if (_appSettings && !_appSettings.privacyLock?.enabled) {
      setIsUnlocked(true);
    }
  }, [_appSettings]);

  // Sync theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const deposits = _deposits || [];
  const taxSettings = _taxSettings || [];
  const appSettings = _appSettings;

  const isLoading = _appSettings === undefined || _deposits === undefined || _taxSettings === undefined;

  const { state } = useAppState();
  const selectedYear = state?.activeYear || new Date().getFullYear();

  const handleNavigation = (newTab: 'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar') => {
    if (activeTab === newTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(newTab);
    }
  };

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar'>;
      handleNavigation(customEvent.detail);
    };
    window.addEventListener('app:change-tab', handleTabChange as EventListener);

    return () => {
      window.removeEventListener('app:change-tab', handleTabChange as EventListener);
    };
  }, []);

  return (
    <>
      {appSettings?.privacyLock?.enabled && !isUnlocked && (
        <SecurityLock
          pin={appSettings.privacyLock.pin || ''}
          useBiometrics={appSettings.privacyLock.useBiometrics}
          credentialId={appSettings.privacyLock.credentialId}
          onUnlock={() => setIsUnlocked(true)}
        />
      )}
      <Layout activeTab={activeTab} onTabChange={handleNavigation} theme={theme}>
        {isLoading ? (
          <Fallback />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <UnifiedDashboard 
                deposits={deposits} 
                taxSettings={taxSettings} 
                appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} 
                isPrivate={isPrivate}
                setIsPrivate={setIsPrivate}
              />
            )}
            {activeTab === 'deposits' && (
              <DepositList 
                deposits={deposits} 
                selectedYear={selectedYear} 
                isPrivate={isPrivate}
              />
            )}
            {activeTab === 'calendar' && (
              <DepositHeatmap deposits={deposits} year={selectedYear} />
            )}
            {activeTab === 'ndfl' && (
              <IncomeTracker isPrivate={isPrivate} setIsPrivate={setIsPrivate} />
            )}
            {activeTab === 'settings' && (
              <Settings taxSettings={taxSettings} appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} />
            )}
          </>
        )}
        <DevTools />
        <GlobalToasts />
      </Layout>
    </>
  );
}


