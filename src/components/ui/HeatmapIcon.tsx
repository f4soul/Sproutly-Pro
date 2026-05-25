import React from 'react';
import { cn } from '../../lib/utils';

interface HeatmapIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function HeatmapIcon({ className, ...props }: HeatmapIconProps) {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
      {...props}
    >
      <rect 
        x="3" y="4" width="18" height="17" rx="3" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      <path 
        d="M3 9H21" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      <path 
        d="M8 2V6" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M16 2V6" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      <rect x="6" y="12" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.2"/>
      <rect x="10.75" y="12" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.5"/>
      <rect x="15.5" y="12" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.9"/>
      
      <rect x="6" y="16.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.7"/>
      <rect x="10.75" y="16.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.3"/>
      <rect x="15.5" y="16.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.1"/>
    </svg>
  );
}
