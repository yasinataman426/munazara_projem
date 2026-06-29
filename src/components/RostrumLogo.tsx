import React from 'react';

interface RostrumLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const RostrumLogo: React.FC<RostrumLogoProps> = ({ 
  size = 32, 
  className,
  style 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <defs>
        <linearGradient id="rostrum-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      
      {/* Outer elegant solid ring representing the emblem boundary */}
      <circle 
        cx="32" 
        cy="32" 
        r="29" 
        stroke="url(#rostrum-logo-grad)" 
        strokeWidth="2" 
        opacity="0.95"
      />
      
      {/* Rostrum Silhouette */}
      {/* Top desk/table */}
      <path 
        d="M15 21h34l-5 5H20l-5-5z" 
        fill="url(#rostrum-logo-grad)" 
      />
      
      {/* 3 striped vertical columns representing a classic podium / forum structure */}
      <rect x="23.5" y="29" width="3.5" height="15" rx="1.75" fill="url(#rostrum-logo-grad)" />
      <rect x="30.25" y="29" width="3.5" height="15" rx="1.75" fill="url(#rostrum-logo-grad)" />
      <rect x="37" y="29" width="3.5" height="15" rx="1.75" fill="url(#rostrum-logo-grad)" />
      
      {/* Rostrum Base */}
      <rect x="18" y="47" width="28" height="3.5" rx="1.75" fill="url(#rostrum-logo-grad)" />
      
      {/* Sleek microphone neck & head */}
      <path 
        d="M26 21c0-5 3-7 6-7" 
        stroke="url(#rostrum-logo-grad)" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="13" r="1.5" fill="url(#rostrum-logo-grad)" />
    </svg>
  );
};
