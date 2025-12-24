import React, { useEffect, useId, useState } from 'react';
import logoPng from '../assets/teakonn-logo.png';

type LogoProps = {
  size?: number;
  variant?: 'mark' | 'lockup';
  theme?: 'gradient' | 'mono' | 'auto';
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function TeaKonnLogo({
  size = 48,
  variant = 'mark',
  theme = 'auto',
  animated = false,
  className,
  ariaLabel = 'TeaKonn logo',
}: LogoProps) {
  const gid = useId();
  const gradientId = `tk-grad-${gid}`;
  const [prefersDark, setPrefersDark] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      const update = () => setPrefersDark(mq.matches);
      update();
      mq.addEventListener?.('change', update);
      return () => mq.removeEventListener?.('change', update);
    } catch {
      setPrefersDark(null);
    }
  }, []);

  const effectiveTheme: 'gradient' | 'mono' = (() => {
    if (theme === 'auto') {
      if (prefersDark === null) return 'gradient';
      return prefersDark ? 'gradient' : 'mono';
    }
    return theme === 'mono' ? 'mono' : 'gradient';
  })();

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: effectiveTheme === 'mono' ? '#111' : undefined }}
    >
      {effectiveTheme === 'mono' ? (
        // Light theme: use provided wordmark image
        <img
          src={logoPng}
          alt={ariaLabel}
          width={size}
          height={size}
          style={{ display: 'block', objectFit: 'contain' }}
        />
      ) : (
        <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        role="img"
        aria-label={ariaLabel}
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
        >
        <title>{ariaLabel}</title>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="60%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>

        {/* Chat bubble base with tail */}
        <g fill={`url(#${gradientId})`}>
          <path d="M40 55a25 25 0 0 1 25-25h70a25 25 0 0 1 25 25v60a25 25 0 0 1-25 25H95l-25 25 5-25H65a25 25 0 0 1-25-25V55z" />
          {/* Tea leaf carved via overlay (knockout style using white fill for simplicity) */}
          <path d="M80 90c0-20 17-35 40-35 5 0 10 1 14 2-9 7-15 16-17 27a38 38 0 0 0 16-4c-6 16-22 28-38 28-9 0-15-6-15-18z" fill={`url(#${gradientId})`} />
        </g>

        {animated && (
          <g opacity="0.0">
            <circle cx="160" cy="40" r="6" fill={theme === 'mono' ? 'currentColor' : `url(#${gradientId})`}>
              <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="r" values="6;10;6" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
        </svg>
      )}

      {variant === 'lockup' && (
        <span
          style={{
            fontWeight: 700,
            letterSpacing: 0.2,
            fontSize: Math.round(size * 0.42),
            lineHeight: 1,
          }}
        >
          TeaKonn
        </span>
      )}
    </div>
  );
}
