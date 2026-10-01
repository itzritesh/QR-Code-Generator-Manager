import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string | React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex items-start gap-2.5 text-left">
        <div className="flex items-center h-5">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            className={cn(
              'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors cursor-pointer',
              error && 'border-rose-400',
              className
            )}
            {...props}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 select-none cursor-pointer">
            {label}
          </label>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          {error && <p className="text-xs text-rose-600 mt-0.5 font-medium">{error}</p>}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
