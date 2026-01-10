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
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* The Assembly: 4 Squares in a 2x2 grid, rotated 45 degrees to form diamonds */}
      {/* Grid Bounding Box: 70x70 centered. Gap: 4px. Square size: 33px. */}
      <g transform="rotate(45 50 50)">
          <rect x="15" y="15" width="33" height="33" rx="3" />
          <rect x="52" y="15" width="33" height="33" rx="3" />
          <rect x="15" y="52" width="33" height="33" rx="3" />
          <rect x="52" y="52" width="33" height="33" rx="3" />
      </g>
    </svg>
  );
};