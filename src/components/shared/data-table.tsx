"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  /** align: "start" | "center" | "end" */
  align?: "start" | "center" | "end"
  className?: string
  /** Hide on small screens */
  hideOnMobile?: boolean
  /** Hide on medium screens */
  hideOnTablet?: boolean
  /** Render function for the cell */
  render: (row: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T, index: number) => string
  isLoading?: boolean
  isError?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  emptyAction?: React.ReactNode
  onRetry?: () => void
  /** Page size for pagination (0 = no pagination) */
  pageSize?: number
  /** Current page (1-based), controlled */
  page?: number
  onPageChange?: (page: number) => void
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  isError,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRetry,
  pageSize = 0,
  page,
  onPageChange,
  className,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = React.useState(1)
  const currentPage = page ?? internalPage
  const setPage = onPageChange ?? setInternalPage

  const hasPagination = pageSize > 0 && data.length > pageSize
  const totalPages = hasPagination ? Math.ceil(data.length / pageSize) : 1
  const pagedData = hasPagination
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data

  const alignClass = (a?: string) =>
    a === "center" ? "text-center" : a === "end" ? "text-end" : "text-start"

  if (isLoading) return <TableSkeleton />
  if (isError) {
    return (
      <EmptyState
        title={emptyTitle}
        description="—"
        action={onRetry ? <Button onClick={onRetry}>↻</Button> : undefined}
      />
    )
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    alignClass(col.align),
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.hideOnTablet && "hidden md:table-cell",
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.map((row, i) => (
              <TableRow key={rowKey(row, i)} className="hover:bg-muted/20">
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      alignClass(col.align),
                      col.hideOnMobile && "hidden sm:table-cell",
                      col.hideOnTablet && "hidden md:table-cell",
                      col.className
                    )}
                  >
                    {col.render(row, i)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasPagination ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-muted-foreground">
            {Math.min((currentPage - 1) * pageSize + 1, data.length)}–
            {Math.min(currentPage * pageSize, data.length)} / {data.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className="gap-1 h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              className="gap-1 h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
