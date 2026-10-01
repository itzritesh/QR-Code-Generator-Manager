import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | React.ReactNode;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, description, disabled = false, id, className }, ref) => {
    return (
      <div className={cn('flex items-center justify-between gap-4 text-left', className)}>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-slate-800 select-none">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-slate-500 mt-0.5">{description}</span>
            )}
          </div>
        )}
        <button
          id={id}
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            checked ? 'bg-indigo-600' : 'bg-slate-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
