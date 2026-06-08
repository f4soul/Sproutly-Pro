import React, { useState, useEffect, Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Lock, Shield, X, Delete, AlertTriangle } from 'lucide-react';
import { verifyBiometricCredential } from '../../lib/biometrics';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';
import { db } from '../../config/db';
import { logout } from '../../config/firebase';

interface SecurityLockProps {
  pin: string;
  useBiometrics: boolean;
  credentialId?: string | null;
  credentialIds?: string[] | null;
  onUnlock: () => void;
}

export function SecurityLock({ pin, useBiometrics, credentialId, credentialIds, onUnlock }: SecurityLockProps) {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showForgotPinTheme, setShowForgotPinTheme] = useState(false);

  const vibrate = (pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const hasCredentials = (credentialIds && credentialIds.length > 0) || credentialId;
    if (useBiometrics && hasCredentials && !enteredPin) {
       // If we are in an iframe (e.g. development or share preview sandbox),
      // do not automatically trigger biometrics because webauthn is blocked by policy.
      if (typeof window !== 'undefined' && window.self !== window.top) {
        console.warn('Skipping automatic biometric authentication inside iframe container');
        return;
      }
      handleBiometricAuth();
    }
  }, [useBiometrics, credentialId, credentialIds]);

  useEffect(() => {
    if (enteredPin.length === 4) {
      if (enteredPin === pin) {
        vibrate(50);
        onUnlock();
      } else {
        vibrate([50, 50, 50]);
        setError(true);
        setTimeout(() => {
          setEnteredPin('');
          setError(false);
         }, 500);
      }
    }
  }, [enteredPin, pin, onUnlock]);

  const handleBiometricAuth = async () => {
    const ids = credentialIds && credentialIds.length > 0
      ? credentialIds
      : (credentialId ? [credentialId] : []);
    if (ids.length === 0) return;
    try {
      setIsAuthenticating(true);
      await verifyBiometricCredential(ids);
      vibrate(50);
      onUnlock();
    } catch (err: any) {
      console.error(err);
      
      // Determine if error is a policy/iframe permission error, or manual cancellation.
      // If so, do not show a scary "biometrics not recognized" error.
      const isCancellationOrPolicyError = 
        err?.name === 'NotAllowedError' || 
        err?.name === 'SecurityError' ||
        err?.message?.includes('Permissions Policy') ||
        err?.message?.includes('not enabled') ||
        err?.message?.includes('cancel') ||
        err?.message?.includes('abort');

      if (!isCancellationOrPolicyError) {
        vibrate([50, 50, 50]);
        showToast('Биометрия не распознана', 'error');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleNumberClick = (num: number) => {
    if (enteredPin.length < 4 && !error) {
      vibrate(30);
      setEnteredPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (!error) {
      vibrate(30);
      setEnteredPin(prev => prev.slice(0, -1));
    }
  };

  const handleForgotPinConfirm = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Error logging out', e);
    }
    try {
      await db.delete();
    } catch (e) {
      console.error('Error deleting db', e);
    }
    localStorage.clear();
    window.location.reload();
  };

  return (
    <motion.div 
      key="security-lock"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 w-full h-[100dvh] z-[9999] flex flex-col items-center justify-center bg-slate-50/95 dark:bg-[#0B0F19]/95 backdrop-blur-2xl"
      style={{ touchAction: 'none' }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="flex flex-col items-center w-full max-w-sm px-6 h-[100dvh] justify-center pb-20 relative"
      >
        <div className="w-16 h-16 rounded-full bg-primary-100/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <Shield size={32} className="stroke-[1.5px]" />
        </div>
        
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">
          Приложение защищено
        </h2>
        <p className="text-sm text-slate-500 mb-8 text-center font-medium">
          Введите PIN-код для получения доступа<br/>к вашей финансовой информации
        </p>

        {/* PIN Indicators */}
        <motion.div 
          animate={error ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-4 mb-10"
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                error 
                  ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] scale-110"
                  : enteredPin.length > index
                    ? "bg-primary-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110"
                    : "bg-slate-200 dark:bg-slate-800"
              )}
            />
          ))}
        </motion.div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-90 mx-auto"
            >
              {num}
            </button>
          ))}
          
          <div className="w-16 h-16 flex items-center justify-center mx-auto">
            {useBiometrics && credentialId && (
              <button
                onClick={handleBiometricAuth}
                disabled={isAuthenticating}
                className="w-16 h-16 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors active:scale-90"
              >
                <Fingerprint size={28} className={cn("stroke-[1.5px]", isAuthenticating && "animate-pulse")} />
              </button>
            )}
          </div>
          
          <button
            onClick={() => handleNumberClick(0)}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-90 mx-auto"
          >
            0
          </button>
          
          <div className="w-16 h-16 flex items-center justify-center mx-auto">
            <button
              onClick={handleDelete}
              className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-90"
            >
              <Delete size={24} className="stroke-[1.5px]" />
            </button>
          </div>
        </div>

        <button 
          onClick={() => setShowForgotPinTheme(true)}
          className="absolute bottom-8 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
        >
          Забыли PIN?
        </button>
      </motion.div>

      <AnimatePresence>
        {showForgotPinTheme && (
          <Dialog as="div" className="relative z-[10000]" open={true} onClose={() => setShowForgotPinTheme(false)} static>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Panel as={Fragment}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto p-6 sm:p-8"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
                      <AlertTriangle className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white leading-none">
                        Сброс PIN-кода
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Сброс PIN-кода приведет к <strong className="text-rose-500">полному удалению</strong> всех локальных данных приложения.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Если вы пользовались облачной синхронизацией, ваши данные остались в облаке, и вы сможете восстановить их при повторном входе в аккаунт. Разрешить сброс?
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowForgotPinTheme(false)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleForgotPinConfirm}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base cursor-pointer"
                    >
                      Сбросить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
