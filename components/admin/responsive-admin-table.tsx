'use client'

import { ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

/**
 * Responsive Admin Table Component
 * 
 * Displays a table on desktop and cards on mobile for better UX.
 * Supports selection, filtering, and custom actions.
 * 
 * @example
 * ```tsx
 * <ResponsiveAdminTable
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'status', label: 'Status' }
 *   ]}
 *   data={users}
 *   selectable
 *   selectedIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   renderCell={(item, column) => {
 *     if (column.key === 'status') {
 *       return <Badge>{item[column.key]}</Badge>
 *     }
 *     return item[column.key]
 *   }}
 *   renderMobileCard={(item) => (
 *     <Card>
 *       <CardContent>
 *         <div>{item.name}</div>
 *         <div>{item.email}</div>
 *       </CardContent>
 *     </Card>
 *   )}
 *   onRowAction={(item) => console.log('Action for', item)}
 *   emptyMessage="No items found"
 * />
 * ```
 */

export interface ResponsiveTableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  className?: string
  hideOnMobile?: boolean
}

export interface ResponsiveAdminTableProps<T extends { id: string }> {
  /** Table columns configuration */
  columns: ResponsiveTableColumn<T>[]
  
  /** Data to display */
  data: T[]
  
  /** Enable row selection */
  selectable?: boolean
  
  /** Currently selected row IDs */
  selectedIds?: Set<string>
  
  /** Callback when selection changes */
  onSelectionChange?: (ids: Set<string>) => void
  
  /** Custom cell renderer */
  renderCell?: (item: T, column: ResponsiveTableColumn<T>) => ReactNode
  
  /** Custom mobile card renderer */
  renderMobileCard?: (item: T, isSelected: boolean, onToggleSelect: () => void) => ReactNode
  
  /** Action button renderer for each row */
  renderRowActions?: (item: T) => ReactNode
  
  /** Message when no data */
  emptyMessage?: string
  
  /** Custom class for table container */
  className?: string
  
  /** Show select all checkbox */
  showSelectAll?: boolean
}

export function ResponsiveAdminTable<T extends { id: string }>({
  columns,
  data,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  renderCell,
  renderMobileCard,
  renderRowActions,
  emptyMessage = "No data found",
  className = "",
  showSelectAll = true,
}: ResponsiveAdminTableProps<T>) {
  
  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    
    if (selectedIds.size === data.length && data.length > 0) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(data.map(item => item.id)))
    }
  }

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return
    
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  const defaultRenderCell = (item: T, column: ResponsiveTableColumn<T>) => {
    const value = item[column.key as keyof T]
    return value !== null && value !== undefined ? String(value) : "-"
  }

  const cellRenderer = renderCell || defaultRenderCell

  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden md:block rounded-md border ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  {showSelectAll && (
                    <Checkbox
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  )}
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={String(column.key)} 
                  className={column.className}
                >
                  {column.label}
                </TableHead>
              ))}
              {renderRowActions && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)} 
                  className="text-center text-muted-foreground h-24"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell 
                      key={String(column.key)}
                      className={column.className}
                    >
                      {cellRenderer(item, column)}
                    </TableCell>
                  ))}
                  {renderRowActions && (
                    <TableCell>
                      {renderRowActions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {emptyMessage}
          </div>
        ) : (
          data.map((item) => {
            const isSelected = selectedIds.has(item.id)
            const onToggleSelect = () => toggleSelect(item.id)

            if (renderMobileCard) {
              return renderMobileCard(item, isSelected, onToggleSelect)
            }

            // Default mobile card
            return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    {selectable && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={onToggleSelect}
                      />
                    )}
                    {renderRowActions && renderRowActions(item)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {columns
                    .filter(col => !col.hideOnMobile)
                    .map((column) => (
                      <div key={String(column.key)}>
                        <span className="text-muted-foreground">{column.label}: </span>
                        <span className="font-medium">
                          {cellRenderer(item, column)}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
