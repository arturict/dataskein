import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnInfo, QueryRow } from '../types';

function displayValue(value: unknown, type = ''): string {
  if (value == null) {
    return '∅';
  }
  if (typeof value === 'number' && /DATE|TIMESTAMP/i.test(type)) {
    const milliseconds =
      Math.abs(value) > 10_000_000_000_000
        ? value / 1000
        : Math.abs(value) < 10_000_000_000
          ? value * 1000
          : value;
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.getTime())) {
      return /TIMESTAMP/i.test(type) ? date.toISOString() : date.toISOString().slice(0, 10);
    }
  }
  if (typeof value === 'object') {
    return JSON.stringify(value) ?? '[value]';
  }
  if (typeof value === 'symbol') {
    return value.description ?? 'symbol';
  }
  if (typeof value === 'function') {
    return '[function]';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }
  return '[value]';
}

export function DataTable({
  rows,
  columns,
  totalRows,
}: {
  rows: QueryRow[];
  columns: ColumnInfo[];
  totalRows: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 8,
  });

  if (columns.length === 0) {
    return <div className="empty-inline">No columns to preview.</div>;
  }

  return (
    <div
      className="data-grid"
      ref={scrollRef}
      role="table"
      aria-label={
        totalRows == null
          ? `Data preview. Total rows not scanned, ${columns.length} columns.`
          : `Data preview. ${totalRows.toLocaleString()} total rows, ${columns.length} columns.`
      }
      aria-rowcount={totalRows == null ? undefined : Math.min(totalRows, Number.MAX_SAFE_INTEGER)}
      aria-colcount={columns.length}
      tabIndex={0}
    >
      <div className="data-grid-header" role="row">
        {columns.map((column) => (
          <div role="columnheader" key={column.name} title={column.name}>
            {column.name}
          </div>
        ))}
      </div>
      <div className="data-grid-body" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) {
            return null;
          }
          return (
            <div
              className="data-grid-row"
              role="row"
              aria-rowindex={virtualRow.index + 2}
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {columns.map((column) => (
                <div
                  role="cell"
                  key={column.name}
                  title={displayValue(row[column.name], column.type)}
                >
                  {displayValue(row[column.name], column.type)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
