import React, { useEffect, useRef } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => closeOnBackdrop && onClose()}
      />

      {/* Dialog Window */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-white rounded-2xl border border-slate-200 shadow-elevated z-10 overflow-hidden transform transition-all duration-200 text-left',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between">
            <div className="space-y-1 pr-4 sm:pr-6">
              {typeof title === 'string' ? (
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-none">{title}</h3>
              ) : (
                title
              )}
              {description && (
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close dialog"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
