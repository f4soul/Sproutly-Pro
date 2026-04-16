import React, { useRef, useEffect } from 'react';
import { TrendingUp, LogIn, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { User, signInWithGoogle, logout } from '../firebase';

interface HeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  user: User | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (v: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  setIsSettingsModalOpen: (v: boolean) => void;
}

export const Header = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  user,
  syncStatus,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  isDarkMode,
  setIsDarkMode,
  setIsSettingsModalOpen
}: HeaderProps) => {
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsProfileMenuOpen]);

  return (
    <header className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 relative z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-xl text-white">
          <TrendingUp size={24} />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 dark:text-white font-mono">
              INCOME<span className="inline-block w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse mx-1" />PRO
            </h1>
          </div>
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Progressive Made Simple</p>
        </div>
      </div>
      
      {/* Mobile Burger Button */}
      <div className="md:hidden flex items-center">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer text-slate-600 dark:text-slate-300 shadow-sm z-50"
        >
          <div className="flex flex-col justify-center items-center w-5 h-5 relative">
            <span className={cn("w-full h-0.5 bg-current rounded-full absolute transition-all duration-300 ease-in-out", isMobileMenuOpen ? "rotate-45" : "-translate-y-1.5")} />
            <span className={cn("w-full h-0.5 bg-current rounded-full absolute transition-all duration-300 ease-in-out", isMobileMenuOpen ? "opacity-0" : "opacity-100")} />
            <span className={cn("w-full h-0.5 bg-current rounded-full absolute transition-all duration-300 ease-in-out", isMobileMenuOpen ? "-rotate-45" : "translate-y-1.5")} />
          </div>
        </button>
      </div>
      
      {/* Desktop Actions & Mobile Dropdown */}
      <div className={cn(
        "absolute top-full right-0 mt-2 w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 p-2 flex-col gap-1 z-50 md:static md:w-auto md:bg-transparent md:dark:bg-transparent md:shadow-none md:border-none md:p-0 md:flex-row md:flex md:gap-3 transition-all duration-200 origin-top-right",
        isMobileMenuOpen 
          ? "opacity-100 scale-100 pointer-events-auto flex" 
          : "opacity-0 scale-95 pointer-events-none flex md:opacity-100 md:scale-100 md:pointer-events-auto"
      )}>
        {/* Auth & Sync Unified Block */}
        {user ? (
          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full md:w-auto flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left md:justify-center md:p-0 md:hover:bg-transparent md:h-10 md:w-10 md:border md:border-gray-200 md:dark:border-gray-700 md:bg-white md:dark:bg-gray-800/50 shadow-none md:shadow-sm"
              title={`Аккаунт: ${user.displayName?.split(' ')[0]} | Статус: ${
                syncStatus === 'synced' ? 'Синхронизировано' :
                syncStatus === 'syncing' ? 'Синхронизация...' :
                syncStatus === 'error' ? 'Ошибка синхронизации' : 'Офлайн'
              }`}
            >
              <div className="relative w-8 h-8 md:w-full md:h-full shrink-0">
                <div className="w-full h-full rounded-lg md:rounded-xl overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                {/* Sync Status Dot Overlay */}
                <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center pointer-events-none z-10">
                  {syncStatus === 'syncing' && (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" style={{ animationDuration: '2s' }}></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border-2 border-white dark:border-slate-900"></span>
                    </>
                  )}
                  {syncStatus === 'synced' && (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                  )}
                  {syncStatus === 'error' && (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" style={{ animationDuration: '0.8s' }}></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
                    </>
                  )}
                  {syncStatus === 'offline' && (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 border-2 border-white dark:border-slate-900"></span>
                  )}
                </div>
              </div>
              <span className="md:hidden text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user.displayName}</span>
            </button>
            
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 py-2 z-50 overflow-hidden hidden md:block"
                >
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Аккаунт</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{user.displayName}</p>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span className="font-bold">Выйти из профиля</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button 
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 md:py-0 md:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-blue-500/20 w-full md:w-auto cursor-pointer"
          >
            <LogIn size={18} />
            <span>Войти</span>
          </button>
        )}

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 md:hidden"></div>

        <button 
          onClick={() => {
            setIsSettingsModalOpen(true);
            setIsMobileMenuOpen(false);
          }} 
          className="w-full md:w-10 h-10 flex items-center justify-start md:justify-center gap-3 px-3 md:px-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 md:bg-white md:dark:bg-gray-800/50 md:border md:border-gray-200 md:dark:border-gray-700 md:hover:border-blue-400 md:dark:hover:border-blue-500 transition-all cursor-pointer text-slate-700 dark:text-slate-200 md:text-gray-500 md:dark:text-gray-400 shadow-none md:shadow-sm" 
          title="Настройки и Данные"
        >
          <Settings size={18} className="md:w-5 md:h-5 text-slate-500 dark:text-slate-400" />
          <span className="md:hidden text-sm font-medium">Настройки</span>
        </button>
        <button 
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            setIsMobileMenuOpen(false);
          }} 
          className="w-full md:w-10 h-10 flex items-center justify-start md:justify-center gap-3 px-3 md:px-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 md:bg-white md:dark:bg-gray-800/50 md:border md:border-gray-200 md:dark:border-gray-700 md:hover:border-blue-400 md:dark:hover:border-blue-500 transition-all cursor-pointer text-slate-700 dark:text-slate-200 md:text-gray-500 md:dark:text-gray-400 shadow-none md:shadow-sm" 
          title="Сменить тему"
        >
          {isDarkMode ? <Sun size={18} className="md:w-5 md:h-5 text-amber-500" /> : <Moon size={18} className="md:w-5 md:h-5 text-slate-500 dark:text-slate-400" />}
          <span className="md:hidden text-sm font-medium">Тема</span>
        </button>

        {/* Mobile Logout Button */}
        {user && (
          <button 
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
            className="md:hidden w-full h-10 flex items-center justify-start gap-3 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer text-red-600 dark:text-red-400"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Выйти из профиля</span>
          </button>
        )}
      </div>
    </header>
  );
};
