import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableSelectionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  children?: React.ReactNode;
  onDeleteSelected?: () => void;
  deleteLabel?: string;
  isDeleting?: boolean;
  className?: string;
}

export function TableSelectionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  children,
  onDeleteSelected,
  deleteLabel = 'Hapus Terpilih',
  isDeleting = false,
  className = '',
}: TableSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/95 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-2xs">
          <CheckSquare className="w-4 h-4" />
        </span>
        <div className="text-xs">
          <span className="font-bold text-blue-900 dark:text-blue-100">{selectedCount}</span>
          <span className="text-blue-700 dark:text-blue-300">
            {totalCount ? ` dari ${totalCount}` : ''} baris data dipilih
          </span>
        </div>
        {totalCount && selectedCount < totalCount && onSelectAll && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1 cursor-pointer"
          >
            (Pilih Semua {totalCount})
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {children}

        {onDeleteSelected && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onDeleteSelected}
            disabled={isDeleting}
            className="h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs touch-manipulation cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteLabel}
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="h-8.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 gap-1 touch-manipulation cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Batal
        </Button>
      </div>
    </div>
  );
}

export function TableCheckboxHeader({
  checked,
  onChange,
  indeterminate,
  title = "Pilih Semua",
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  title?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      title={title}
      className={cn(
        "w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 touch-manipulation",
        className
      )}
    />
  );
}

export function TableCheckboxCell({
  checked,
  onChange,
  className = "",
  title = "Pilih baris ini",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  title?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.checked);
      }}
      title={title}
      className={cn(
        "w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 touch-manipulation",
        className
      )}
    />
  );
}
