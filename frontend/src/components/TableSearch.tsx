import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TableSearch({
  value,
  onChange,
  placeholder = 'Cari data...',
  className = '',
}: TableSearchProps) {
  return (
    <div className={`relative max-w-sm w-full ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm focus-visible:ring-1"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          type="button"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function filterDataBySearch<T>(items: T[] | undefined | null, searchQuery: string, fields?: (keyof T | string)[]): T[] {
  if (!items) return [];
  if (!searchQuery.trim()) return items;

  const query = searchQuery.toLowerCase().trim();

  return items.filter((item) => {
    if (!item || typeof item !== 'object') return false;

    if (fields && fields.length > 0) {
      return fields.some((field) => {
        const path = (field as string).split('.');
        let val: any = item;
        for (const p of path) {
          val = val?.[p];
        }
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    }

    // Default recursive/flat search over object properties
    const checkValue = (val: any): boolean => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        return String(val).toLowerCase().includes(query);
      }
      if (typeof val === 'object') {
        return Object.values(val).some((nested) => checkValue(nested));
      }
      return false;
    };

    return Object.values(item).some((val) => checkValue(val));
  });
}
