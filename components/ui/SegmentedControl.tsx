import React from 'react';
import { hapticTap } from '../../utils/haptics';

interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/**
 * SegmentedControl — tabs estilo iOS (pill background con indicador animado).
 * Reemplaza tabs ad-hoc en BarberPortal, Analytics, etc.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
  fullWidth = true,
  className = '',
}: SegmentedControlProps<T>) {
  const sizeClasses = size === 'sm'
    ? 'h-8 text-[12px] p-0.5 rounded-xl'
    : 'h-10 text-[13px] p-1 rounded-2xl';

  const itemSize = size === 'sm' ? 'rounded-lg px-2.5' : 'rounded-xl px-3';

  return (
    <div
      className={[
        'inline-flex relative',
        'bg-ios-grouped dark:bg-iosDark-grouped',
        sizeClasses,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      role="tablist"
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { hapticTap(); onChange(seg.value); }}
            className={[
              'relative flex items-center justify-center gap-1.5 font-medium',
              'transition-all duration-200 select-none',
              itemSize,
              fullWidth ? 'flex-1' : '',
              active
                ? 'bg-white dark:bg-iosDark-bg2 text-ios-label dark:text-iosDark-label shadow-ios-sm'
                : 'text-ios-label2 dark:text-iosDark-label2 active:opacity-70',
            ].join(' ')}
          >
            {seg.icon}
            <span className="truncate">{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
