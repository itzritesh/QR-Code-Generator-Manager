import React, { useRef, useState, forwardRef } from 'react';
import { HiOutlineCloudUpload, HiOutlineTrash } from 'react-icons/hi';
import { cn } from '../../utils/cn';

export interface FileInputProps {
  label?: string;
  helperText?: string;
  accept?: string;
  maxSizeMB?: number;
  value?: File | string | null;
  onChange: (file: File | null) => void;
  className?: string;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ label, helperText, accept, maxSizeMB = 5, value, onChange, className }, _ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(
      typeof value === 'string' ? value : value?.name || null
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        setFileName(file.name);
        onChange(file);
      }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0] || null;
      if (file) {
        setFileName(file.name);
        onChange(file);
      }
    };

    const removeFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onChange(null);
    };

    return (
      <div className={cn('space-y-1.5 text-left', className)}>
        {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-slate-50/60 hover:bg-slate-50',
            isDragging
              ? 'border-indigo-500 bg-indigo-50/30'
              : 'border-slate-300 hover:border-slate-400'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />

          {fileName ? (
            <div className="flex items-center gap-3 w-full max-w-sm justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="text-xs font-medium text-slate-700 truncate">{fileName}</span>
              <button
                type="button"
                onClick={removeFile}
                className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                title="Remove file"
              >
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <HiOutlineCloudUpload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-700">
                <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {accept ? accept.toUpperCase() : 'Images'} (max {maxSizeMB}MB)
              </p>
            </>
          )}
        </div>
        {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

FileInput.displayName = 'FileInput';
