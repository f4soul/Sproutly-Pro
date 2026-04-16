import React, { useState, useEffect, Fragment } from 'react';
import { LayoutDashboard, ListOrdered, Settings as SettingsIcon, Sprout, Moon, Sun, User, LogOut, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, signIn, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { useLiveQuery } from 'dexie-react-hooks';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'deposits' | 'settings';
  onTabChange: (tab: 'dashboard' | 'deposits' | 'settings') => void;
  theme: 'light' | 'dark';
}

export function Layout({ children, activeTab, onTabChange, theme }: LayoutProps) {
  const [user] = useAuthState(auth);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const isAdmin = user?.email === 'filimlive@gmail.com';

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: 'syncing' | 'success' | 'error' }>;
      setSyncStatus(customEvent.detail.status);
      
      if (customEvent.detail.status === 'success') {
        // Пульсируем зеленым 3 раза (3 * 600мс = 1800мс) и скрываем
        setTimeout(() => {
          setSyncStatus('idle');
        }, 1800);
      }
    };

    window.addEventListener('app:sync', handleSync);
    return () => window.removeEventListener('app:sync', handleSync);
  }, []);

  const toggleTheme = async () => {
    await db.appSettings.update('main', { theme: theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row transition-colors duration-500", 
      theme === 'dark' ? "bg-dark-bg text-dark-text-primary" : "bg-light-bg text-light-text-primary"
    )}>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-light-bg dark:bg-dark-bg border-r border-light-border dark:border-dark-border p-8 fixed h-full z-40">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 transition-all group-hover:scale-105 active:scale-95">
              <Sprout className="w-5 h-5 text-white stroke-[2px]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-light-text-primary dark:text-dark-text-primary">Sproutly</span>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 bg-[#F5F5F7] dark:bg-white/5 rounded-xl text-light-text-secondary dark:text-dark-text-secondary transition-all active:scale-90 cursor-pointer border border-light-border dark:border-dark-border/50 hover:bg-white dark:hover:bg-white/10"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 stroke-[1.5px]" /> : <Sun className="w-4 h-4 stroke-[1.5px]" />}
          </button>
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
            icon={<ListOrdered className="w-5 h-5 stroke-[1.5px]" />}
            label="Мои Вклады"
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => onTabChange('settings')}
            icon={<SettingsIcon className="w-5 h-5 stroke-[1.5px]" />}
            label="Настройки"
          />
        </nav>

        <div className="mt-auto relative">
          {user ? (
            <Menu as="div" className="relative w-full">
              <Menu.Button className="w-full flex items-center gap-3 p-4 bg-[#F5F5F7] dark:bg-white/5 rounded-2xl border border-light-border dark:border-dark-border transition-all hover:bg-[#E5E5E7] dark:hover:bg-white/10 cursor-pointer outline-none">
                <div className="relative shrink-0">
                  <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-xl border border-white/50 dark:border-white/10 shadow-sm" />
                  {syncStatus !== 'idle' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-card shadow-sm z-10">
                      {syncStatus === 'syncing' && (
                        <div className="w-full h-full bg-amber-400 rounded-full animate-pulse flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        </div>
                      )}
                      {syncStatus === 'success' && <div className="w-full h-full bg-emerald-500 rounded-full animate-[ping_0.6s_linear_3]" />}
                      {syncStatus === 'error' && <div className="w-full h-full bg-rose-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] font-bold truncate leading-tight text-light-text-primary dark:text-dark-text-primary">{user.displayName}</div>
                    {syncStatus === 'syncing' && <span className="text-[8px] font-black text-amber-500 uppercase animate-pulse">Sync</span>}
                  </div>
                  <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium truncate mt-0.5">Активен</div>
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
                <Menu.Items className="absolute bottom-full mb-2 left-0 w-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden outline-none p-1.5">
                  {isAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => db.appSettings.update('main', { showDevTools: !appSettings?.showDevTools })}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                            active ? "bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary" : "text-light-text-secondary dark:text-dark-text-secondary"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            DevTools
                          </div>
                          <div className={cn(
                            "w-8 h-4 rounded-full transition-colors relative",
                            appSettings?.showDevTools ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                          )}>
                            <div className={cn(
                              "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                              appSettings?.showDevTools ? "translate-x-4" : "translate-x-0"
                            )} />
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          active ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600" : "text-rose-500"
                        )}
                      >
                        <LogOut className="w-4 h-4" />
                        Выйти из аккаунта
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          ) : (
            <button 
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#0051FF] hover:bg-blue-600 text-white rounded-2xl font-bold transition-all text-sm shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
            >
              <User className="w-4 h-4 stroke-[2px]" />
              Войти
            </button>
          )}
        </div>
      </aside>

      {/* Header for Mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-20 px-6 flex items-center justify-between bg-white/70 dark:bg-black/70 backdrop-blur-2xl z-50 border-b border-light-border dark:border-dark-border/50 shadow-sm">
        <div className="flex items-center gap-3 active:scale-95 transition-transform cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
            <Sprout className="w-5 h-5 text-white stroke-[2.5px]" />
          </div>
          <span className="font-bold text-xl tracking-tight text-light-text-primary dark:text-dark-text-primary">Sproutly</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 bg-[#F5F5F7] dark:bg-white/5 rounded-xl text-light-text-secondary dark:text-dark-text-secondary transition-all active:scale-90 cursor-pointer border border-light-border dark:border-dark-border/50 hover:bg-white dark:hover:bg-white/10"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 stroke-[1.5px]" /> : <Sun className="w-4 h-4 stroke-[1.5px]" />}
          </button>
          {user ? (
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 outline-none relative active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-light-border dark:border-dark-border/50 shadow-sm">
                  <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
                </div>
                {syncStatus !== 'idle' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-bg z-10 shadow-sm">
                    {syncStatus === 'syncing' && <div className="w-full h-full bg-amber-400 rounded-full animate-pulse" />}
                    {syncStatus === 'success' && <div className="w-full h-full bg-emerald-500 rounded-full animate-[ping_0.6s_linear_3]" />}
                    {syncStatus === 'error' && <div className="w-full h-full bg-rose-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]" />}
                  </div>
                )}
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
                <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden outline-none p-1.5">
                  <div className="px-3 py-2 border-b border-light-border dark:border-dark-border mb-1.5">
                    <div className="text-[12px] font-bold truncate leading-tight text-light-text-primary dark:text-dark-text-primary">{user.displayName}</div>
                    <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium truncate mt-0.5">{user.email}</div>
                  </div>
                  {isAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => db.appSettings.update('main', { showDevTools: !appSettings?.showDevTools })}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                            active ? "bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary" : "text-light-text-secondary dark:text-dark-text-secondary"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            DevTools
                          </div>
                          <div className={cn(
                            "w-8 h-4 rounded-full transition-colors relative",
                            appSettings?.showDevTools ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                          )}>
                            <div className={cn(
                              "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                              appSettings?.showDevTools ? "translate-x-4" : "translate-x-0"
                            )} />
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          active ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600" : "text-rose-500"
                        )}
                      >
                        <LogOut className="w-4 h-4" />
                        Выйти из аккаунта
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          ) : (
            <button onClick={signIn} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer active:scale-90">
              <User className="w-4 h-4 stroke-[2px]" />
            </button>
          )}
        </div>
      </header>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-t border-light-border dark:border-dark-border flex justify-around p-4 z-50 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} icon={<LayoutDashboard className="w-5 h-5 stroke-[1.5px]" />} label="Дашборд" />
        <MobileNavItem active={activeTab === 'deposits'} onClick={() => onTabChange('deposits')} icon={<ListOrdered className="w-5 h-5 stroke-[1.5px]" />} label="Вклады" />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<SettingsIcon className="w-5 h-5 stroke-[1.5px]" />} label="Настройки" />
      </nav>

      <main className="flex-1 md:ml-64 pt-28 md:pt-12 p-4 md:p-8 lg:p-8 pb-32 md:pb-12 min-h-screen flex flex-col">
        <div className="w-full max-w-5xl mx-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-8 md:space-y-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
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
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-[24px] bg-white dark:bg-dark-card p-6 text-left align-middle shadow-xl transition-all border border-light-border dark:border-dark-border">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                      <LogOut className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary tracking-tight">
                        Выход
                      </Dialog.Title>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        Вы уверены, что хотите выйти из аккаунта?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-[#E5E5E7] dark:hover:bg-white/10"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        logout();
                      }}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20"
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
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 font-semibold text-sm w-full group cursor-pointer",
        active 
          ? "bg-[#F5F5F7] dark:bg-white/5 text-blue-600 dark:text-blue-400" 
          : "text-light-text-secondary dark:text-dark-text-secondary hover:bg-[#F5F5F7] dark:hover:bg-white/5 hover:text-light-text-primary dark:hover:text-dark-text-primary"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "transition-transform duration-300",
          active ? "scale-110 text-blue-600 dark:text-blue-400" : "group-hover:scale-110"
        )}>
          {icon}
        </div>
        {label}
      </div>
      {active && <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1 p-2 transition-all duration-300 cursor-pointer", 
      active ? "text-blue-600 scale-105" : "text-slate-400"
    )}>
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      {active && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />}
    </button>
  );
}
