import React from 'react';
import { hapticTap } from '../../utils/haptics';

interface IOSSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

/** IOSSwitch — toggle estilo iOS (verde cuando ON). */
export const IOSSwitch: React.FC<IOSSwitchProps> = ({
  checked,
  onChange,
  disabled,
  size = 'md',
  ariaLabel,
}) => {
  const sizes = {
    sm: { track: 'w-9 h-5', knob: 'w-4 h-4', translate: 'translate-x-4' },
    md: { track: 'w-[51px] h-[31px]', knob: 'w-[27px] h-[27px]', translate: 'translate-x-5' },
  }[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => { if (!disabled) { hapticTap(); onChange(!checked); } }}
      className={[
        'relative shrink-0 rounded-full transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:shadow-ios-glow',
        sizes.track,
        checked ? 'bg-ios-green' : 'bg-ios-label3 dark:bg-iosDark-label3',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 rounded-full bg-white shadow-ios-sm',
          'transition-transform duration-200 ease-out',
          sizes.knob,
          checked ? sizes.translate : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
};

export default IOSSwitch;
