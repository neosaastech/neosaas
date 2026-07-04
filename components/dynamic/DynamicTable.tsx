"use client"

import { useEffect, useMemo, useState } from "react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import type { FeatureConfig } from "@/types/form-builder"

interface PayloadListResponse {
  docs: Record<string, unknown>[]
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * One generic table for any FeatureConfig — columns come from
 * `fields.filter(f => f.tableShow)`, data/pagination/sort are Payload's own
 * (manualPagination — Payload paginates server-side, this never fetches
 * more than one page's worth of rows at a time).
 */
export function DynamicTable({
  config,
  onRowClick,
  refreshKey,
}: {
  config: FeatureConfig
  onRowClick?: (doc: Record<string, unknown>) => void
  refreshKey?: number
}) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        limit: "10",
      })
      if (sorting[0]) {
        params.set("sort", `${sorting[0].desc ? "-" : ""}${sorting[0].id}`)
      }
      try {
        const res = await fetch(`/api/dashboard/${config.endpoint}?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: PayloadListResponse = await res.json()
        setData(json.docs)
        setPageCount(json.totalPages)
        setHasNextPage(json.hasNextPage)
        setError(null)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load data")
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [config.endpoint, pageIndex, sorting, refreshKey])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      config.fields
        .filter((f) => f.tableShow)
        .map((f) => ({
          accessorKey: f.name,
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {f.label}
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          ),
          cell: ({ getValue }) => String(getValue() ?? ""),
        })),
    [config.fields],
  )

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: { sorting, pagination: { pageIndex, pageSize: 10 } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucune donnée.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pageIndex === 0}
          onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pageIndex + 1} / {Math.max(pageCount, 1)}
        </span>
        <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={() => setPageIndex((p) => p + 1)}>
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
