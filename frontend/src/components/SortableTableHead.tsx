import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  sortKey: string;
  children: React.ReactNode;
}

export function SortableTableHead({ sortConfig, onSort, sortKey, children, className, ...props }: SortableTableHeadProps) {
  return (
    <TableHead 
      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${className || ''}`}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortConfig?.key === sortKey ? (
          sortConfig.direction === 'asc' ? (
            <ChevronUp className="w-4 h-4 text-blue-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-500" />
          )
        ) : (
          <ArrowUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        )}
      </div>
    </TableHead>
  );
}

export function useSorting<T>(items: T[]) {
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = React.useMemo(() => {
    const sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        const getNestedValue = (obj: any, path: string) => {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };
        
        const aValue = getNestedValue(a, sortConfig.key) || '';
        const bValue = getNestedValue(b, sortConfig.key) || '';
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
           return sortConfig.direction === 'asc' 
             ? aValue.localeCompare(bValue) 
             : bValue.localeCompare(aValue);
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  return { sortConfig, handleSort, sortedItems };
}
