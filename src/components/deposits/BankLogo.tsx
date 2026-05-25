import React from 'react';

interface BankLogoProps {
  logoUrl?: string;
  alt?: string;
  className?: string;
}

export const BankLogo: React.FC<BankLogoProps> = ({ logoUrl, alt, className }) => {
  if (!logoUrl) return null;

  // Check if it's one of our built-in banks
  const isBuiltIn = logoUrl.startsWith('/logos/') && logoUrl.endsWith('.svg');
  
  if (isBuiltIn) {
    // Extract name, e.g. "/logos/tbank.svg" -> "tbank"
    const name = logoUrl.substring('/logos/'.length, logoUrl.length - '.svg'.length);
    return (
      <svg className={className} aria-label={alt}>
        <use href={`#icon-${name}`} />
      </svg>
    );
  }

  // Fallback to standard img tag for custom image uploads
  return <img src={logoUrl} alt={alt || ""} className={className} />;
};
