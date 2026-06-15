import React, { useRef } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { TableInput } from '../ui/TableInput';
import { cn } from '../../lib/utils';
import { PrivacyBlur } from '../ui/PrivacyBlur';
import { MonthData } from '../../types';

interface DaysCellPopoverProps {
  m: MonthData;
  monthIndex: number;
  handleMonthChange: (monthIndex: number, field: keyof MonthData, value: number) => void;
  isPrivate?: boolean;
}

export const DaysCellPopover = ({ m, monthIndex, handleMonthChange, isPrivate }: DaysCellPopoverProps) => {
  const isDefault = m.factDays === m.normDays;

  if (isPrivate) {
    return (
      <div className={cn(
        "flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-[11px] lg:text-xs xl:text-sm font-mono font-bold mx-auto border transition-colors",
        isDefault
          ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400"
          : "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
      )}>
        <span className="w-12 text-center">**</span>
      </div>
    );
  }

  return (
    <Popover className="relative flex justify-center">
      {({ open }) => (
        <>
          <Popover.Button
            className={cn(
              "flex items-center justify-center px-1.5 md:px-2 py-1 rounded-md text-[11px] lg:text-xs xl:text-sm font-mono font-bold mx-auto border outline-none transition-all",
              open ? "ring-2 ring-primary-500/50 border-primary-500" : isDefault
                ? "bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400"
                : "bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border-amber-200/50 dark:border-amber-800/30 text-amber-700 dark:text-amber-400",
              "min-w-[40px] md:min-w-[45px]"
            )}
            title="Изменить отработанные дни"
          >
            {isDefault ? m.factDays : `${m.factDays}/${m.normDays}`}
          </Popover.Button>

          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-1 scale-95"
          >
            <Popover.Panel className="absolute z-[100] mt-1 sm:mt-2 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] p-3 flex flex-col gap-3 w-[160px] top-full right-1/2 translate-x-1/2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Факт</label>
                  <TableInput
                    value={m.factDays}
                    onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)}
                    className="w-16 h-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-center font-mono font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-1"
                    isInteger={true}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Норма</label>
                  <TableInput
                    value={m.normDays}
                    onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)}
                    className="w-16 h-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-center font-mono font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-1"
                    isInteger={true}
                  />
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};
