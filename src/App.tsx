import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { UnifiedDashboard } from './components/dashboard/UnifiedDashboard';
import { DepositList } from './components/deposits/DepositList';
import { Settings } from './components/Settings';
import { IncomeTracker } from './components/IncomeTracker';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './db';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'ndfl' | 'settings'>('dashboard');
  const [isPrivate, setIsPrivate] = useState(false);
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const theme = appSettings?.theme || 'light';
  const deposits = useLiveQuery(() => db.deposits.toArray()) || [];
  const taxSettings = useLiveQuery(() => db.taxYearSettings.toArray()) || [];
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<'dashboard' | 'deposits' | 'ndfl' | 'settings'>;
      setActiveTab(customEvent.detail);
    };
    window.addEventListener('app:change-tab', handleTabChange as EventListener);

    return () => {
      window.removeEventListener('app:change-tab', handleTabChange as EventListener);
    };
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} theme={theme}>
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
      {activeTab === 'ndfl' && (
        <IncomeTracker isPrivate={isPrivate} setIsPrivate={setIsPrivate} />
      )}
      {activeTab === 'settings' && (
        <Settings taxSettings={taxSettings} appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} />
      )}
    </Layout>
  );
}


