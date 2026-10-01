import React from 'react';
import {
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlineX,
} from 'react-icons/hi';
import { cn } from '../../utils/cn';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}) => {
  const variants = {
    info: {
      container: 'bg-indigo-50/80 border-indigo-200 text-indigo-900',
      icon: <HiOutlineInformationCircle className="w-5 h-5 text-indigo-600 shrink-0" />,
    },
    success: {
      container: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
      icon: <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    warning: {
      container: 'bg-amber-50/80 border-amber-200 text-amber-900',
      icon: <HiOutlineExclamation className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    danger: {
      container: 'bg-rose-50/80 border-rose-200 text-rose-900',
      icon: <HiOutlineXCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    },
  };

  const current = variants[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm text-left transition-all',
        current.container,
        className
      )}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold text-sm leading-tight">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <HiOutlineX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
