import React, { useState, useEffect, useMemo } from 'react';
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
  
  const isLockedRequired = useMemo(() => {
    if (!_appSettings || !_appSettings.privacyLock?.enabled) {
      return false;
    }
    const sessionUnlocked = sessionStorage.getItem('pinUnlocked') === 'true';
    if (sessionUnlocked) return false;

    const timeoutMinutes = _appSettings.privacyLock.timeoutMinutes ?? 0;
    if (timeoutMinutes > 0) {
      const lastActiveStr = localStorage.getItem('lockLastActive');
      if (lastActiveStr) {
        const elapsed = Date.now() - parseInt(lastActiveStr, 10);
        if (elapsed < timeoutMinutes * 60 * 1000) {
          return false;
        }
      }
    }
    return true;
  }, [_appSettings]);
  
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const theme = _appSettings?.theme || localTheme;

  useEffect(() => {
    if (_appSettings?.theme) {
      localStorage.setItem('theme', _appSettings.theme);
      setLocalTheme(_appSettings.theme);
    }
    
    // Auto-unlock if not enabled, or if within timeout
    if (_appSettings) {
      if (!_appSettings.privacyLock?.enabled) {
        setIsUnlocked(true);
      } else {
        const sessionUnlocked = sessionStorage.getItem('pinUnlocked') === 'true';
        const timeoutMinutes = _appSettings.privacyLock.timeoutMinutes ?? 0;
        
        let isWithinTimeout = false;
        if (timeoutMinutes > 0) {
           const lastActiveStr = localStorage.getItem('lockLastActive');
           if (lastActiveStr) {
             const elapsed = Date.now() - parseInt(lastActiveStr, 10);
             if (elapsed < timeoutMinutes * 60 * 1000) {
               isWithinTimeout = true;
             }
           }
        }

        if (sessionUnlocked || isWithinTimeout) {
          setIsUnlocked(true);
          sessionStorage.setItem('pinUnlocked', 'true');
        } else {
          setIsUnlocked(false);
          sessionStorage.removeItem('pinUnlocked');
        }
      }
    }
  }, [_appSettings]);

  // Track user activity to update last active timestamp
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const trackActivity = () => {
      // Throttle write to localStorage
      if (!timeout) {
        timeout = setTimeout(() => {
          localStorage.setItem('lockLastActive', Date.now().toString());
          timeout = undefined as any;
        }, 2000);
      }
    };

    // Initial timestamp
    localStorage.setItem('lockLastActive', Date.now().toString());

    window.addEventListener('mousemove', trackActivity);
    window.addEventListener('touchstart', trackActivity);
    window.addEventListener('keydown', trackActivity);
    window.addEventListener('click', trackActivity);

    return () => {
      window.removeEventListener('mousemove', trackActivity);
      window.removeEventListener('touchstart', trackActivity);
      window.removeEventListener('keydown', trackActivity);
      window.removeEventListener('click', trackActivity);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

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
      {isLockedRequired && !isUnlocked && (
        <SecurityLock
          pin={appSettings.privacyLock.pin || ''}
          useBiometrics={appSettings.privacyLock.useBiometrics}
          credentialId={appSettings.privacyLock.credentialId}
          credentialIds={appSettings.privacyLock.credentialIds}
          onUnlock={() => {
            sessionStorage.setItem('pinUnlocked', 'true');
            // Refresh activity time when unlocking
            localStorage.setItem('lockLastActive', Date.now().toString());
            setIsUnlocked(true);
          }}
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
              <DepositHeatmap deposits={deposits} year={selectedYear} isPrivate={isPrivate} />
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


