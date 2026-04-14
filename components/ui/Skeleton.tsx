import React from 'react';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

/** Skeleton — placeholder pulsante con shimmer estilo iOS. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', rounded = 'md' }) => {
  const r = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];
  return <div className={`ios-skeleton ${r} ${className}`} />;
};

export default Skeleton;
