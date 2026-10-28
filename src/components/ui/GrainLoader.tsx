import React from 'react';

/**
 * Порядок следования зёрен по гармоническому цветовому кругу:
 * 0°:   доходы (синий)
 * 72°:  наличные (изумрудный)
 * 144°: крипта (янтарный)
 * 216°: инвестиции (бирюзовый)
 * 288°: вклады (тиловый)
 */
const GRAINS = [
  'bg-primary-500 dark:bg-primary-400',   // доходы (синий)
  'bg-cash-500 dark:bg-cash-400',         // наличные (изумрудный)
  'bg-crypto-500 dark:bg-crypto-400',     // крипта (янтарный)
  'bg-invest-500 dark:bg-invest-400',     // инвестиции (бирюзовый)
  'bg-deposit-500 dark:bg-deposit-400',   // вклады (тиловый)
] as const;

interface GrainLoaderProps {
  size?: number;
  label?: string;
}

export const GrainLoader: React.FC<GrainLoaderProps> = ({ size = 40, label }) => (
  <div className="flex flex-col items-center gap-4" role="status" aria-label={label ?? 'Загрузка'}>
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {GRAINS.map((bg, i) => (
        <span key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 72}deg)` }} aria-hidden="true">
          <span
            className={`animate-grain absolute left-1/2 top-1/2 h-2 w-2 -ml-1 -mt-1 rounded-full ${bg}`}
            style={{ translate: `0 -${size / 2}px`, animationDelay: `${(i * 0.13).toFixed(2)}s` }}
          />
        </span>
      ))}
    </div>
    {label && <span className="text-sm font-medium text-slate-400">{label}</span>}
  </div>
);
