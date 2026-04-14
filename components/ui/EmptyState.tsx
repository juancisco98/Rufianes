import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** EmptyState — placeholder para listas vacías estilo iOS. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
    {icon && (
      <div className="w-16 h-16 rounded-full bg-ios-grouped dark:bg-iosDark-grouped flex items-center justify-center text-ios-label2 dark:text-iosDark-label2 mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-[17px] font-semibold text-ios-label dark:text-iosDark-label mb-1">{title}</h3>
    {description && (
      <p className="text-[14px] text-ios-label2 dark:text-iosDark-label2 max-w-xs">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
