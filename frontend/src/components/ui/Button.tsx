import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer whitespace-nowrap leading-none [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0';

    const variants = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-xs hover:shadow-sm border border-transparent',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-400 border border-slate-200/80 shadow-2xs',
      outline:
        'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 active:bg-slate-100 focus:ring-indigo-500 shadow-xs',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-xs hover:shadow-sm border border-transparent',
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200/80 focus:ring-slate-300 border border-transparent',
    };

    // Standard dimensions:
    // sm: height 36px, font size 13px, px-3.5, gap-1.5
    // md: height 40px, font size 14px, px-4, gap-2 (Desktop default)
    // lg: height 44px, font size 15px, px-5, gap-2.5 (Large CTA)
    const sizes = {
      sm: 'text-[13px] px-3.5 gap-1.5 h-9 min-h-[36px]',
      md: 'text-sm px-4 gap-2 h-10 min-h-[40px]',
      lg: 'text-[15px] font-semibold px-5 gap-2.5 h-11 min-h-[44px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : 'w-auto',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 shrink-0 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          leftIcon && (
            <span className="inline-flex shrink-0 items-center justify-center w-4 h-4 text-current [&>svg]:w-4 [&>svg]:h-4">
              {leftIcon}
            </span>
          )
        )}
        {(!isLoading || !loadingText) && children && (
          <span className="inline-flex items-center gap-1.5 leading-none">{children}</span>
        )}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center justify-center w-4 h-4 text-current [&>svg]:w-4 [&>svg]:h-4">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'sm',
      ariaLabel,
      icon,
      isLoading = false,
      className,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0';

    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-xs border border-transparent',
      secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-400 border border-slate-200/80 shadow-2xs',
      outline: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 active:bg-slate-100 focus:ring-indigo-500 shadow-xs',
      danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 focus:ring-rose-500 border border-rose-200/80',
      ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200/80 focus:ring-slate-300 border border-transparent',
    };

    // Standard Icon Button Dimensions:
    // sm: 36px x 36px (Ideal for tables and compact toolbars)
    // md: 40px x 40px (Standard toolbar action)
    // lg: 44px x 44px (Touch friendly CTA)
    const sizes = {
      sm: 'w-9 h-9 min-w-[36px] min-h-[36px]',
      md: 'w-10 h-10 min-w-[40px] min-h-[40px]',
      lg: 'w-11 h-11 min-w-[44px] min-h-[44px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * Shared 36px x 36px Table and Toolbar Action Icon
 */
export interface ActionIconProps extends Omit<IconButtonProps, 'size'> {
  size?: 'sm' | 'md';
}

export const ActionIcon = forwardRef<HTMLButtonElement, ActionIconProps>(
  ({ size = 'sm', variant = 'ghost', className, ...props }, ref) => {
    return (
      <IconButton
        ref={ref}
        size={size}
        variant={variant}
        className={cn(
          variant === 'ghost' && 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
          className
        )}
        {...props}
      />
    );
  }
);

ActionIcon.displayName = 'ActionIcon';
