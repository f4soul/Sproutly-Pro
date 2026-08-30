import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { GlobalToasts } from './components/ui/GlobalToasts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './config/db';

import { UnifiedDashboard } from './components/dashboard/UnifiedDashboard';
import { AssetsView } from './components/assets/AssetsView';
import { DepositHeatmap } from './components/deposits/DepositHeatmap';
import { Settings } from './components/settings/Settings';
import { IncomeTracker } from './components/income/IncomeTracker';
import { AppTour } from './components/ui/AppTour';

import { SecurityLock } from './components/auth/SecurityLock';
import { useAppData } from './context/AppDataContext';
import { auth } from './config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

import { SproutlyLogo } from './components/ui/SproutlyLogo';
import { LandingView } from './components/welcome/LandingView';
import { changelog } from './data/changelog';
import { AnimatePresence } from 'motion/react';

const SplashLoader = ({ theme }: { theme: 'light' | 'dark' }) => (
  <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
    <div className="relative flex items-center justify-center">
      {/* Animated pulsing glow */}
      <div className="absolute inset-0 bg-primary-500/20 dark:bg-primary-500/30 rounded-full blur-3xl animate-pulse scale-150" />
      
      {/* Logo container */}
      <div className="relative w-24 h-24 bg-white/80 dark:bg-slate-900/80 shadow-2xl border border-slate-200/50 dark:border-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-xl">
        <SproutlyLogo className="w-12 h-12 text-primary-500 drop-shadow-[0_0_12px_rgba(var(--rgb-primary),0.5)] animate-pulse" />
      </div>
    </div>
  </div>
);



import { AppDataProvider } from './context/AppDataContext';

export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <ErrorBoundary>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user] = useAuthState(auth);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasCheckedLock, setHasCheckedLock] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar'>('dashboard');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    return localStorage.getItem('hasOnboarded') !== 'true';
  });

  const { state, appSettings: _appSettings, deposits: _deposits, cashAssets: _cashAssets, investmentAssets: _investmentAssets, cryptoAssets: _cryptoAssets } = useAppData();
  const _taxSettings = useLiveQuery(() => db.taxYearSettings.toArray());
  
  const isLockActive = useMemo(() => {
    return !!(_appSettings && _appSettings.privacyLock?.enabled && (_appSettings.privacyLock?.pin || _appSettings.privacyLock?.pinHash));
  }, [_appSettings]);

  const checkLockStatus = () => {
    if (!_appSettings || !_appSettings.privacyLock?.enabled || !(_appSettings.privacyLock?.pin || _appSettings.privacyLock?.pinHash)) {
      setIsUnlocked(true);
      setHasCheckedLock(true);
      return;
    }

    const timeoutMinutes = _appSettings.privacyLock.timeoutMinutes ?? 0;
    const sessionUnlocked = sessionStorage.getItem('pinUnlocked') === 'true';

    // 1. If timeout is "Immediately" (0 minutes):
    if (timeoutMinutes === 0) {
      if (sessionUnlocked) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
      setHasCheckedLock(true);
      return;
    }

    // 2. If timeout is a specific interval (e.g., 1 min, 5 min):
    const lastActiveStr = localStorage.getItem('lockLastActive');
    if (lastActiveStr) {
      const elapsed = Date.now() - parseInt(lastActiveStr, 10);
      const isExpired = elapsed >= timeoutMinutes * 60 * 1000;

      if (isExpired) {
        setIsUnlocked(false);
        sessionStorage.removeItem('pinUnlocked');
      } else {
        // If we reach here, elapsed < timeout.
        // We only automatically grant access if the session was already unlocked, OR 
        // if we decide to share the unlock state across tabs (which this does by setting it true).
        // For maximum security, we shouldn't unlock a fresh tab if it was never unlocked.
        if (!sessionUnlocked) {
          setIsUnlocked(false);
        } else {
          setIsUnlocked(true);
        }
      }
    } else {
      setIsUnlocked(false);
      sessionStorage.removeItem('pinUnlocked');
    }
    setHasCheckedLock(true);
  };
  
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const theme = _appSettings?.theme || localTheme;

  useEffect(() => {
    if (_appSettings?.theme) {
      localStorage.setItem('theme', _appSettings.theme);
      setLocalTheme(_appSettings.theme);
    }
    
    if (_appSettings) {
      checkLockStatus();
    }
  }, [_appSettings]);

  // Set up visibility change, focus and inactive timers
  useEffect(() => {
    if (!isLockActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const timeoutMinutes = _appSettings?.privacyLock?.timeoutMinutes ?? 0;
        if (timeoutMinutes === 0) {
          // Immediately lock when tab goes hidden
          sessionStorage.removeItem('pinUnlocked');
          setIsUnlocked(false);
        } else {
          // Record background departure timestamp
          localStorage.setItem('lockLastActive', Date.now().toString());
        }
      } else if (document.visibilityState === 'visible') {
        // Return checking
        checkLockStatus();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkLockStatus);

    const interval = setInterval(() => {
      const timeoutMinutes = _appSettings?.privacyLock?.timeoutMinutes ?? 0;
      if (timeoutMinutes > 0 && isUnlocked) {
        const lastActiveStr = localStorage.getItem('lockLastActive');
        if (lastActiveStr) {
          const elapsed = Date.now() - parseInt(lastActiveStr, 10);
          if (elapsed >= timeoutMinutes * 60 * 1000) {
            setIsUnlocked(false);
            sessionStorage.removeItem('pinUnlocked');
          }
        }
      }
    }, 4000); // Check every 4 seconds

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkLockStatus);
      clearInterval(interval);
    };
  }, [isLockActive, isUnlocked, _appSettings]);

  // Track user activity to update last active timestamp
  useEffect(() => {
    // ONLY track activity if the user is currently unlocked, or lock is not active at all.
    // Otherwise, moving the mouse on the lock screen will reset the timer and bypass the lock!
    if (isLockActive && !isUnlocked) return;

    let timeout: NodeJS.Timeout;
    const trackActivity = () => {
      // Check if we ALREADY expired before updating the timestamp!
      // This prevents a race condition on iOS Safari resumed from sleep where a tap updates the timestamp
      // before the interval or visibility listener has a chance to lock the app.
      const timeoutMinutes = _appSettings?.privacyLock?.timeoutMinutes ?? 0;
      if (timeoutMinutes > 0 && isUnlocked) {
        const lastActiveStr = localStorage.getItem('lockLastActive');
        if (lastActiveStr) {
          const elapsed = Date.now() - parseInt(lastActiveStr, 10);
          if (elapsed >= timeoutMinutes * 60 * 1000) {
            setIsUnlocked(false);
            sessionStorage.removeItem('pinUnlocked');
            return; // STOP! We expired! Do not update the timer.
          }
        }
      }

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

    // We use capture phase for immediate interception if needed, though bubble is fine.
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
  }, [isLockActive, isUnlocked, _appSettings]);

  // Sync theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Dynamically update theme-color for PWA & Safari headers
    let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#020617' : '#f8fafc');

    // Remove media-query based meta tags to prevent system conflicts when manually switching
    document.querySelectorAll('meta[name="theme-color"][media]').forEach(el => el.remove());
  }, [theme]);

  const deposits = _deposits || [];
  const cashAssets = _cashAssets || [];
  const taxSettings = _taxSettings || [];
  const appSettings = _appSettings;

  const isLoading = _appSettings === undefined || _deposits === undefined || _taxSettings === undefined || _cashAssets === undefined;

  const selectedYear = state?.activeYear || new Date().getFullYear();

  const handleNavigation = (newTab: 'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar') => {
    if (activeTab === newTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Surgical fix: Hide floating panels instantly to prevent 1-frame micro-delay during AnimatePresence exit
    const floatingEls = document.querySelectorAll('.floating-analytics-bottom, .floating-fab-bottom-with-analytics, .floating-fab-bottom-no-analytics');
    floatingEls.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.transition = 'none';
      }
    });

    setActiveTab(newTab);
  };

  const handleStart = () => {
    localStorage.setItem('hasOnboarded', 'true');
    localStorage.setItem('last_seen_version', changelog[0].version);
    setIsFirstVisit(false);
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

  if (isLoading || (isLockActive && !hasCheckedLock)) {
    return <SplashLoader theme={theme} />;
  }

  return (
    <>
      {isLockActive && !isUnlocked && appSettings?.privacyLock && (
        <SecurityLock
          pin={appSettings.privacyLock.pin}
          pinHash={appSettings.privacyLock.pinHash}
          useBiometrics={appSettings.privacyLock.useBiometrics}
          credentialId={appSettings.privacyLock.credentialId}
          credentialIds={appSettings.privacyLock.credentialIds}
          onUnlock={async (migratedPinHash?: string) => {
            sessionStorage.setItem('pinUnlocked', 'true');
            // Refresh activity time when unlocking
            localStorage.setItem('lockLastActive', Date.now().toString());
            setIsUnlocked(true);
            
            // Quietly migrate if we got a new hash from legacy pin
            if (migratedPinHash && appSettings) {
              await db.appSettings.put({
                ...appSettings,
                privacyLock: {
                  ...appSettings.privacyLock,
                  pinHash: migratedPinHash,
                  pin: null
                },
                updatedAt: Date.now()
              });
            }
          }}
        />
      )}
      <div className={isLockActive && !isUnlocked ? 'hidden' : 'contents'}>
        <AnimatePresence mode="wait">
          {isFirstVisit ? (
            <LandingView key="landing" onStart={handleStart} />
          ) : (
            <Layout key="main-layout" activeTab={activeTab} onTabChange={handleNavigation} theme={theme} isLocked={isLockActive && !isUnlocked}>
              
                {activeTab === 'dashboard' && (
                  <UnifiedDashboard 
                    deposits={deposits} 
                    cashAssets={cashAssets}
                    investmentAssets={_investmentAssets}
                    cryptoAssets={_cryptoAssets}
                    taxSettings={taxSettings} 
                    appSettings={appSettings || { id: 'main', theme: 'light', defaultNdflRate: 13, defaultLimit2025: 210000 }} 
                    isPrivate={isPrivate}
                    setIsPrivate={setIsPrivate}
                  />
                )}
                {activeTab === 'deposits' && (
                  <AssetsView 
                    deposits={deposits} 
                    cashAssets={cashAssets}
                    investmentAssets={_investmentAssets || []}
                    cryptoAssets={_cryptoAssets || []}
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
              
              <GlobalToasts />
              <>
                <AppTour activeTab={activeTab} isLocked={isLockActive && !isUnlocked} />
                </>
            </Layout>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}


