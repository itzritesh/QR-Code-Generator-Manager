import React from 'react';
import { HiOutlineDocumentSearch } from 'react-icons/hi';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-2xs">
        {icon || <HiOutlineDocumentSearch className="w-7 h-7" />}
      </div>
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
