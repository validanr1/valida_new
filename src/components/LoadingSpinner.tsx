import React from 'react';

const LoadingSpinner = ({ size = 24, className = "" }: { size?: number; className?: string }) => {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-label="Carregando">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="status"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#0F3D44" />
          </linearGradient>
        </defs>

        <g>
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#0F3D44"
            strokeOpacity="0.2"
            strokeWidth="6"
          />

          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="url(#brandGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="90 160"
            strokeDashoffset="0"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 24 24"
              to="360 24 24"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>

          <circle cx="24" cy="24" r="5" fill="#16A34A" fillOpacity="0.15" />
        </g>
      </svg>
      <span className="sr-only">Carregando...</span>
    </div>
  );
};

export default LoadingSpinner;