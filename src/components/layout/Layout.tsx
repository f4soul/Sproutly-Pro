import React, { useState, useEffect, Fragment } from 'react';
import { LayoutDashboard, ListOrdered, Settings as SettingsIcon, Moon, Sun, User, LogOut, Wrench, Landmark, TrendingUp, CalendarDays, Menu as MenuIcon, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { auth, signInWithGoogle, logout } from '../../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, syncWithFirebase } from '../../config/db';
import { showToast } from '../../lib/toast';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SproutlyLogo } from '../ui/SproutlyLogo';
import { ReleaseNotesDialog } from '../ui/ReleaseNotesDialog';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar';
  onTabChange: (tab: 'dashboard' | 'deposits' | 'ndfl' | 'settings' | 'calendar') => void;
  theme: 'light' | 'dark';
}

function AnimatedCloudSync({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Cloud outline */}
      <path d="M20.996 15.251C21.5072 14.5894 21.824 13.7984 21.9108 12.9668C21.9976 12.1353 21.851 11.2959 21.4875 10.543C21.124 9.79006 20.5578 9.1533 19.8526 8.70412C19.1474 8.25495 18.331 8.01113 17.495 8H15.705C15.4205 7.04873 14.937 6.16887 14.2864 5.41882C13.6358 4.66877 12.8331 4.06571 11.9316 3.64967C11.03 3.23363 10.0503 3.01414 9.05747 3.00577C8.06461 2.9974 7.08134 3.20034 6.17293 3.60111C5.26452 4.00189 4.45176 4.59133 3.78862 5.3303C3.12548 6.06927 2.62713 6.94086 2.32666 7.88719C2.02619 8.83353 1.93048 9.83296 2.04589 10.8191C2.16129 11.8053 2.48516 12.7556 2.996 13.607" />
      {/* Sync arrows */}
      <g className="animate-spin-slow" style={{ transformOrigin: "12px 17px" }}>
        <path d="M7.465 19L9 20.605C9.57404 21.1567 10.2715 21.5633 11.0344 21.7911C11.7973 22.0188 12.6036 22.0611 13.3861 21.9144C14.1687 21.7676 14.9049 21.4362 15.5334 20.9475C16.162 20.4589 16.6648 19.8272 17 19.105" />
        <path d="M7.465 23V19H11.465" />
        <path d="M16.535 11V15H12.535" />
        <path d="M16.535 15L15 13.395C14.426 12.8433 13.7285 12.4367 12.9656 12.2089C12.2027 11.9812 11.3964 11.9389 10.6139 12.0856C9.83133 12.2323 9.09515 12.5638 8.46657 13.0525C7.83799 13.5411 7.33519 14.1728 7 14.895" />
      </g>
    </svg>
  );
}

export function Layout({ children, activeTab, onTabChange, theme }: LayoutProps) {
  const [user] = useAuthState(auth);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const isAdmin = user?.email === 'filimlive@gmail.com';
  const [isMobileHeaderHidden, setIsMobileHeaderHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 100) {
      setIsMobileHeaderHidden(true);
    } else {
      setIsMobileHeaderHidden(false);
    }
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let autoClearId: NodeJS.Timeout;

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: 'syncing' | 'success' | 'error'; error?: any }>;
      setSyncStatus(customEvent.detail.status);
      
      clearTimeout(timeoutId);
      clearTimeout(autoClearId);
      
      if (customEvent.detail.status === 'success') {
        timeoutId = setTimeout(() => {
          setSyncStatus('idle');
        }, 1500);
      } else if (customEvent.detail.status === 'error') {
        const error = customEvent.detail.error;
        let errMsg = 'Ошибка при синхронизации данных';
        
        if (error) {
          const rawMessage = error instanceof Error ? error.message : String(error);
          try {
            if (rawMessage.startsWith('{') && rawMessage.endsWith('}')) {
              const parsed = JSON.parse(rawMessage);
              const errText = parsed.error || '';
              if (errText.includes('permission') || errText.includes('insufficient')) {
                errMsg = 'Ошибка синхронизации: недостаточный уровень доступа (проверьте авторизацию)';
              } else {
                errMsg = `Ошибка синхронизации: ${errText}`;
              }
            } else if (rawMessage.includes('permission') || rawMessage.includes('insufficient')) {
              errMsg = 'Ошибка синхронизации: недостаточный уровень доступа или сессия истекла';
            } else {
              errMsg = `Ошибка синхронизации: ${rawMessage}`;
            }
          } catch (err) {
            errMsg = `Ошибка синхронизации: ${rawMessage}`;
          }
        }
        
        showToast(errMsg, 'error', { duration: 6000 });
      } else if (customEvent.detail.status === 'syncing') {
        // useAppState handles this
      }
    };

    window.addEventListener('app:sync', handleSync);
    return () => {
      window.removeEventListener('app:sync', handleSync);
      clearTimeout(timeoutId);
      clearTimeout(autoClearId);
    };
  }, []);

  const handleRetrySync = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncStatus === 'error') {
      showToast('Запуск принудительной синхронизации...', 'info');
      setSyncStatus('syncing');
      syncWithFirebase().catch(err => {
        console.error('Manual retry sync failed:', err);
      });
    }
  };

  const toggleTheme = async () => {
    await db.appSettings.update('main', { theme: theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row transition-colors duration-500", 
      theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-950"
    )}>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-68 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-5 lg:p-8 fixed h-full z-40 transition-all duration-300 overflow-y-auto scrollbar-hide shadow-[8px_0_32px_rgba(0,0,0,0.02)] dark:shadow-[8px_0_48px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-6 mb-8 lg:mb-12">
          <div className="flex items-center gap-2.5 group cursor-pointer px-0" onClick={() => onTabChange('dashboard')}>
            <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-primary-500/10 transition-all group-hover:scale-105 active:scale-95 mx-0 shrink-0">
              <SproutlyLogo className="w-6 h-6 text-primary-500 dark:text-primary-400 drop-shadow-[0_0_8px_rgba(var(--rgb-primary),0.4)]" />
            </div>
            <span className="block font-black text-lg tracking-tighter text-slate-950 dark:text-white font-mono uppercase whitespace-nowrap">
              SPROUTLY<span className="inline-block w-1 h-1 bg-primary-500 rounded-full animate-pulse mx-0.5" />PRO
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => onTabChange('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5 stroke-[1.5px]" />}
            label="Дашборд"
          />
          <NavItem 
            active={activeTab === 'deposits'} 
            onClick={() => onTabChange('deposits')}
            icon={<Landmark className="w-5 h-5 stroke-[1.5px]" />}
            label="Активы"
          />
          <NavItem 
            active={activeTab === 'calendar'} 
            onClick={() => onTabChange('calendar')}
            icon={<CalendarDays className="w-5 h-5 stroke-[1.5px]" />}
            label="График"
          />
          <NavItem 
            active={activeTab === 'ndfl'} 
            onClick={() => onTabChange('ndfl')}
            icon={<TrendingUp className="w-5 h-5 stroke-[1.5px]" />}
            label="Доходы"
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => onTabChange('settings')}
            icon={<SettingsIcon className="w-5 h-5 stroke-[1.5px]" />}
            label="Настройки"
          />
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          {/* New Sync Indicator Desktop */}
          <motion.div
            initial={false}
            animate={{ 
              opacity: syncStatus !== 'idle' ? 1 : 0, 
              height: syncStatus !== 'idle' ? 'auto' : 0, 
              y: syncStatus !== 'idle' ? 0 : 10,
              pointerEvents: syncStatus !== 'idle' ? 'auto' : 'none'
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div 
              onClick={handleRetrySync}
              className={cn(
                "flex items-center justify-center gap-2 md:gap-0 px-3 py-2 md:px-2 md:py-2 md:w-9 md:h-9 md:rounded-full rounded-2xl text-[11px] font-bold border transition-all duration-500 relative",
                syncStatus === 'error' ? "cursor-pointer bg-rose-50/80 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20 hover:bg-rose-100/90 dark:hover:bg-rose-500/20 active:scale-95" :
                syncStatus === 'syncing' ? "bg-primary-50/80 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200/50 dark:border-primary-500/20" : 
                    "bg-primary-50/80 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200/50 dark:border-primary-500/20"
              )}
              title={syncStatus === 'error' ? "Ошибка синхронизации. Нажмите для повторной попытки." : undefined}
            >
              <div className="relative w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center shrink-0">
                <AnimatePresence mode="popLayout">
                  {syncStatus === 'syncing' && (
                    <motion.div key="syncing" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                      <AnimatedCloudSync className="w-full h-full" />
                    </motion.div>
                  )}
                  {syncStatus === 'success' && (
                    <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="w-full h-full" />
                    </motion.div>
                  )}
                  {syncStatus === 'error' && (
                    <motion.div key="error" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                      <AlertTriangle className="w-full h-full" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="md:hidden">
                {syncStatus === 'syncing' ? 'Синхронизация...' : 
                 syncStatus === 'success' ? 'Синхронизировано' : 'Ошибка. Повторить?'}
              </span>
              {syncStatus === 'error' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSyncStatus('idle');
                  }}
                  className="md:hidden ml-auto p-0.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-500/30 active:scale-90 transition-all text-rose-500 dark:text-rose-400 shrink-0 outline-none border-none cursor-pointer"
                >
                  <X className="w-3 h-3 stroke-[2.5px]" />
                </button>
              )}
            </div>
          </motion.div>

          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-1.5 gap-1 shadow-sm">
            {user ? (
              <Menu as="div" className="relative flex-1">
                <Menu.Button className="w-full h-10 flex items-center justify-between px-2 bg-transparent hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer outline-none group">
                    <div className="relative shrink-0 flex items-center">
                      <img src={user.photoURL || undefined} alt="" className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 ml-3 text-left justify-center">
                      <div className="truncate text-[12px] font-black leading-tight text-slate-950 dark:text-white">
                        {user.displayName ? (user.displayName.split(' ').length > 1 ? `${user.displayName.split(' ')[0][0].toUpperCase()}. ${user.displayName.split(' ').slice(1).join(' ')}` : user.displayName) : user.email?.split('@')[0]}
                      </div>
                      {user.displayName && (
                        <div className="text-[8px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95 translate-y-2"
                  enterTo="transform opacity-100 scale-100 translate-y-0"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100 translate-y-0"
                  leaveTo="transform opacity-0 scale-95 translate-y-2"
                >
                  <Menu.Items className="absolute bottom-full mb-2 left-0 min-w-[220px] w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden outline-none p-1.5 flex flex-col gap-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setTimeout(() => window.dispatchEvent(new Event('app:show_release_notes')), 150); 
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                          active ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500" : "text-slate-600 dark:text-slate-300"
                        )}
                      >
                        <Sparkles className="w-5 h-5 shrink-0" />
                        <span>Что нового?</span>
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                          active ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600" : "text-rose-500"
                        )}
                      >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span>Выйти из аккаунта</span>
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="apple-button flex-1 flex items-center justify-center gap-3 px-6 h-10 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/20 rounded-xl"
            >
              <User className="w-4 h-4 stroke-[2px]" />
              Войти
            </button>
          )}

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          <button 
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-slate-500 dark:text-slate-400 transition-all hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 group shrink-0"
            title={theme === 'light' ? 'Включить темную тему' : 'Включить светлую тему'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5 stroke-[1.5px]" /> : <Sun className="w-5 h-5 stroke-[1.5px]" />}
          </button>
        </div>
        </div>
      </aside>

      {/* Header for Mobile */}
      <div className="md:hidden">
        {/* Mobile Sync Indicator */}
        <motion.div
          initial={false}
          animate={{ 
            y: syncStatus !== 'idle' ? 0 : -20, 
            opacity: syncStatus !== 'idle' ? 1 : 0, 
            scale: syncStatus !== 'idle' ? 1 : 0.95,
            pointerEvents: syncStatus !== 'idle' ? 'auto' : 'none'
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed top-[calc(5rem+12px)] left-1/2 -translate-x-1/2 z-[60]"
        >
          <div 
            onClick={handleRetrySync}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-black shadow-lg backdrop-blur-xl border transition-all duration-500 relative",
              syncStatus === 'error' ? "cursor-pointer bg-rose-500/90 text-white border-rose-400/50 shadow-rose-500/20 hover:bg-rose-600/95 active:scale-95 animate-pulse-once" : 
              syncStatus === 'syncing' ? "bg-primary-500/90 text-white border-primary-400/50 shadow-primary-500/20" : 
                  "bg-primary-500/90 text-white border-primary-400/50 shadow-primary-500/20"
            )}
          >
            <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
              <AnimatePresence mode="popLayout">
                {syncStatus === 'syncing' && (
                  <motion.div key="syncing" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                    <AnimatedCloudSync className="w-full h-full" />
                  </motion.div>
                )}
                {syncStatus === 'success' && (
                  <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="w-full h-full" />
                  </motion.div>
                )}
                {syncStatus === 'error' && (
                  <motion.div key="error" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                    <AlertTriangle className="w-full h-full" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span>
              {syncStatus === 'syncing' ? 'Синхронизация...' : 
               syncStatus === 'success' ? 'Синхронизировано' : 'Ошибка. Повторить?'}
            </span>
            {syncStatus === 'error' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSyncStatus('idle');
                }}
                className="ml-1.5 p-0.5 rounded-full hover:bg-rose-600 active:scale-90 transition-all text-white/80 hover:text-white shrink-0 outline-none border-none cursor-pointer"
              >
                <X className="w-3 h-3 stroke-[2.5px]" />
              </button>
            )}
          </div>
        </motion.div>

        <motion.header 
          initial={false}
          animate={{ y: isMobileHeaderHidden ? -100 : 0, opacity: isMobileHeaderHidden ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-4 left-4 right-4 h-16 px-4 flex items-center justify-between bg-white dark:bg-slate-950 z-50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-2 active:scale-95 transition-transform cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-primary-500/10 shrink-0">
              <SproutlyLogo className="w-6 h-6 text-primary-500 dark:text-primary-400 drop-shadow-[0_0_8px_rgba(var(--rgb-primary),0.4)]" />
            </div>
            <span className="font-black text-lg tracking-tighter text-slate-950 dark:text-white font-mono uppercase whitespace-nowrap">
              SPROUTLY<span className="inline-block w-1 h-1 bg-primary-500 rounded-full animate-pulse mx-0.5" />PRO
            </span>
          </div>
          
          <div className="flex items-center shrink-0">
            <Menu as="div" className="relative">
              {({ open }) => (
                <>
              <Menu.Button className="w-10 h-10 flex items-center justify-center relative rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-90 shadow-sm shrink-0 outline-none">
                <div className="w-5 h-5 flex flex-col justify-center items-center relative">
                  <span className={cn("absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300", open ? "rotate-45" : "-translate-y-1")} />
                  <span className={cn("absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300", open ? "-rotate-45" : "translate-y-1")} />
                </div>
              </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute right-0 mt-2 min-w-[240px] w-max bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden outline-none p-1.5 flex flex-col gap-1">
                {user ? (
                  <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 dark:border-slate-800/50 mb-1.5">
                    <img src={user.photoURL || undefined} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm" referrerPolicy="no-referrer" />
                    <div className="flex flex-col min-w-0">
                      <div className="truncate text-[14px] font-black leading-tight text-slate-950 dark:text-white">
                        {user.displayName || user.email?.split('@')[0]}
                      </div>
                      {user.displayName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-[1px]">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-1 py-1 mb-1.5 border-b border-slate-100 dark:border-slate-800/50">
                    <button 
                      onClick={() => { signInWithGoogle(); }}
                      className="w-full h-10 flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                    >
                      <User className="w-4 h-4 stroke-[2px]" />
                      Войти
                    </button>
                  </div>
                )}
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { e.preventDefault(); toggleTheme(); }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                        active ? "bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
                        <span>{theme === 'light' ? 'Темная тема' : 'Светлая тема'}</span>
                      </div>
                    </button>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { 
                        e.preventDefault(); 
                        setTimeout(() => window.dispatchEvent(new Event('app:show_release_notes')), 150); 
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                        active ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500" : "text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 shrink-0" />
                        <span>Что нового?</span>
                      </div>
                    </button>
                  )}
                </Menu.Item>
                
                {user && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => { e.preventDefault(); setShowLogoutConfirm(true); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap mt-1 border-t border-slate-100 dark:border-slate-800/50 pt-2.5",
                          active ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600" : "text-rose-500"
                        )}
                      >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span>Выйти из аккаунта</span>
                      </button>
                    )}
                  </Menu.Item>
                )}
              </Menu.Items>
            </Transition>
              </>
            )}
          </Menu>
        </div>
      </motion.header>
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 max-w-sm mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-around p-2 z-50 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} icon={<LayoutDashboard className="w-5 h-5 stroke-[1.5px]" />} label="Обзор" />
        <MobileNavItem active={activeTab === 'deposits'} onClick={() => onTabChange('deposits')} icon={<Landmark className="w-5 h-5 stroke-[1.5px]" />} label="Активы" />
        <MobileNavItem active={activeTab === 'calendar'} onClick={() => onTabChange('calendar')} icon={<CalendarDays className="w-5 h-5 stroke-[1.5px]" />} label="График" />
        <MobileNavItem active={activeTab === 'ndfl'} onClick={() => onTabChange('ndfl')} icon={<TrendingUp className="w-5 h-5 stroke-[1.5px]" />} label="Доходы" />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<SettingsIcon className="w-5 h-5 stroke-[1.5px]" />} label="Опции" />
      </nav>

      <main className={cn(
        "flex-1 md:ml-68 flex flex-col transition-all duration-300 min-w-0",
        "px-2 sm:px-4 md:px-6 lg:px-8",
        activeTab === 'calendar' 
          ? "pt-24 md:pt-6 lg:pt-8 pb-[104px] md:pb-8 lg:pb-12 min-h-[100dvh]" 
          : "pt-24 md:pt-6 lg:pt-8 pb-32 md:pb-8 min-h-[100dvh]"
      )}>
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "flex-1 w-full min-w-0 flex flex-col h-full mx-auto",
              activeTab === 'calendar' ? "max-w-[100vw] xl:max-w-screen-2xl" : "max-w-6xl",
              activeTab !== 'calendar' && "space-y-8 md:space-y-12"
            )}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Logout Confirmation Dialog */}
      <Transition appear show={showLogoutConfirm} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setShowLogoutConfirm(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300 transform"
                enterFrom="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200 transform"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-t-[32px] sm:rounded-[24px] bg-white dark:bg-slate-950 p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                      <LogOut className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">
                        Выход
                      </Dialog.Title>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Вы уверены, что хотите выйти из аккаунта?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={async () => {
                        setShowLogoutConfirm(false);
                        await logout();
                        const { db: localDb } = await import('../../config/db');
                        await localDb.delete();
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 cursor-pointer"
                    >
                      Выйти
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ReleaseNotesDialog />
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm w-full group cursor-pointer border relative overflow-hidden",
        active 
          ? "bg-slate-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm border-slate-200 dark:border-primary-500/20" 
          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200 border-transparent dark:border-transparent"
      )}
    >
      {active && (
         <motion.div layoutId="activeNavTabBg" className="absolute inset-0 bg-white dark:bg-primary-500/5" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
      )}
      <div className="flex items-center gap-3 mx-0 relative z-10">
        <div className={cn(
          "transition-transform duration-300",
          active ? "scale-110 text-primary-600 dark:text-primary-400" : "group-hover:scale-110"
        )}>
          {icon}
        </div>
        <span className="block">{label}</span>
      </div>
      {active && (
         <motion.div layoutId="activeNavTab" className="absolute left-0 w-1.5 h-6 bg-primary-500 rounded-r-full z-10" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center justify-center relative w-16 h-14 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden z-10", 
      active ? "text-primary-600 dark:text-primary-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
    )}>
      {active && (
         <motion.div layoutId="activeMobileNavBg" className="absolute inset-0 bg-slate-50 dark:bg-primary-500/10 border border-slate-200 dark:border-primary-500/20 rounded-xl" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
      )}
      <div className={cn(
        "relative z-10 flex flex-col items-center gap-1 transition-transform duration-300",
        active ? "scale-105" : ""
      )}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
    </button>
  );
}
