import React from 'react';
import logoPng from '../assets/teakonn-logo.png';

type LogoProps = {
  size?: number;
  className?: string;
  ariaLabel?: string;
};

export function TeaKonnLogo({
  size = 48,
  className,
  ariaLabel = 'TeaKonn logo',
}: LogoProps) {
  return (
    <img
      src={logoPng}
      alt={ariaLabel}
      style={{ display: 'block', height: size, width: 'auto', objectFit: 'contain' }}
      className={className}
    />
  );
}
