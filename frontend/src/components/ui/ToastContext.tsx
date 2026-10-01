import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineXCircle,
  HiOutlineX,
} from 'react-icons/hi';
import { cn } from '../../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );
  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title }),
    [addToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    [addToast]
  );
  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const config = {
            success: {
              border: 'border-emerald-200 bg-white text-slate-800',
              icon: <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
            },
            error: {
              border: 'border-rose-200 bg-white text-slate-800',
              icon: <HiOutlineXCircle className="w-5 h-5 text-rose-600 shrink-0" />,
            },
            warning: {
              border: 'border-amber-200 bg-white text-slate-800',
              icon: <HiOutlineExclamationCircle className="w-5 h-5 text-amber-600 shrink-0" />,
            },
            info: {
              border: 'border-indigo-200 bg-white text-slate-800',
              icon: <HiOutlineInformationCircle className="w-5 h-5 text-indigo-600 shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevated text-left animate-in slide-in-from-bottom-5 duration-200',
                config.border
              )}
            >
              <div className="mt-0.5">{config.icon}</div>
              <div className="flex-1 space-y-0.5">
                {toast.title && (
                  <h6 className="text-xs font-semibold text-slate-900 leading-tight">
                    {toast.title}
                  </h6>
                )}
                <p className="text-xs text-slate-600 leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                aria-label="Close notification"
              >
                <HiOutlineX className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
