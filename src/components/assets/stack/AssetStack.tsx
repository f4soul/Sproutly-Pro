import React, { Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AssetStackProps<T> {
  items: T[];
  isExpanded: boolean;
  onToggle: () => void;
  renderAggregate: () => React.ReactNode;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T) => string;
  accentClassName?: string;
  groupTitle: string;
}

export function AssetStack<T>({
  items,
  isExpanded,
  onToggle,
  renderAggregate,
  renderItem,
  getItemKey,
  accentClassName = "bg-slate-500",
  groupTitle
}: AssetStackProps<T>) {
  if (items.length === 1) {
    return (
      <div className="w-full">
        {renderItem(items[0], 0)}
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        {/* Aggregate Card / Group Header */}
        <div 
          className="relative w-full cursor-pointer group isolate z-20 hover:-translate-y-1 transition-transform duration-300"
          onClick={onToggle}
          style={{ marginBottom: `${Math.min(items.length - 1, 2) * 8}px` }}
        >
          <div className="relative z-20 w-full transition-all duration-300">
            {renderAggregate()}
          </div>
          
          {/* Peeking cards for stack effect */}
          {items.length > 1 && (
            <div 
              className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-[1.8rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.14] shadow-sm transition-all duration-300 z-[19] translate-y-2 scale-[0.96] group-hover:translate-y-2.5"
            />
          )}
          {items.length > 2 && (
            <div 
              className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-[1.8rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/30 dark:border-white/[0.10] shadow-sm transition-all duration-300 z-[18] translate-y-4 scale-[0.92] group-hover:translate-y-5"
            />
          )}
        </div>
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <Dialog as="div" className="relative z-[100]" open={isExpanded} onClose={onToggle} static>
            <div className="fixed inset-y-0 right-0 left-0 md:left-68 flex items-end pointer-fine:items-center justify-center p-0 pointer-fine:p-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 cursor-pointer pointer-events-auto"
                onClick={onToggle}
              />
              <Dialog.Panel as={Fragment}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 100 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 100 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                  className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-t-[2rem] rounded-b-none pointer-fine:rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto border border-slate-200/60 dark:border-white/[0.08] flex flex-col max-h-[90vh] pointer-fine:max-h-[85vh]"
                >
                  {/* Modal Header */}
                  <div className="sticky top-0 z-20 px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200/50 dark:border-white/[0.05] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest truncate pr-4">{groupTitle}</h3>
                    <button 
                      onClick={onToggle}
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all"
                    >
                      <X size={18} className="stroke-[2.5px]" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {items.map((item, index) => (
                      <div key={getItemKey(item)} className="relative flex items-stretch ml-1 pl-3">
                        <div className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-60", accentClassName)} />
                        <div className="flex-1 min-w-0">
                          {renderItem(item, index)}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}

