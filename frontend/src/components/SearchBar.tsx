import React from 'react';
import { Search } from 'lucide-react';

export type SearchBarProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  onEnter?: () => void;
};

/**
 * Responsive, accessible search bar with leading icon and consistent padding.
 * Uses the global .input + .input.has-leading-icon styles.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel = 'Search',
  className = '',
  maxLength = 100,
  inputMode = 'search',
  onEnter,
}: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
      <input
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-4 py-2 rounded-lg input has-leading-icon"
        maxLength={maxLength}
        inputMode={inputMode}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
      />
    </div>
  );
}
