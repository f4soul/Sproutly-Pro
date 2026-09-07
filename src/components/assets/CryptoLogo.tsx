import React from 'react';
import { Bitcoin as GenericBitcoin } from 'lucide-react';
import { Bitcoin, Ethereum, Tether, Ton } from '@thesvg/react';
import { cn } from '../../lib/utils';

interface CryptoLogoProps {
  ticker?: string;
  alt?: string;
  className?: string;
}

const LOGO_MAP: Record<string, React.FC<any>> = {
  usdt: Tether,
  btc: Bitcoin,
  eth: Ethereum,
  ton: Ton,
};

export const CryptoLogo: React.FC<CryptoLogoProps> = ({ ticker, alt, className }) => {
  if (!ticker) {
    return (
      <div className={cn("rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400", className || 'w-full h-full')} aria-label={alt || 'Crypto'}>
        <GenericBitcoin className="w-[60%] h-[60%] stroke-[2.5px]" />
      </div>
    );
  }

  const normalizedTicker = ticker.toLowerCase();
  const LogoComponent = LOGO_MAP[normalizedTicker];

  if (LogoComponent) {
    // btc and eth SVGs in @thesvg/react are drawn with circle center cy=15 in a 0 0 32 32 viewBox (1px above center).
    // A 1px downward translation aligns the circle center perfectly with the container's center.
    const isShifted = normalizedTicker === 'btc' || normalizedTicker === 'eth';
    return (
      <LogoComponent
        className={cn(className || 'w-full h-full', isShifted && 'translate-y-[1px]')}
        aria-label={alt || ticker}
      />
    );
  }

  return (
    <div className={cn("rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400", className || 'w-full h-full')} aria-label={alt || ticker}>
      <GenericBitcoin className="w-[60%] h-[60%] stroke-[2.5px]" />
    </div>
  );
};
