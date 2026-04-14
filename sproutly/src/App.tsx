import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './db';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DepositList } from './components/deposits/DepositList';
import { Settings } from './components/Settings';
import { DevTools } from './components/DevTools';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'settings'>('dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isInitialized, setIsInitialized] = useState(false);

  const deposits = useLiveQuery(() => db.deposits.toArray());
  const taxSettings = useLiveQuery(() => db.taxYearSettings.toArray());
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));

  useEffect(() => {
    initDB().then(() => setIsInitialized(true));
  }, []);

  useEffect(() => {
    if (appSettings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings?.theme]);

  if (!isInitialized || !appSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        theme={appSettings.theme}
      >
        {activeTab === 'dashboard' && (
          <Dashboard 
            deposits={deposits || []} 
            taxSettings={taxSettings || []}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            appSettings={appSettings}
          />
        )}
        {activeTab === 'deposits' && (
          <DepositList 
            deposits={deposits || []} 
            selectedYear={selectedYear}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            taxSettings={taxSettings || []}
            appSettings={appSettings}
          />
        )}
      </Layout>
      <DevTools />
    </>
  );
}
