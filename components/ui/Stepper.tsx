import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { hapticTap } from '../../utils/haptics';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/** Stepper — control − N + estilo iOS Reminders. */
export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  disabled,
  size = 'md',
}) => {
  const sizes = {
    sm: { btn: 'w-7 h-7', text: 'min-w-[28px] text-sm' },
    md: { btn: 'w-9 h-9', text: 'min-w-[36px] text-[15px]' },
  }[size];

  const dec = () => { if (!disabled && value - step >= min) { hapticTap(); onChange(value - step); } };
  const inc = () => { if (!disabled && value + step <= max) { hapticTap(); onChange(value + step); } };

  return (
    <div className="inline-flex items-center bg-ios-grouped dark:bg-iosDark-grouped rounded-full p-0.5">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className={`${sizes.btn} flex items-center justify-center rounded-full bg-white dark:bg-iosDark-bg2 shadow-ios-sm text-ios-label dark:text-iosDark-label active:scale-90 transition-transform disabled:opacity-30`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className={`px-3 text-center font-semibold text-ios-label dark:text-iosDark-label tabular-nums ${sizes.text}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className={`${sizes.btn} flex items-center justify-center rounded-full bg-white dark:bg-iosDark-bg2 shadow-ios-sm text-ios-label dark:text-iosDark-label active:scale-90 transition-transform disabled:opacity-30`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Stepper;
