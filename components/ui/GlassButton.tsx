import React from 'react';
import { hapticTap } from '../../utils/haptics';

type Variant = 'primary' | 'secondary' | 'glass' | 'destructive' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Disable haptic feedback on press */
  noHaptic?: boolean;
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-12 px-5 text-base rounded-2xl gap-2',
  xl: 'h-14 px-6 text-lg rounded-2xl gap-2.5',
};

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white font-semibold ' +
    'bg-gradient-to-b from-amber-400 to-amber-500 ' +
    'dark:from-amber-400 dark:to-amber-500 ' +
    'shadow-ios border border-amber-500/40 ' +
    'hover:from-amber-300 hover:to-amber-500 ' +
    'active:shadow-ios-pressed active:brightness-95',
  success:
    'text-white font-semibold ' +
    'bg-gradient-to-b from-emerald-400 to-emerald-600 ' +
    'shadow-ios border border-emerald-600/40 ' +
    'active:shadow-ios-pressed active:brightness-95',
  secondary:
    'text-ios-label dark:text-iosDark-label font-medium ' +
    'bg-white dark:bg-iosDark-bg2 ' +
    'border border-ios-border dark:border-iosDark-border ' +
    'shadow-ios-sm ' +
    'active:bg-ios-grouped dark:active:bg-iosDark-grouped active:shadow-ios-pressed',
  glass:
    'text-ios-label dark:text-iosDark-label font-medium ' +
    'bg-white/70 dark:bg-iosDark-surface backdrop-blur-ios ' +
    'border border-ios-border dark:border-iosDark-border ' +
    'shadow-ios ' +
    'active:bg-white/85 dark:active:bg-iosDark-bg2/85 active:shadow-ios-pressed',
  destructive:
    'text-white font-semibold ' +
    'bg-gradient-to-b from-red-400 to-red-600 ' +
    'shadow-ios border border-red-600/40 ' +
    'active:shadow-ios-pressed active:brightness-95',
  ghost:
    'text-ios-accent dark:text-amber-400 font-medium ' +
    'bg-transparent ' +
    'active:bg-ios-grouped dark:active:bg-iosDark-grouped',
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth,
  loading,
  iconLeft,
  iconRight,
  className = '',
  children,
  disabled,
  noHaptic,
  onClick,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!noHaptic) hapticTap();
    onClick?.(e);
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={handleClick}
      className={[
        'inline-flex items-center justify-center select-none',
        'transition-[transform,box-shadow,filter,background] duration-150',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-ios-glow',
        'disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
};

export default GlassButton;
