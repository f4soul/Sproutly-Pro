import React, { useState, useEffect, useRef, Fragment } from 'react';
import { db, syncWithFirebase } from '../../config/db';
import { AppSettings } from '../../types';
import { Shield, Fingerprint, Lock, ShieldCheck, ChevronDown, Delete, ChevronRight, Key } from 'lucide-react';
import { registerBiometricCredential, isBiometricsSupported, verifyBiometricCredential } from '../../lib/biometrics';
import { useAppState } from '../../hooks/useAppState';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog } from '@headlessui/react';

interface SecuritySettingsProps {
  appSettings: AppSettings;
}

export function SecuritySettings({ appSettings }: SecuritySettingsProps) {
  const { addToast } = useAppState();
  const lockSettings = appSettings.privacyLock;
  const isEnabled = lockSettings?.enabled || false;

  const [isBiometricsAvail, setIsBiometricsAvail] = useState(false);
  const [isThisDeviceBound, setIsThisDeviceBound] = useState(false);

  useEffect(() => {
    const localId = localStorage.getItem('localBiometricCredId');
    const ids = lockSettings?.credentialIds || (lockSettings?.credentialId ? [lockSettings.credentialId] : []);
    setIsThisDeviceBound(!!(localId && ids.includes(localId)));
  }, [lockSettings?.credentialIds, lockSettings?.credentialId]);

  const vibrate = (pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [verificationType, setVerificationType] = useState<'change' | 'disable' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isErrorShake, setIsErrorShake] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerErrorShake = () => {
    setIsErrorShake(true);
    vibrate([60, 60, 60]);
    setTimeout(() => setIsErrorShake(false), 500);
  };

  const timeoutOptions = [
    { value: 0, label: 'Сразу' },
    { value: 1, label: 'Через 1 минуту' },
    { value: 5, label: 'Через 5 минут' },
    { value: 60, label: 'Через 1 час' }
  ];

  useEffect(() => {
    isBiometricsSupported().then(setIsBiometricsAvail).catch(() => {});
  }, []);

  const updateLockSettings = async (updates: Partial<typeof lockSettings>) => {
    const current = appSettings.privacyLock || { enabled: false, pin: null, useBiometrics: false, credentialId: null };
    await db.appSettings.update('main', {
      privacyLock: { ...current, ...updates },
      updatedAt: Date.now()
    });
    // Upload changes to Cloud Firestore immediately to prevent PC/mobile sync out-of-sync
    syncWithFirebase().catch(console.error);
  };

  const handleToggle = async () => {
    if (isEnabled) {
      // Need current PIN verification before disabling
      setVerificationType('disable');
      setPinInput('');
      setPinConfirm('');
      setShowPinSetup(true);
    } else {
      setVerificationType(null);
      setStep(1);
      setPinInput('');
      setPinConfirm('');
      setShowPinSetup(true);
    }
  };

  const handlePinSubmit = async () => {
    // Verification flow
    if (verificationType !== null) {
      const currentInput = pinInput;
      if (currentInput.length !== 4) return;
      
      if (currentInput === lockSettings?.pin) {
        if (verificationType === 'change') {
          // Success, transition to entering new passcode
          setVerificationType(null);
          setPinInput('');
          setPinConfirm('');
          setStep(1);
          addToast('Введите новый код-пароль');
          vibrate(40);
        } else if (verificationType === 'disable') {
          // Success, disable passcode
          await updateLockSettings({ enabled: false, pin: null, useBiometrics: false, credentialId: null });
          setShowPinSetup(false);
          addToast('Защита отключена');
          vibrate(40);
        }
      } else {
        triggerErrorShake();
        addToast('Неверный код-пароль', 'error');
        setPinInput('');
      }
      return;
    }

    // Normal pin setup flow
    const inputToUse = step === 1 ? pinInput : pinConfirm;
    if (inputToUse.length !== 4) return;

    if (step === 1) {
      setStep(2);
      vibrate(30);
    } else if (step === 2) {
      if (pinInput === pinConfirm) {
        sessionStorage.setItem('pinUnlocked', 'true');
        localStorage.setItem('lockLastActive', Date.now().toString());
        await updateLockSettings({ enabled: true, pin: pinInput });
        addToast('Код-пароль установлен');
        setShowPinSetup(false);
        vibrate(40);
      } else {
        addToast('Код-пароль не совпадает', 'error');
        setPinConfirm('');
        triggerErrorShake();
      }
    }
  };

  // Auto-submit logic on 4 digits for pristine UX (iOS style)
  useEffect(() => {
    if (pinInput.length === 4) {
      if (verificationType !== null) {
        handlePinSubmit();
      } else if (step === 1) {
        setStep(2);
        vibrate(30);
      }
    }
  }, [pinInput, verificationType, step]);

  useEffect(() => {
    if (pinConfirm.length === 4) {
      if (verificationType === null && step === 2) {
        handlePinSubmit();
      }
    }
  }, [pinConfirm, verificationType, step]);

  const handleToggleBiometrics = async () => {
    if (lockSettings?.useBiometrics) {
      await updateLockSettings({ useBiometrics: false, credentialId: null });
      localStorage.removeItem('isBiometricBound');
      setIsThisDeviceBound(false);
    } else {
      try {
        const localCredId = localStorage.getItem('localBiometricCredId');
        const ids = lockSettings?.credentialIds || (lockSettings?.credentialId ? [lockSettings.credentialId] : []);

        // Re-use already bound local key silently if listed in account
        if (localCredId && ids.includes(localCredId)) {
          await updateLockSettings({ useBiometrics: true, credentialId: localCredId });
          addToast('Биометрия подключена');
          return;
        }

        const cred = await registerBiometricCredential(appSettings.userId || 'local_user', 'User');
        const newIds = Array.from(new Set([...ids, cred.id]));
        await updateLockSettings({ useBiometrics: true, credentialId: cred.id, credentialIds: newIds });
        localStorage.setItem('localBiometricCredId', cred.id);
        localStorage.setItem('isBiometricBound', 'true');
        addToast('Биометрия подключена');
      } catch (err) {
        console.error(err);
        addToast('Ошибка при настройке биометрии', 'error');
      }
    }
  };

  return (
    <section className="apple-card !overflow-visible p-4 sm:p-5 xl:p-6 h-full flex flex-col">
      {/* Segment Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-primary-500 stroke-[1.5px]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">
            Безопасность
          </h3>
          <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate pr-2">
            Face ID и код-пароль
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {!isEnabled ? (
          /* PASCODE DISABLED: CTA Layout */
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50/40 dark:bg-slate-900/10 rounded-3xl border border-slate-100 dark:border-white/[0.04] text-center max-w-[280px] mx-auto">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3 border border-slate-200/40 dark:border-white/5 shadow-inner">
              <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 stroke-[1.5px]" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Код-пароль не установлен</h4>
            <p className="text-[10px] text-slate-500 leading-normal mb-4">
              Защитите запуск приложения и финансовые показатели от посторонних.
            </p>
            <button
              onClick={handleToggle}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-bold rounded-xl active:scale-95 shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 transition-all flex items-center gap-2 cursor-pointer outline-none"
            >
              <span>Включить защиту</span>
            </button>
          </div>
        ) : (
          /* PASSCODE ENABLED: iOS/Telegram Glassmorphic Pane Layout */
          <div className="space-y-3">
            {/* Action Group Block */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-white/[0.05] overflow-hidden p-0.5 space-y-0.5">
              {/* Row 1: Изменить код-пароль */}
              <button
                type="button"
                onClick={() => {
                  setVerificationType('change');
                  setPinInput('');
                  setPinConfirm('');
                  setShowPinSetup(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer text-left active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                    <Key size={14} className="stroke-[2px]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">Изменить код-пароль</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500" />
              </button>

              {/* Divider */}
              <div className="h-px bg-slate-200/50 dark:bg-white/[0.05] mx-3" />

              {/* Row 2: Выключить код-пароль */}
              <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                    <Lock size={14} className="stroke-[2px]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">Выключить код-пароль</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Auto-lock Group Block (Auto-lock / Автоблокировка) */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-white/[0.05] p-0.5 relative" ref={dropdownRef}>
              <div 
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer text-left active:scale-[0.98]"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <ChevronDown size={14} className={cn("stroke-[2.2px] transition-transform duration-300", isDropdownOpen ? "rotate-180" : "-rotate-90")} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">Автоблокировка</span>
                    <span className="text-[9px] text-slate-400 font-medium">Запрашивать код-пароль</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/[0.05] shadow-sm select-none">
                  <span className="text-[9px] font-bold text-primary-600 dark:text-primary-400">
                    {timeoutOptions.find(o => o.value === (lockSettings?.timeoutMinutes || 0))?.label || 'Сразу'}
                  </span>
                </div>
              </div>

              {/* Floating Dropdown List on top of other content */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-2 mt-1 w-48 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-slate-200/60 dark:border-white/[0.08] z-[120] flex flex-col p-1.5 gap-0.5"
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
                            "w-full px-3 py-2 text-left text-xs rounded-xl font-bold transition-all border border-transparent flex items-center justify-between cursor-pointer focus:outline-none",
                            isSelected 
                              ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 font-black" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Biometrics Group Block */}
            {isBiometricsAvail && (
              <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-white/[0.05] p-2.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <Fingerprint size={14} className="stroke-[2px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-xs font-bold text-slate-800 dark:text-slate-100">Вход по Touch ID / Face ID</span>
                      <span className="text-[9px] text-slate-400 font-medium">Быстрая разблокировка</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBiometrics}
                    className={cn(
                      "w-10 h-5.5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer outline-none active:scale-95",
                      lockSettings?.useBiometrics ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                      lockSettings?.useBiometrics ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {lockSettings?.useBiometrics && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/30 dark:border-white/[0.05]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Устройств: {lockSettings.credentialIds?.length || 1}
                      </span>
                      {isThisDeviceBound ? (
                        <div className="flex items-center gap-1.5">
                          {lockSettings.credentialIds && lockSettings.credentialIds.length > 1 && (
                            <button
                              type="button"
                              onClick={async () => {
                                const localId = localStorage.getItem('localBiometricCredId');
                                if (!localId) return;
                                try {
                                  await updateLockSettings({
                                    credentialId: localId,
                                    credentialIds: [localId]
                                  });
                                  addToast('Все остальные устройства успешно сброшены');
                                } catch (err) {
                                  addToast('Ошибка сброса устройств', 'error');
                                }
                              }}
                              className="text-[8px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-md h-6 flex items-center cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all outline-none"
                            >
                              Сбросить остальные
                            </button>
                          )}
                          <div className="text-[8px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md h-6 flex items-center shadow-sm">
                            Устройство привязано
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const currentIds = lockSettings.credentialIds || (lockSettings.credentialId ? [lockSettings.credentialId] : []);
                              
                              // First, check if this physical device already owns one of the current keys
                              if (currentIds.length > 0) {
                                try {
                                  const ver = await verifyBiometricCredential(currentIds);
                                  if (ver && ver.id) {
                                    localStorage.setItem('localBiometricCredId', ver.id);
                                    localStorage.setItem('isBiometricBound', 'true');
                                    setIsThisDeviceBound(true);
                                    addToast('Устройство успешно распознано и связано');
                                    return;
                                  }
                                } catch (verErr: any) {
                                  const errMsg = verErr?.message?.toLowerCase() || '';
                                  // User manually pressed "Cancel" during verification prompt, so we abort to respect their choice
                                  if (verErr?.name === 'NotAllowedError' && !errMsg.includes('credential')) {
                                    addToast('Привязка отклонена');
                                    return;
                                  }
                                  // If they got 'No credential matches' etc, we proceed to create a new key
                                }
                              }

                              // Register new credential if not matched/available
                              const cred = await registerBiometricCredential(appSettings.userId || 'local_user', `Device_${Date.now()}`);
                              const newIds = Array.from(new Set([...currentIds, cred.id]));
                              await updateLockSettings({ credentialId: cred.id, credentialIds: newIds });
                              localStorage.setItem('localBiometricCredId', cred.id);
                              localStorage.setItem('isBiometricBound', 'true');
                              setIsThisDeviceBound(true);
                              addToast('Это устройство добавлено в список разрешенных');
                            } catch (err) {
                              console.error(err);
                              addToast('Ошибка регистрации ключа устройства', 'error');
                            }
                          }}
                          className="text-[8px] font-black uppercase tracking-wider text-deposit-500 hover:text-deposit-600 transition-colors bg-deposit-500/10 hover:bg-deposit-500/20 px-2 py-1 rounded-md h-6 flex items-center cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all outline-none"
                        >
                          Привязать это устройство
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Apple-footer style details text */}
            <p className="text-[9.5px] leading-relaxed text-slate-400 dark:text-slate-500 font-medium px-3 text-center">
              Важно: если вы забудете код-пароль, потребуется сбросить локальные данные устройства и авторизоваться заново.
            </p>
          </div>
        )}
      </div>

      {/* PIN Setup Modal Portal (Headless UI Transition + Dialog) */}
      <AnimatePresence>
        {showPinSetup && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setShowPinSetup(false)} static>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Panel as={Fragment}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="p-6 py-10 sm:py-8 max-w-[350px] w-full flex flex-col items-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] shadow-2xl relative overflow-hidden pointer-events-auto rounded-t-[32px] sm:rounded-[32px]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-5 mt-2 sm:mt-0">
                    <Lock size={22} className="stroke-[1.8px]" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-slate-950 dark:text-white mb-1.5 text-center">
                    {verificationType !== null 
                      ? 'Введите код-пароль' 
                      : step === 1 
                        ? 'Придумайте код-пароль' 
                        : 'Повторите код-пароль'}
                  </h3>
                  <p className="text-[11px] sm:text-[10px] text-slate-500 font-medium text-center mb-8">
                    {verificationType !== null 
                      ? 'Введите текущие 4 цифры для подтверждения' 
                      : '4 цифры для защиты входа'}
                  </p>

                <motion.div 
                  animate={isErrorShake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex justify-center gap-4 mb-10"
                >
                  {[0, 1, 2, 3].map(i => {
                    const isConfirming = verificationType === null && step === 2;
                    const val = isConfirming ? pinConfirm[i] : pinInput[i];
                    return (
                      <div key={i} className={cn(
                        "w-4 h-4 rounded-full transition-all duration-200",
                        isErrorShake 
                          ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] scale-110" 
                          : val 
                            ? "bg-primary-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110" 
                            : "bg-slate-200 dark:bg-slate-700/60"
                      )} />
                    );
                  })}
                </motion.div>

                <div className="grid grid-cols-3 gap-y-4 gap-x-6 mb-8 w-full max-w-[280px]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        vibrate(30);
                        const isConfirming = verificationType === null && step === 2;
                        if (isConfirming) {
                          if (pinConfirm.length < 4) setPinConfirm(prev => prev + num);
                        } else {
                          if (pinInput.length < 4) setPinInput(prev => prev + num);
                        }
                      }}
                      className="w-16 h-16 rounded-full flex mx-auto items-center justify-center text-2xl font-light text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 bg-slate-50 dark:bg-slate-900/50 cursor-pointer outline-none"
                    >
                      {num}
                    </button>
                  ))}
                  <div />
                  <button
                    type="button"
                    onClick={() => {
                      vibrate(30);
                      const isConfirming = verificationType === null && step === 2;
                      if (isConfirming) {
                        if (pinConfirm.length < 4) setPinConfirm(prev => prev + 0);
                      } else {
                        if (pinInput.length < 4) setPinInput(prev => prev + 0);
                      }
                    }}
                    className="w-16 h-16 rounded-full flex mx-auto items-center justify-center text-2xl font-light text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 bg-slate-50 dark:bg-slate-900/50 cursor-pointer outline-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vibrate(30);
                      const isConfirming = verificationType === null && step === 2;
                      if (isConfirming) {
                        setPinConfirm(prev => prev.slice(0, -1));
                      } else {
                        setPinInput(prev => prev.slice(0, -1));
                      }
                    }}
                    className="w-16 h-16 rounded-full flex mx-auto items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-colors cursor-pointer outline-none"
                  >
                    <Delete size={22} className="stroke-[1.5px]" />
                  </button>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setShowPinSetup(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:opacity-80 transition-opacity cursor-pointer outline-none"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handlePinSubmit}
                    disabled={(verificationType === null && step === 2 ? pinConfirm.length : pinInput.length) !== 4}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-primary-500 text-white disabled:opacity-50 hover:bg-primary-600 transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)] cursor-pointer outline-none"
                  >
                    {verificationType !== null ? 'Готово' : step === 1 ? 'Далее' : 'Готово'}
                  </button>
                </div>
              </motion.div>
             </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  );
}

