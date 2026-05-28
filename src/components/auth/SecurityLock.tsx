import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Lock, Shield, X, Delete } from 'lucide-react';
import { verifyBiometricCredential } from '../../lib/biometrics';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';
import { db } from '../../config/db';

interface SecurityLockProps {
  pin: string;
  useBiometrics: boolean;
  credentialId?: string | null;
  onUnlock: () => void;
}

export function SecurityLock({ pin, useBiometrics, credentialId, onUnlock }: SecurityLockProps) {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (useBiometrics && credentialId && !enteredPin) {
      handleBiometricAuth();
    }
  }, [useBiometrics, credentialId]);

  useEffect(() => {
    if (enteredPin.length === 4) {
      if (enteredPin === pin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setEnteredPin('');
          setError(false);
        }, 500);
      }
    }
  }, [enteredPin, pin, onUnlock]);

  const handleBiometricAuth = async () => {
    if (!credentialId) return;
    try {
      setIsAuthenticating(true);
      await verifyBiometricCredential(credentialId);
      onUnlock();
    } catch (err) {
      console.error(err);
      showToast('Биометрия не распознана', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleNumberClick = (num: number) => {
    if (enteredPin.length < 4 && !error) {
      setEnteredPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (!error) {
      setEnteredPin(prev => prev.slice(0, -1));
    }
  };

  const handleForgotPin = async () => {
    if (window.confirm('Сброс PIN-кода приведет к полному удалению всех локальных данных приложения.\n\nЕсли вы пользовались синхронизацией, ваши данные остались в облаке, и вы сможете восстановить их при повторном входе в аккаунт.\n\nВы уверены, что хотите сбросить приложение?')) {
      try {
        await db.delete();
      } catch (e) {
        console.error('Error deleting db', e);
      }
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <motion.div 
      key="security-lock"
      initial={{ opacity: 0 }}
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
        <div className="flex gap-4 mb-10">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                error 
                  ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                  : enteredPin.length > index
                    ? "bg-primary-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110"
                    : "bg-slate-200 dark:bg-slate-800"
              )}
            />
          ))}
        </div>

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
          onClick={handleForgotPin}
          className="absolute bottom-8 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
        >
          Забыли PIN?
        </button>
      </motion.div>
    </motion.div>
  );
}
