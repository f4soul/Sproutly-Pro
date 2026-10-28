import React, { useId } from 'react';

export type SpinnerVariant = 'gradient' | 'conic' | 'cycle';

interface SproutlySpinnerProps {
  size?: number;
  strokeWidth?: number;
  variant?: SpinnerVariant;
  className?: string;
}

/**
 * SproutlySpinner
 * Indeterminate loader featuring Sproutly's 5 brand colors in balanced chromatic harmony:
 * - 0%   Primary Blue (var(--color-primary-500, #3b82f6))  — Доходы
 * - 25%  Cash Emerald (var(--color-cash-500, #10b981))     — Наличные
 * - 50%  Crypto Amber (var(--color-crypto-500, #f59e0b))   — Крипта (теплый центр)
 * - 75%  Invest Cyan  (var(--color-invest-500, #06b6d4))   — Биржа
 * - 100% Deposit Teal (var(--color-deposit-500, #14b8a6))  — Вклады
 *
 * Variants:
 * 1. 'gradient' (default): Google Material expanding/contracting arc with all 5 colors
 *    blended simultaneously across the stroke via SVG linear gradient.
 * 2. 'conic': Continuous high-tech 360° sweeping stream where all 5 colors flow into a soft trailing fade
 *    using hardware-accelerated conic-gradient and radial mask.
 * 3. 'cycle': Google Material arc that transitions through the colors over time.
 */
export const SproutlySpinner: React.FC<SproutlySpinnerProps> = ({
  size = 20,
  strokeWidth = 3.5,
  variant = 'gradient',
  className = '',
}) => {
  const rawId = useId();
  const gradientId = `sproutly-grad-${rawId.replace(/[:]/g, '')}`;

  if (variant === 'conic') {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
        role="status"
        aria-label="Загрузка"
      >
        <div
          className="w-full h-full rounded-full will-change-transform"
          style={{
            background:
              'conic-gradient(from 0deg, var(--color-primary-500, #3b82f6) 0%, var(--color-cash-500, #10b981) 20%, var(--color-crypto-500, #f59e0b) 40%, var(--color-invest-500, #06b6d4) 60%, var(--color-deposit-500, #14b8a6) 80%, transparent 100%)',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${strokeWidth}px), #000 calc(100% - ${strokeWidth}px + 0.5px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${strokeWidth}px), #000 calc(100% - ${strokeWidth}px + 0.5px))`,
            animation: 'sproutly-spin 1.2s linear infinite',
            transformOrigin: '50% 50%',
          }}
        />
        <style>{`
          @keyframes sproutly-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const isGradient = variant === 'gradient';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Загрузка"
    >
      <div
        className="w-full h-full will-change-transform"
        style={{
          transformOrigin: '50% 50%',
          animation: 'sproutly-spin 2s linear infinite',
        }}
      >
        <svg
          viewBox="0 0 50 50"
          className="w-full h-full block"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isGradient && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary-500, #3b82f6)" />
                <stop offset="25%" stopColor="var(--color-cash-500, #10b981)" />
                <stop offset="50%" stopColor="var(--color-crypto-500, #f59e0b)" />
                <stop offset="75%" stopColor="var(--color-invest-500, #06b6d4)" />
                <stop offset="100%" stopColor="var(--color-deposit-500, #14b8a6)" />
              </linearGradient>
            </defs>
          )}
          <circle
            cx="25"
            cy="25"
            r="20"
            pathLength="100"
            fill="none"
            stroke={isGradient ? `url(#${gradientId})` : 'var(--color-primary-500, #3b82f6)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              animation: isGradient
                ? 'sproutly-sweep 1.333s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                : 'sproutly-sweep 1.333s cubic-bezier(0.4, 0, 0.2, 1) infinite, sproutly-colors 6.665s ease-in-out infinite',
            }}
          />
        </svg>
      </div>

      <style>{`
        @keyframes sproutly-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes sproutly-sweep {
          0% {
            stroke-dasharray: 12 88;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 62 38;
            stroke-dashoffset: -25;
          }
          100% {
            stroke-dasharray: 12 88;
            stroke-dashoffset: -100;
          }
        }
        @keyframes sproutly-colors {
          0%, 100% { stroke: #3b82f6; } /* Primary Blue */
          20%      { stroke: #10b981; } /* Cash Emerald */
          40%      { stroke: #f59e0b; } /* Crypto Amber */
          60%      { stroke: #06b6d4; } /* Invest Cyan */
          80%      { stroke: #14b8a6; } /* Deposit Teal */
        }
      `}</style>
    </div>
  );
};
