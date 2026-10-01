import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ColorInputProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  helperText?: string;
  className?: string;
}

const defaultPresets = [
  '#000000',
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#DC2626', // Red
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#D97706', // Amber
  '#FFFFFF', // White
];

export const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  ({ label, value, onChange, presetColors = defaultPresets, helperText, className }, ref) => {
    return (
      <div className={cn('space-y-2 text-left', className)}>
        {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}
        <div className="flex items-center gap-2.5">
          {/* Native picker with styled trigger */}
          <div className="relative w-10 h-10 shrink-0 rounded-lg border border-slate-300 shadow-2xs overflow-hidden cursor-pointer">
            <input
              ref={ref}
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer opacity-0"
              title="Choose custom color"
            />
            <div
              className="w-full h-full border border-black/10 rounded-md"
              style={{ backgroundColor: value }}
            />
          </div>

          {/* Hex code text input */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            maxLength={7}
            className="w-28 uppercase font-mono text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {/* Quick preset color swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                style={{ backgroundColor: color }}
                className={cn(
                  'w-6 h-6 rounded-md border transition-transform hover:scale-110 active:scale-95 shadow-2xs',
                  value.toLowerCase() === color.toLowerCase()
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-slate-400'
                    : 'border-slate-300'
                )}
                title={color}
              />
            ))}
          </div>
        </div>
        {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

ColorInput.displayName = 'ColorInput';
