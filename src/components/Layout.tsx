import React, { useState, useEffect, Fragment } from 'react';
import { LayoutDashboard, ListOrdered, Settings as SettingsIcon, Sprout, Moon, Sun, User, LogOut, Wrench, Landmark, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, signInWithGoogle, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { useLiveQuery } from 'dexie-react-hooks';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'deposits' | 'ndfl' | 'settings';
  onTabChange: (tab: 'dashboard' | 'deposits' | 'ndfl' | 'settings') => void;
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
      <aside className="hidden md:flex flex-col w-64 bg-light-bg dark:bg-dark-bg border-r border-light-border dark:border-dark-border p-5 lg:p-8 fixed h-full z-40 transition-all duration-300 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-6 mb-8 lg:mb-12">
          <div className="flex items-center gap-2.5 group cursor-pointer px-0" onClick={() => onTabChange('dashboard')}>
            <div className="bg-blue-600 p-1.5 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/20 transition-all group-hover:scale-105 active:scale-95 mx-0 shrink-0">
              <Sprout className="w-5 h-5 text-white stroke-[2.5px]" />
            </div>
            <span className="block font-black text-lg tracking-tighter text-light-text-primary dark:text-dark-text-primary font-mono uppercase whitespace-nowrap">
              SPROUTLY<span className="inline-block w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse mx-0.5" />PRO
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
            label="Мои Вклады"
          />
          <NavItem 
            active={activeTab === 'ndfl'} 
            onClick={() => onTabChange('ndfl')}
            icon={<Wallet className="w-5 h-5 stroke-[1.5px]" />}
            label="Мои доходы"
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => onTabChange('settings')}
            icon={<SettingsIcon className="w-5 h-5 stroke-[1.5px]" />}
            label="Настройки"
          />
        </nav>

        <div className="mt-auto flex items-center gap-2">
          {user ? (
            <Menu as="div" className="relative flex-1">
              <Menu.Button className="w-full h-12 flex items-center justify-between px-3 bg-[#F5F5F7] dark:bg-white/5 rounded-2xl border border-light-border dark:border-dark-border transition-all hover:bg-[#E5E5E7] dark:hover:bg-white/10 cursor-pointer outline-none">
                  <div className="relative shrink-0">
                    <img src={user.photoURL || ''} alt="" className="w-7 h-7 rounded-lg border border-white/50 dark:border-white/10 shadow-sm" />
                    <AnimatePresence>
                      {syncStatus !== 'idle' && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute -top-1 -right-1 z-20"
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full border border-white/50 dark:border-dark-card shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden blur-[0.3px]",
                            syncStatus === 'syncing' && "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] scale-110",
                            syncStatus === 'success' && "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]",
                            syncStatus === 'error' && "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]"
                          )}>
                            {syncStatus === 'syncing' && (
                              <motion.div 
                                animate={{ 
                                  scale: [1, 1.5, 1],
                                  opacity: [0.3, 0.7, 0.3]
                                }}
                                transition={{ 
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                className="w-full h-full bg-white/40 rounded-full"
                              />
                            )}
                            {syncStatus === 'success' && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[6px] font-black text-white"
                              >
                                ✓
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex flex-1 min-w-0 text-left flex-col justify-center ml-3">
                    {user.displayName?.split(' ').reverse().map((namePart, idx) => (
                      <div key={idx} className={cn("truncate leading-tight text-light-text-primary dark:text-dark-text-primary", idx === 0 ? "text-[12px] font-black" : "text-[10px] font-semibold text-slate-500 dark:text-slate-400")}>{namePart}</div>
                    )) || <div className="text-[10px] font-bold truncate leading-tight text-light-text-primary dark:text-dark-text-primary">{user.email}</div>}
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
              onClick={signInWithGoogle}
              className="apple-button flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-[#0051FF] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20"
            >
              <User className="w-4 h-4 stroke-[2px]" />
              Войти
            </button>
          )}

          <button 
            onClick={toggleTheme}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F5F5F7] dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-light-border dark:border-dark-border transition-all hover:bg-white dark:hover:bg-white/10 active:scale-95 group shadow-sm shrink-0"
            title={theme === 'light' ? 'Включить темную тему' : 'Включить светлую тему'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5 stroke-[1.5px]" /> : <Sun className="w-5 h-5 stroke-[1.5px]" />}
          </button>
        </div>
    </aside>

      {/* Header for Mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-20 px-6 flex items-center justify-between bg-white/70 dark:bg-black/70 backdrop-blur-2xl z-50 border-b border-light-border dark:border-dark-border/50 shadow-sm">
        <div className="flex items-center gap-2 active:scale-95 transition-transform cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <div className="bg-blue-600 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/30 shrink-0">
            <Sprout className="w-5 h-5 text-white stroke-[2.5px]" />
          </div>
          <span className="font-black text-lg tracking-tighter text-light-text-primary dark:text-dark-text-primary font-mono uppercase whitespace-nowrap">
            SPROUTLY<span className="inline-block w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse mx-0.5" />PRO
          </span>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 outline-none relative active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-light-border dark:border-dark-border/50 shadow-sm bg-[#F5F5F7] dark:bg-white/5">
                  <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
                </div>
                <AnimatePresence>
                  {syncStatus !== 'idle' && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 z-20"
                    >
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full border border-white/50 dark:border-dark-bg shadow-sm flex items-center justify-center blur-[0.3px]",
                        syncStatus === 'syncing' && "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)] scale-110",
                        syncStatus === 'success' && "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]",
                        syncStatus === 'error' && "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]"
                      )}>
                        {syncStatus === 'syncing' && (
                          <motion.div 
                            animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 bg-white rounded-full"
                          />
                        )}
                        {syncStatus === 'success' && <span className="text-[7px] font-black text-white">✓</span>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  <div className="px-3 py-2 border-b border-light-border dark:border-dark-border mb-1.5 flex flex-col">
                    {user.displayName?.split(' ').reverse().map((namePart, idx) => (
                      <div key={idx} className={cn("truncate leading-tight", idx === 0 ? "text-[14px] font-black text-light-text-primary dark:text-dark-text-primary" : "text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1")}>{namePart}</div>
                    )) || <div className="text-[12px] font-bold truncate leading-tight text-light-text-primary dark:text-dark-text-primary">{user.displayName}</div>}
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
            <button 
              onClick={signInWithGoogle}
              className="apple-button w-10 h-10 flex items-center justify-center rounded-xl bg-[#0051FF] hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20"
            >
              <User className="w-5 h-5 stroke-[2px]" />
            </button>
          )}

          <button 
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-90 shadow-sm shrink-0"
            title={theme === 'light' ? 'Включить темную тему' : 'Включить светлую тему'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5 stroke-[1.5px]" /> : <Sun className="w-5 h-5 stroke-[1.5px]" />}
          </button>
        </div>
      </header>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-t border-light-border dark:border-dark-border flex justify-around p-4 z-50 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} icon={<LayoutDashboard className="w-5 h-5 stroke-[1.5px]" />} label="Обзор" />
        <MobileNavItem active={activeTab === 'deposits'} onClick={() => onTabChange('deposits')} icon={<Landmark className="w-5 h-5 stroke-[1.5px]" />} label="Вклады" />
        <MobileNavItem active={activeTab === 'ndfl'} onClick={() => onTabChange('ndfl')} icon={<Wallet className="w-5 h-5 stroke-[1.5px]" />} label="Доходы" />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<SettingsIcon className="w-5 h-5 stroke-[1.5px]" />} label="Опции" />
      </nav>

      <main className="flex-1 md:ml-64 pt-28 md:pt-8 lg:pt-12 p-3 md:p-6 lg:p-8 pb-32 md:pb-12 min-h-screen flex flex-col transition-all duration-300 min-w-0">
        <div className="w-full max-w-6xl mx-auto flex-1 min-w-0 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-8 md:space-y-12 flex-1 w-full min-w-0"
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
      <div className="flex items-center gap-3 mx-0">
        <div className={cn(
          "transition-transform duration-300",
          active ? "scale-110 text-blue-600 dark:text-blue-400" : "group-hover:scale-110"
        )}>
          {icon}
        </div>
        <span className="block">{label}</span>
      </div>
      {active && <div className="block w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
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
