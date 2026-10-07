import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  page?: number
  totalPages?: number
  total?: number
  limit?: number
  onPageChange?: (page: number) => void
  className?: string
  rowClassName?: (row: T, index: number) => string
}

export function DataTable<T extends object & { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  onRowClick,
  page = 1,
  totalPages = 1,
  total,
  limit = 10,
  onPageChange,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total ?? data.length)

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="h-11 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-auto rounded-xl border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-gray-400 py-12"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 text-2xl">
                      📋
                    </div>
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={row.id ?? index}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row, index)
                  )}
                >
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[
                      String(col.key)
                    ]
                    return (
                      <TableCell
                        key={String(col.key)}
                        className={cn(
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right'
                        )}
                      >
                        {col.render
                          ? col.render(value, row, index)
                          : value != null
                          ? String(value)
                          : '—'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">
            {total !== undefined
              ? `Hiển thị ${startIndex}–${endIndex} trong ${total} kết quả`
              : `Trang ${page} / ${totalPages}`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="min-w-[36px]"
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
