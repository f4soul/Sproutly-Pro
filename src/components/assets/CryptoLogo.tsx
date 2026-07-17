import React from 'react';
import { Bitcoin as GenericBitcoin } from 'lucide-react';
import { Bitcoin, Ethereum, Tether, Ton } from '@thesvg/react';

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
      <div className={`rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 ${className || 'w-full h-full'}`} aria-label={alt || 'Crypto'}>
        <GenericBitcoin className="w-[60%] h-[60%] stroke-[2.5px]" />
      </div>
    );
  }

  const normalizedTicker = ticker.toLowerCase();
  const LogoComponent = LOGO_MAP[normalizedTicker];

  if (LogoComponent) {
    return <LogoComponent className={className || 'w-full h-full'} aria-label={alt || ticker} />;
  }

  return (
    <div className={`rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 ${className || 'w-full h-full'}`} aria-label={alt || ticker}>
      <GenericBitcoin className="w-[60%] h-[60%] stroke-[2.5px]" />
    </div>
  );
};

