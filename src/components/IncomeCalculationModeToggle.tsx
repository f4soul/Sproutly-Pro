import { cn } from '../lib/utils';

interface IncomeCalculationModeToggleProps {
  value: 'salary' | 'combined';
  onChange: (mode: 'salary' | 'combined') => void;
}

export function IncomeCalculationModeToggle({ value, onChange }: IncomeCalculationModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange('salary')}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
          value === 'salary'
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
        )}
      >
        Только зарплата
      </button>
      <button
        onClick={() => onChange('combined')}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
          value === 'combined'
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
        )}
      >
        Зарплата + вклады
      </button>
    </div>
  );
}
