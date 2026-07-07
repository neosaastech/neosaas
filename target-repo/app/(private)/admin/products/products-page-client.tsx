"use client"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Percent, Package, Calendar, Download, FileUp, Edit, Trash, Settings, X, Rocket, Ticket } from "lucide-react"
import * as Icons from "lucide-react"
import { ProductsTable } from "./products-table"
import type { ProductsTableHandle } from "./products-table"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { VatRatesDialog } from "@/components/admin/vat-rates-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CouponsPageClient } from "../coupons/coupons-page-client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

interface VatRate {
  id: string
  name: string
  rate: number
}

interface Product {
  id: string
  title: string
  description: string | null
  price: number
  hourlyRate?: number | null
  isPublished: boolean
  type: string | null
  icon: string | null
  imageUrl: string | null
  vatRateId: string | null
  createdAt: Date
  updatedAt: Date
  salesCount?: number
}

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  currency: string | null
  minPurchaseAmount: number | null
  maxDiscountAmount: number | null
  usageLimit: number | null
  usageCount: number
  perUserLimit: number | null
  startDate: Date | null
  endDate: Date | null
  applicableProducts: any
  excludedProducts: any
  isActive: boolean
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface ProductsPageClientProps {
  products: Product[]
  vatRates: VatRate[]
  coupons: Coupon[]
}

export function ProductsPageClient({ products, vatRates, coupons }: ProductsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [idFilter, setIdFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [vatDialogOpen, setVatDialogOpen] = useState(false)
  const [couponsDialogOpen, setCouponsDialogOpen] = useState(false)
  const [currentVatRates, setCurrentVatRates] = useState<VatRate[]>(vatRates)
  const [currency, setCurrency] = useState<string>("EUR")
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedCount, setSelectedCount] = useState(0)
  const tableRef = useRef<ProductsTableHandle>(null)

  const couponProducts = useMemo(() => {
    return products.map(product => ({
      id: product.id,
      title: product.title,
      price: product.price,
    }))
  }, [products])
  
  // Gestion des colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    createdAt: true,
    updatedAt: true,
    salesCount: true,
    visual: true,
    title: true,
    type: true,
    paymentType: true,
    price: true,
    hourlyRate: true,
    vat: true,
    status: true,
  })
  
  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column as keyof typeof prev] }))
  }

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      // Search filter
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // ID filter
      const matchesId = idFilter === "" || product.id.toLowerCase().includes(idFilter.toLowerCase())
      
      // Type filter
      const matchesType = typeFilter === "all" || product.type === typeFilter
      
      // Status filter
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "published" && product.isPublished) ||
        (statusFilter === "draft" && !product.isPublished)
      
      // Date filters
      const productDate = new Date(product.createdAt)
      const matchesStartDate = !startDateFilter || productDate >= new Date(startDateFilter)
      const matchesEndDate = !endDateFilter || productDate <= new Date(endDateFilter)
      
      return matchesSearch && matchesId && matchesType && matchesStatus && matchesStartDate && matchesEndDate
    })

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any = a[sortField as keyof Product]
        let bVal: any = b[sortField as keyof Product]

        if (sortField === 'price' || sortField === 'salesCount') {
          aVal = Number(aVal) || 0
          bVal = Number(bVal) || 0
        } else if (sortField === 'createdAt' || sortField === 'updatedAt') {
          aVal = new Date(aVal).getTime()
          bVal = new Date(bVal).getTime()
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = (bVal || '').toLowerCase()
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [products, searchQuery, idFilter, typeFilter, statusFilter, startDateFilter, endDateFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, idFilter, typeFilter, statusFilter, startDateFilter, endDateFilter, itemsPerPage])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Bulk Actions - Affiché uniquement quand des produits sont sélectionnés */}
          {selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="w-full sm:w-auto">
                  <Edit className="mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Bulk Actions ({selectedCount})</span>
                  <span className="xs:hidden">Actions ({selectedCount})</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Package className="mr-2 h-4 w-4" />
                    Change Type
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => tableRef.current?.bulkUpdateField('type', 'physical')}>
                      Physical
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => tableRef.current?.bulkUpdateField('type', 'digital')}>
                      Digital
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => tableRef.current?.bulkUpdateField('type', 'appointment')}>
                      Appointment
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Edit className="mr-2 h-4 w-4" />
                    Change Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => tableRef.current?.bulkUpdateField('isPublished', true)}>
                      Publish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => tableRef.current?.bulkUpdateField('isPublished', false)}>
                      Unpublish
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Percent className="mr-2 h-4 w-4" />
                    Change VAT Rate
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {currentVatRates.map(rate => (
                      <DropdownMenuItem 
                        key={rate.id} 
                        onClick={() => tableRef.current?.bulkUpdateField('vatRateId', rate.id)}
                      >
                        {rate.name} ({(rate.rate / 100).toFixed(2)}%)
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => tableRef.current?.bulkDelete()}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Bouton paramètres de colonnes - Desktop uniquement */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden md:flex w-full sm:w-auto">
                <Settings className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-semibold">Visible Columns</div>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.id}
                onCheckedChange={() => toggleColumn('id')}
              >
                ID
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.createdAt}
                onCheckedChange={() => toggleColumn('createdAt')}
              >
                Created Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.updatedAt}
                onCheckedChange={() => toggleColumn('updatedAt')}
              >
                Updated Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.salesCount}
                onCheckedChange={() => toggleColumn('salesCount')}
              >
                Sales Count
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.visual}
                onCheckedChange={() => toggleColumn('visual')}
              >
                Visual (Image/Icon)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.title}
                onCheckedChange={() => toggleColumn('title')}
                disabled
              >
                Title (Required)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={() => toggleColumn('type')}
              >
                Product Type
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.paymentType}
                onCheckedChange={() => toggleColumn('paymentType')}
              >
                Payment Type
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.price}
                onCheckedChange={() => toggleColumn('price')}
              >
                Price HT
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.hourlyRate}
                onCheckedChange={() => toggleColumn('hourlyRate')}
              >
                Hourly Rate
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.vat}
                onCheckedChange={() => toggleColumn('vat')}
              >
                VAT Rate
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={() => toggleColumn('status')}
              >
                Publication Status
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="outline"
            onClick={() => setVatDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Percent className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Manage VAT</span>
            <span className="sm:hidden">VAT</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCouponsDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Ticket className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Coupons</span>
            <span className="sm:hidden">Coupons</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => tableRef.current?.exportSelectedProducts()}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Déclencher le click sur l'input caché dans ProductsTable
              const fileInput = document.querySelector('input[type="file"][accept=".csv"]') as HTMLInputElement
              fileInput?.click()
            }}
            className="w-full sm:w-auto"
          >
            <FileUp className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button onClick={() => tableRef.current?.openNewProduct()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Add Product</span>
            <span className="xs:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar - Fully responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-card">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        <Input
          placeholder="Filter by ID..."
          value={idFilter}
          onChange={(e) => setIdFilter(e.target.value)}
          className="h-10"
        />

        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="EUR">EUR (€)</SelectItem>
            <SelectItem value="USD">USD ($)</SelectItem>
            <SelectItem value="GBP">GBP (£)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Product Type" />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="physical">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-700" />
                <span>Physical</span>
              </div>
            </SelectItem>
            <SelectItem value="digital">
              <div className="flex items-center gap-2">
                <Icons.Rocket className="h-4 w-4 text-blue-700" />
                <span>Digital</span>
              </div>
            </SelectItem>
            <SelectItem value="appointment">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-700" />
                <span>Appointment</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-col sm:flex-row gap-2 sm:col-span-2 lg:col-span-1">
          <Input
            type="date"
            placeholder="Start date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="flex-1 h-10"
          />
          <Input
            type="date"
            placeholder="End date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="flex-1 h-10"
          />
        </div>
      </div>

      <ProductsTable 
        ref={tableRef}
        products={paginatedProducts} 
        vatRates={currentVatRates}
        coupons={coupons}
        currency={currency}
        sortField={sortField}
        sortDirection={sortDirection}
        visibleColumns={visibleColumns}
        onSort={(field) => {
          if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
          } else {
            setSortField(field)
            setSortDirection('asc')
          }
        }}
        onSelectionChange={(count) => setSelectedCount(count)}
        onOpenVatDialog={() => setVatDialogOpen(true)}
      />

      {filteredProducts.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredProducts.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      <VatRatesDialog
        open={vatDialogOpen}
        onOpenChange={setVatDialogOpen}
        onRatesUpdated={(updatedRates) => {
          // Mettre à jour immédiatement sans rechargement de page
          setCurrentVatRates(updatedRates)
          console.log('[ProductsPageClient] VAT rates updated:', updatedRates.length)
        }}
      />

      <Dialog open={couponsDialogOpen} onOpenChange={setCouponsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Coupons</DialogTitle>
            <DialogDescription>
              Create and manage discount coupons for your products.
            </DialogDescription>
          </DialogHeader>
          <CouponsPageClient coupons={coupons} products={couponProducts} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
