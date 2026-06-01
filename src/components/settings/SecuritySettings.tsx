import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/db';
import { AppSettings } from '../../types';
import { Shield, Fingerprint, Lock, ShieldCheck, ChevronDown } from 'lucide-react';
import { registerBiometricCredential, isBiometricsSupported } from '../../lib/biometrics';
import { useAppState } from '../../hooks/useAppState';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SecuritySettingsProps {
  appSettings: AppSettings;
}

export function SecuritySettings({ appSettings }: SecuritySettingsProps) {
  const { addToast } = useAppState();
  const [isBiometricsAvail, setIsBiometricsAvail] = useState(false);
  const lockSettings = appSettings.privacyLock;
  const isEnabled = lockSettings?.enabled || false;

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const timeoutOptions = [
    { value: 0, label: 'Сразу' },
    { value: 1, label: 'Через 1 минуту' },
    { value: 5, label: 'Через 5 минут' },
    { value: 15, label: 'Через 15 минут' },
    { value: 60, label: 'Через 1 час' }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    isBiometricsSupported().then(setIsBiometricsAvail).catch(() => {});
  }, []);

  const updateLockSettings = async (updates: Partial<typeof lockSettings>) => {
    const current = appSettings.privacyLock || { enabled: false, pin: null, useBiometrics: false, credentialId: null };
    await db.appSettings.update('main', {
      privacyLock: { ...current, ...updates },
      updatedAt: Date.now()
    });
  };

  const handleToggle = async () => {
    if (isEnabled) {
      // Disable
      await updateLockSettings({ enabled: false, pin: null, useBiometrics: false, credentialId: null });
      addToast('Защита отключена');
    } else {
      setStep(1);
      setPinInput('');
      setPinConfirm('');
      setShowPinSetup(true);
    }
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (pinInput === pinConfirm) {
        sessionStorage.setItem('pinUnlocked', 'true');
        localStorage.setItem('lockLastActive', Date.now().toString());
        await updateLockSettings({ enabled: true, pin: pinInput });
        addToast('PIN-код установлен');
        setShowPinSetup(false);
      } else {
        addToast('PIN-коды не совпадают', 'error');
        setPinConfirm('');
      }
    }
  };

  const handleToggleBiometrics = async () => {
    if (lockSettings?.useBiometrics) {
      await updateLockSettings({ useBiometrics: false, credentialId: null });
    } else {
      try {
        const cred = await registerBiometricCredential(appSettings.userId || 'local_user', 'User');
        await updateLockSettings({ useBiometrics: true, credentialId: cred.id });
        addToast('Биометрия подключена');
      } catch (err) {
        console.error(err);
        addToast('Ошибка при настройке биометрии', 'error');
      }
    }
  };

  return (
    <section className="apple-card !overflow-visible p-5 lg:p-6 mb-6 lg:mb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-primary-500 stroke-[1.5px]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">
            Безопасность
          </h3>
          <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate pr-2">
            Защита приложения с помощью PIN-кода или биометрии
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle App Lock */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Блокировка при входе</span>
            <span className="text-[10px] text-slate-500 font-medium">Требовать PIN-код или TouchID</span>
          </div>
          <button
            onClick={handleToggle}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative flex items-center p-1",
              isEnabled ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-700"
            )}
          >
            <div className={cn(
              "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
              isEnabled ? "translate-x-6" : "translate-x-0"
            )} />
          </button>
        </div>

        {/* Timeout Setup */}
        {isEnabled && (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 relative">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Запрашивать PIN-код</span>
              <span className="text-[10px] text-slate-500 font-medium">Время неактивности до блокировки</span>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/[0.08] hover:border-primary-500/30 dark:hover:border-primary-500/30 rounded-2xl text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm transition-all focus:outline-none active:scale-95 cursor-pointer min-w-[130px]"
              >
                <span>{timeoutOptions.find(o => o.value === (lockSettings?.timeoutMinutes || 0))?.label || 'Сразу'}</span>
                <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronDown size={16} className="text-slate-400 stroke-[2px]" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] rounded-2xl shadow-xl z-[90] p-1.5 space-y-0.5 overflow-hidden"
                  >
                    {timeoutOptions.map((opt) => {
                      const isSelected = (lockSettings?.timeoutMinutes || 0) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            updateLockSettings({ timeoutMinutes: opt.value });
                            setIsDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer block focus:outline-none",
                            isSelected
                              ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Biometrics Toggle (Only if app lock is enabled and biometrics supported) */}
        {isEnabled && isBiometricsAvail && (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Вход по биометрии</span>
              <span className="text-[10px] text-slate-500 font-medium">Использовать отпечаток или Face ID</span>
            </div>
            <button
              onClick={handleToggleBiometrics}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative flex items-center p-1",
                lockSettings?.useBiometrics ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-700"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                lockSettings?.useBiometrics ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>
        )}
      </div>

      {/* PIN Setup Modal */}
      <AnimatePresence>
        {showPinSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-card p-6 max-w-xs w-full flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4">
                <Lock size={24} className="stroke-[1.5px]" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-1">
                {step === 1 ? 'Придумайте PIN-код' : 'Повторите PIN-код'}
              </h3>
              <p className="text-xs text-slate-500 text-center mb-6">
                4 цифры для быстрого входа
              </p>

              <div className="flex justify-center gap-3 mb-8">
                {[0, 1, 2, 3].map(i => {
                  const val = step === 1 ? pinInput[i] : pinConfirm[i];
                  return (
                    <div key={i} className={cn(
                      "w-4 h-4 rounded-full transition-colors",
                      val ? "bg-primary-500" : "bg-slate-200 dark:bg-slate-700"
                    )} />
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-[200px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      if (step === 1 && pinInput.length < 4) setPinInput(prev => prev + num);
                      if (step === 2 && pinConfirm.length < 4) setPinConfirm(prev => prev + num);
                    }}
                    className="w-12 h-12 rounded-full flex mx-auto items-center justify-center text-xl font-light text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 bg-slate-50 dark:bg-slate-900/50"
                  >
                    {num}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => {
                    if (step === 1 && pinInput.length < 4) setPinInput(prev => prev + 0);
                    if (step === 2 && pinConfirm.length < 4) setPinConfirm(prev => prev + 0);
                  }}
                  className="w-12 h-12 rounded-full flex mx-auto items-center justify-center text-xl font-light text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 bg-slate-50 dark:bg-slate-900/50"
                >
                  0
                </button>
                <button
                  onClick={() => {
                    if (step === 1) setPinInput(prev => prev.slice(0, -1));
                    if (step === 2) setPinConfirm(prev => prev.slice(0, -1));
                  }}
                  className="w-12 h-12 rounded-full flex mx-auto items-center justify-center text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-colors"
                >
                  DEL
                </button>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowPinSetup(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:opacity-80 transition-opacity"
                >
                  Отмена
                </button>
                <button
                  onClick={handlePinSubmit}
                  disabled={(step === 1 ? pinInput.length : pinConfirm.length) !== 4}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-primary-500 text-white disabled:opacity-50 hover:bg-primary-600 transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                >
                  {step === 1 ? 'Далее' : 'Готово'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
