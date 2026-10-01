import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantStyles = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md h-4 w-full',
  };

  return (
    <div
      style={{ width, height }}
      className={cn(
        'animate-pulse bg-slate-200/80',
        variantStyles[variant],
        className
      )}
    />
  );
};
