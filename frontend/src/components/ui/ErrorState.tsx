import React from 'react';
import { HiOutlineExclamationCircle, HiOutlineRefresh } from 'react-icons/hi';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An error occurred while loading this data. Please try again or check your connection.',
  onRetry,
  retryText = 'Try Again',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-rose-200/80 bg-rose-50/30',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 shadow-2xs">
        <HiOutlineExclamationCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <HiOutlineRefresh className="w-3.5 h-3.5 mr-1.5" />
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
};
