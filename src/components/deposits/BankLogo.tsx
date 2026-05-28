import React from 'react';

interface BankLogoProps {
  logoUrl?: string;
  alt?: string;
  className?: string;
}

export const BankLogo: React.FC<BankLogoProps> = ({ logoUrl, alt, className }) => {
  const effectiveUrl = logoUrl || '/logos/bank-icon.svg';

  // Check if it's one of our built-in banks
  const isBuiltIn = effectiveUrl.startsWith('/logos/') && effectiveUrl.endsWith('.svg');
  
  if (isBuiltIn) {
    // Extract name, e.g. "/logos/tbank.svg" -> "tbank"
    const name = effectiveUrl.substring('/logos/'.length, effectiveUrl.length - '.svg'.length);
    return (
      <svg 
        className={`text-slate-800 dark:text-slate-200 transition-colors ${className || ''}`} 
        aria-label={alt}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <use href={`#icon-${name}`} />
      </svg>
    );
  }

  // Fallback to standard img tag for custom image uploads
  return <img src={effectiveUrl} alt={alt || ""} className={className} />;
};
