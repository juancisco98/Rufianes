import React, { forwardRef } from 'react';

interface IOSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Variante visual */
  variant?: 'filled' | 'outlined';
}

/**
 * IOSInput — input con label arriba estilo iOS Forms.
 * Soporta error highlighting y íconos a izquierda/derecha.
 */
export const IOSInput = forwardRef<HTMLInputElement, IOSInputProps>(
  ({ label, helper, error, iconLeft, iconRight, variant = 'filled', className = '', id, ...rest }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;

    const base =
      'w-full text-[15px] text-ios-label dark:text-iosDark-label ' +
      'placeholder:text-ios-label3 dark:placeholder:text-iosDark-label3 ' +
      'focus:outline-none transition-all duration-150';

    const variants = {
      filled:
        'h-11 px-4 rounded-2xl bg-ios-grouped dark:bg-iosDark-grouped ' +
        'border border-transparent focus:border-ios-accent focus:bg-white dark:focus:bg-iosDark-bg2 focus:shadow-ios-glow',
      outlined:
        'h-11 px-4 rounded-2xl bg-white dark:bg-iosDark-bg2 ' +
        'border border-ios-border dark:border-iosDark-border focus:border-ios-accent focus:shadow-ios-glow',
    };

    const errorClasses = error
      ? '!border-ios-red focus:!border-ios-red focus:!shadow-[0_0_0_4px_rgba(255,59,48,0.18)]'
      : '';

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-1.5 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-label2 dark:text-iosDark-label2 pointer-events-none">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              base,
              variants[variant],
              iconLeft ? 'pl-10' : '',
              iconRight ? 'pr-10' : '',
              errorClasses,
            ].join(' ')}
            {...rest}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-label2 dark:text-iosDark-label2">
              {iconRight}
            </span>
          )}
        </div>
        {(error || helper) && (
          <p className={`text-[12px] mt-1.5 ml-1 ${error ? 'text-ios-red' : 'text-ios-label2 dark:text-iosDark-label2'}`}>
            {error || helper}
          </p>
        )}
      </div>
    );
  }
);

IOSInput.displayName = 'IOSInput';
export default IOSInput;
