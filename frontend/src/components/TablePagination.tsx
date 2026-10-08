import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 50, 100],
  className = '',
  itemLabel = 'data',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers to show (max 5 visible numbered buttons)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, validCurrentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/60 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 text-xs",
        className
      )}
    >
      {/* Left: Range and Total Info */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 order-2 sm:order-1 text-center sm:text-left">
        <span>
          Menampilkan <strong className="text-slate-800 dark:text-slate-200 font-semibold">{startItem}</strong> - <strong className="text-slate-800 dark:text-slate-200 font-semibold">{endItem}</strong> dari <strong className="text-slate-800 dark:text-slate-200 font-semibold">{totalItems}</strong> {itemLabel}
        </span>
      </div>

      {/* Right: Page Size Selector and Page Controls */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">Tampilkan:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                const newSize = Number(val);
                if (newSize > 0) {
                  onPageSizeChange(newSize);
                  onPageChange(1);
                }
              }}
            >
              <SelectTrigger className="h-8 w-[80px] text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt} / hal
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={validCurrentPage <= 1}
            className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30"
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(validCurrentPage - 1)}
            disabled={validCurrentPage <= 1}
            className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          {/* Number Buttons */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((p) => (
              <Button
                key={p}
                type="button"
                variant={p === validCurrentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                className={cn(
                  "h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg",
                  p === validCurrentPage
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {p}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(validCurrentPage + 1)}
            disabled={validCurrentPage >= totalPages}
            className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={validCurrentPage >= totalPages}
            className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30"
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
