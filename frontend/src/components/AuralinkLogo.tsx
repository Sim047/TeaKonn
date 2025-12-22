// TeaKonnLogo.tsx - SVG logo component
export const TeaKonnLogo = ({ className = "w-16 h-16" }: { className?: string }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      
      {/* Outer ring */}
      <circle 
        cx="100" 
        cy="100" 
        r="85" 
        stroke="url(#logoGradient)" 
        strokeWidth="12" 
        fill="none"
      />
      
      {/* Middle ring */}
      <circle 
        cx="100" 
        cy="100" 
        r="60" 
        stroke="url(#logoGradient)" 
        strokeWidth="12" 
        fill="none"
      />
      
      {/* Inner ring */}
      <circle 
        cx="100" 
        cy="100" 
        r="35" 
        stroke="url(#logoGradient)" 
        strokeWidth="12" 
        fill="none"
      />
      
      {/* @ symbol tail extending from inner circle */}
      <path 
        d="M 140 100 L 140 135 Q 140 155 115 155" 
        stroke="url(#logoGradient)" 
        strokeWidth="12" 
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};
