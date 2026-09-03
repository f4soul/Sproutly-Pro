import React, { useState, useEffect, Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, Star, Bug, X } from 'lucide-react';
import { changelog } from '../../data/changelog';
import { cn } from '../../lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/firebase';

export function ReleaseNotesDialog({ isLocked = false }: { isLocked?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [user, loading] = useAuthState(auth);
  const LATEST_VERSION = changelog[0].version;

  // Subscribe to manual open events
  useEffect(() => {
    const handleOpenNotes = () => {
      setIsOpen(true);
      setIsManual(true);
    };
    window.addEventListener('app:show_release_notes', handleOpenNotes);
    return () => window.removeEventListener('app:show_release_notes', handleOpenNotes);
  }, []);

  // Auto-show release notes
  useEffect(() => {
    if (isLocked || loading) {
      return;
    }

    const lastSeen = localStorage.getItem('last_seen_version');
    const hasOnboarded = localStorage.getItem('hasOnboarded') === 'true';

    if (hasOnboarded && lastSeen !== LATEST_VERSION) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setIsManual(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [LATEST_VERSION, isLocked, loading]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('last_seen_version', LATEST_VERSION);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog as="div" className="relative z-[100]" open={true} onClose={handleClose} static>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-y-0 right-0 left-0 md:left-68 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 left-0 md:left-68 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none z-[100]">
            <Dialog.Panel as={Fragment}>
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md transform overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-0 text-left align-middle shadow-2xl border border-slate-200/50 dark:border-white/10 relative pointer-events-auto flex flex-col max-h-[90dvh] sm:max-h-[90vh]"
              >
                {/* Header Graphic */}
                <div className="relative pt-12 pb-8 px-6 overflow-hidden bg-gradient-to-b from-primary-50/50 to-transparent dark:from-primary-900/20 dark:to-transparent shrink-0">
                  <div className="absolute top-0 right-0 p-4 z-20">
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-800 dark:hover:text-white backdrop-blur-md transition-all active:scale-90 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[2.5px]" />
                    </button>
                  </div>
                  
                  {/* Decorative glow */}
                  <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-primary-500/20 dark:bg-primary-500/30 rounded-full blur-3xl transform-gpu" style={{ WebkitTransform: 'translate3d(0,0,0)' }} />
                  
                  <div className="flex flex-col items-center justify-center text-center relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="w-14 h-14 bg-white/80 dark:bg-slate-900/80 shadow-xl border border-slate-200/50 dark:border-white/10 rounded-2xl flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7 text-primary-500 shrink-0" />
                    </div>
                    <Dialog.Title as="h3" className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                      {isManual ? 'История обновлений' : 'Что нового?'}
                    </Dialog.Title>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                      Версия {LATEST_VERSION}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 overflow-y-auto scrollbar-hide flex-1">
                  <div className="space-y-6">
                    {changelog.map((release, i) => (
                      <div key={release.version} className={cn(
                        "relative",
                        i !== 0 && "opacity-60 grayscale-[50%] hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                      )}>
                        {i !== 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">v{release.version}</span>
                            <div className="h-px w-full flex-1 bg-slate-200 dark:bg-slate-800/50" />
                            <span className="text-[10px] font-bold text-slate-400">{new Date(release.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                        {i === 0 && (
                          <div className="mb-4">
                            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {release.title}
                            </h4>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              {new Date(release.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          {release.features && release.features.length > 0 && (
                            <div>
                               <div className="flex items-center gap-1.5 mb-2">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">Новое</span>
                              </div>
                              <ul className="space-y-2">
                                {release.features.map((feat, idx) => (
                                  <li key={idx} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {release.improvements && release.improvements.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-deposit-500" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-deposit-600 dark:text-deposit-500">Улучшения</span>
                              </div>
                              <ul className="space-y-2">
                                {release.improvements.map((imp, idx) => (
                                  <li key={idx} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                    <div className="w-1.5 h-1.5 rounded-full bg-deposit-500 shrink-0 mt-1.5" />
                                    <span>{imp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {release.fixes && release.fixes.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Bug className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500">Исправления</span>
                              </div>
                              <ul className="space-y-2">
                                {release.fixes.map((fix, idx) => (
                                  <li key={idx} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                    <span>{fix}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4 sm:rounded-b-[32px] bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-white/5 shrink-0">
                  <button
                    onClick={handleClose}
                    className="apple-button w-full bg-primary-500 hover:bg-primary-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
                  >
                    Понятно, спасибо!
                  </button>
                </div>
              </motion.div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
