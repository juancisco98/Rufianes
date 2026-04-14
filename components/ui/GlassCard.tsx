import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variante visual */
  variant?: 'glass' | 'solid' | 'flat' | 'tinted';
  /** Padding interno preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Hace el borde más prominente para énfasis */
  emphasized?: boolean;
}

const PADDINGS = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * GlassCard — contenedor base estilo iOS.
 * - glass:   semi-transparente con backdrop-blur (sobre fondos coloridos / mapas)
 * - solid:   blanco/grafito sólido (default para listas y forms)
 * - flat:    sin shadow, solo background — para grouping interno
 * - tinted:  acento amber sutil (para CTA / highlights)
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'solid',
  padding = 'md',
  emphasized,
  className = '',
  children,
  ...rest
}) => {
  const base = 'rounded-2xl transition-all duration-200';
  const variants = {
    glass:
      'bg-white/72 dark:bg-iosDark-surface backdrop-blur-ios border border-ios-border dark:border-iosDark-border shadow-ios',
    solid:
      'bg-white dark:bg-iosDark-bg2 border border-ios-divider dark:border-iosDark-divider shadow-ios-sm',
    flat:
      'bg-ios-grouped dark:bg-iosDark-grouped',
    tinted:
      'bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 shadow-ios-sm',
  };
  const emp = emphasized ? 'shadow-ios ring-1 ring-ios-accent/20' : '';

  return (
    <div className={`${base} ${variants[variant]} ${PADDINGS[padding]} ${emp} ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default GlassCard;
