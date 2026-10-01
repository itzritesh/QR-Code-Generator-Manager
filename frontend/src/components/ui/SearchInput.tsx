import { InputHTMLAttributes, forwardRef } from 'react';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import { cn } from '../../utils/cn';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, placeholder = 'Search...', shortcut, ...props }, ref) => {
    const handleClear = () => {
      onChange('');
      if (onClear) onClear();
    };

    return (
      <div className="relative flex items-center w-full">
        <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
          <HiOutlineSearch className="w-4 h-4" />
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-16 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-slate-400',
            className
          )}
          {...props}
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              title="Clear search"
            >
              <HiOutlineX className="w-3.5 h-3.5" />
            </button>
          ) : shortcut ? (
            <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              {shortcut}
            </kbd>
          ) : null}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
