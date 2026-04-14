import React from 'react';
import { ChevronRight } from 'lucide-react';
import { hapticTap } from '../../utils/haptics';

interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;            // p.ej. 'bg-ios-blue text-white'
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  trailing?: React.ReactNode; // sobreescribe value/chevron
  onClick?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * ListRow — fila estilo iOS Settings.
 * Usar dentro de un GlassCard variant="solid" padding="none" para look agrupado.
 * Pone divider abajo automáticamente excepto en el último.
 */
export const ListRow: React.FC<ListRowProps> = ({
  icon,
  iconBg = 'bg-ios-grouped dark:bg-iosDark-grouped',
  title,
  subtitle,
  value,
  trailing,
  onClick,
  showChevron,
  destructive,
  disabled,
  className = '',
}) => {
  const Tag: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      disabled={disabled}
      onClick={onClick ? () => { hapticTap(); onClick(); } : undefined}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 text-left',
        'transition-colors duration-100',
        onClick ? 'active:bg-ios-grouped dark:active:bg-iosDark-grouped' : '',
        disabled ? 'opacity-50' : '',
        className,
      ].join(' ')}
    >
      {icon && (
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={[
            'text-[15px] truncate',
            destructive ? 'text-ios-red' : 'text-ios-label dark:text-iosDark-label',
          ].join(' ')}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-[13px] text-ios-label2 dark:text-iosDark-label2 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {trailing ?? (
          value && (
            <span className="text-[15px] text-ios-label2 dark:text-iosDark-label2">{value}</span>
          )
        )}
        {showChevron && (
          <ChevronRight className="w-4 h-4 text-ios-label3 dark:text-iosDark-label3" />
        )}
      </div>
    </Tag>
  );
};

/** Group de filas con dividers automáticos */
export const ListGroup: React.FC<{
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}> = ({ children, header, footer, className = '' }) => {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {header && (
        <div className="text-[12px] uppercase tracking-wide font-medium text-ios-label2 dark:text-iosDark-label2 px-4 mb-1.5">
          {header}
        </div>
      )}
      <div className="bg-white dark:bg-iosDark-bg2 rounded-2xl overflow-hidden border border-ios-divider dark:border-iosDark-divider shadow-ios-sm">
        {items.map((child, idx) => (
          <React.Fragment key={idx}>
            {child}
            {idx < items.length - 1 && (
              <div className="ml-12 h-px bg-ios-divider dark:bg-iosDark-divider" />
            )}
          </React.Fragment>
        ))}
      </div>
      {footer && (
        <div className="text-[12px] text-ios-label2 dark:text-iosDark-label2 px-4 mt-1.5">
          {footer}
        </div>
      )}
    </div>
  );
};

export default ListRow;
