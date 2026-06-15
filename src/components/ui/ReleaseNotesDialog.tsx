import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Sparkles, CheckCircle2, Star, Bug, X } from 'lucide-react';
import { changelog } from '../../data/changelog';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export function ReleaseNotesDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);

  const LATEST_VERSION = changelog[0].version;

  useEffect(() => {
    // Check if we need to auto-show it
    const lastSeen = localStorage.getItem('last_seen_version');
    if (lastSeen !== LATEST_VERSION) {
      // Delay slightly for dramatic effect
      const timer = setTimeout(() => {
        setIsOpen(true);
        setIsManual(false);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Subscribe to manual open events
    const handleOpenNotes = () => {
      setIsOpen(true);
      setIsManual(true);
    };
    window.addEventListener('app:show_release_notes', handleOpenNotes);
    return () => window.removeEventListener('app:show_release_notes', handleOpenNotes);
  }, [LATEST_VERSION]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('last_seen_version', LATEST_VERSION);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300 transform"
              enterFrom="opacity-0 translate-y-8 sm:translate-y-12 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200 transform"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-8 sm:translate-y-12 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2rem] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-0 text-left align-middle shadow-2xl transition-all border border-slate-200/50 dark:border-white/10 relative">
                
                {/* Header Graphic */}
                <div className="relative pt-12 pb-8 px-6 overflow-hidden bg-gradient-to-b from-primary-50/50 to-transparent dark:from-primary-900/20 dark:to-transparent">
                  <div className="absolute top-0 right-0 p-4 z-20">
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-800 dark:hover:text-white backdrop-blur-md transition-all active:scale-90 border border-slate-200/50 dark:border-slate-700/50"
                    >
                      <X className="w-4 h-4 stroke-[2.5px]" />
                    </button>
                  </div>
                  
                  {/* Decorative glow: transform-gpu fixes Safari overflow clipping bugs */}
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
                <div className="px-6 pb-6 overflow-y-auto max-h-[50vh] scrollbar-hide">
                  <div className="space-y-6">
                    {changelog.map((release, i) => (
                      <div key={release.version} className={cn(
                        "relative",
                        i !== 0 && "opacity-60 grayscale-[50%] hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                      )}>
                        {/* Only show version tag if it's not the latest, to save space, but let's show it in a compact way */}
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
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-white/5 rounded-b-[2rem]">
                  <button
                    onClick={handleClose}
                    className="apple-button w-full bg-primary-500 hover:bg-primary-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
                  >
                    Понятно, спасибо!
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
