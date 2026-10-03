import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  filters?: React.ReactNode;
  activeFiltersCount?: number;
  onResetFilters?: () => void;
  filterButtonLabel?: string;
  align?: 'center' | 'end' | 'start';
}

export function TableSearch({
  value,
  onChange,
  placeholder = 'Cari data...',
  className = '',
  filters,
  activeFiltersCount = 0,
  onResetFilters,
  filterButtonLabel = 'Filter',
  align = 'end',
}: TableSearchProps) {
  return (
    <div className={cn("flex items-center gap-2", filters ? "w-full sm:w-auto" : "relative max-w-sm w-full", className)}>
      <div className="relative flex-1 min-w-[140px] max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs sm:text-sm h-8.5 sm:h-9 rounded-xl focus-visible:ring-1"
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

      {filters && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant={activeFiltersCount > 0 ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8.5 sm:h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 shrink-0 transition-all cursor-pointer",
                  activeFiltersCount > 0
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterButtonLabel}</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent
            align={align}
            className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-3 z-50"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Filter Data</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount} aktif
                  </span>
                )}
              </div>
              {onResetFilters && (activeFiltersCount > 0 || value) && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {filters}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {onResetFilters && (activeFiltersCount > 0 || value) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-8.5 sm:h-9 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl shrink-0"
          title="Reset Semua Filter & Pencarian"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
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
