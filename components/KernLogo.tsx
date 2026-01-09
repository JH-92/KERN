
import React from 'react';

interface KernLogoProps {
  className?: string;
  size?: number;
}

export const KernLogo: React.FC<KernLogoProps> = ({ className = "text-emerald-600", size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Housing: Sturdy Box */}
      <rect x="10" y="10" width="80" height="80" rx="20" stroke="currentColor" strokeWidth="12" />
      
      {/* The Core: Central Power Source */}
      <rect x="38" y="38" width="24" height="24" rx="4" fill="currentColor" />
      
      {/* Axis Lines - Focus Indicators */}
      <path d="M50 10V25" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M50 75V90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M10 50H25" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M75 50H90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
};
