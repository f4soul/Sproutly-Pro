import { cn } from '../../lib/utils';

interface EmptyStateProps {
  className?: string;
}

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("flex w-full items-center justify-center py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-70", className)}>
      Нет данных
    </div>
  );
}
