import React, { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export const Table: React.FC<HTMLAttributes<HTMLTableElement>> = ({ className, ...props }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
    <table className={cn('w-full caption-bottom text-sm text-left', className)} {...props} />
  </div>
);

export const TableHeader: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <thead className={cn('bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold tracking-wider', className)} {...props} />
);

export const TableBody: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <tbody className={cn('divide-y divide-slate-100 text-slate-700', className)} {...props} />
);

export const TableRow: React.FC<HTMLAttributes<HTMLTableRowElement>> = ({ className, ...props }) => (
  <tr className={cn('transition-colors hover:bg-slate-50/60', className)} {...props} />
);

export const TableHead: React.FC<ThHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <th className={cn('px-5 py-3.5 text-xs font-semibold text-slate-600', className)} {...props} />
);

export const TableCell: React.FC<TdHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <td className={cn('px-5 py-3.5 align-middle text-xs sm:text-sm', className)} {...props} />
);
