"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileUp, FileJson, FileSpreadsheet, Loader2 } from "lucide-react"

/**
 * Same visual pattern as the Export/Import buttons on /admin/products
 * (products-page-client.tsx) — outline buttons with Download/FileUp icons —
 * reused here for Header/Footer/Modules/Pages. Export offers both formats
 * via a dropdown (JSON = full-fidelity doc backup/restore, CSV = flat
 * summary); import accepts whichever the panel supports.
 */
export function ContentImportExportBar({
  onExportJson,
  onExportCsv,
  onImportFile,
  importAccept = ".json",
  importLabel = "Import",
}: {
  onExportJson: () => void | Promise<void>
  onExportCsv?: () => void
  onImportFile: (file: File) => void | Promise<void>
  importAccept?: string
  importLabel?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleExportJson() {
    setExporting(true)
    try {
      await onExportJson()
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setImporting(true)
    try {
      await onImportFile(file)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={fileInputRef} type="file" accept={importAccept} className="hidden" onChange={handleFileChange} />

      {onExportCsv ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportJson}>
              <FileJson className="h-3.5 w-3.5" /> Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportCsv}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" onClick={handleExportJson} disabled={exporting}>
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export
        </Button>
      )}

      <Button size="sm" variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
        {importLabel}
      </Button>
    </div>
  )
}
