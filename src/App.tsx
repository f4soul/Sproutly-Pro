import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { DepositsDashboard } from './components/DepositsDashboard';
import { OverviewDashboard } from './components/OverviewDashboard';
import { DepositList } from './components/deposits/DepositList';
import { Settings } from './components/Settings';
import { IncomeTracker } from './components/IncomeTracker';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'dashboard' | 'deposits' | 'ndfl' | 'settings'>('overview');
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const theme = appSettings?.theme || 'light';
  const [deposits, setDeposits] = useState<any[]>([]);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const loadData = async () => {
      const deps = await db.deposits.toArray();
      setDeposits(deps);
      const ts = await db.taxYearSettings.toArray();
      setTaxSettings(ts);
    };
    loadData();
    
    const handleSync = () => loadData();
    window.addEventListener('app:sync', handleSync);
    return () => window.removeEventListener('app:sync', handleSync);
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} theme={theme}>
      {activeTab === 'overview' && (
        <OverviewDashboard 
          deposits={deposits} 
          taxSettings={taxSettings} 
          appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} 
        />
      )}
      {activeTab === 'dashboard' && (
        <DepositsDashboard 
          deposits={deposits} 
          taxSettings={taxSettings} 
          selectedYear={selectedYear} 
          onYearChange={setSelectedYear} 
          appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} 
        />
      )}
      {activeTab === 'deposits' && (
        <DepositList 
          deposits={deposits} 
          selectedYear={selectedYear} 
        />
      )}
      {activeTab === 'ndfl' && (
        <IncomeTracker />
      )}
      {activeTab === 'settings' && (
        <Settings taxSettings={taxSettings} appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} />
      )}
    </Layout>
  );
}


