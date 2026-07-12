"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  Upload,
  Download,
  Trash,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Minimize2,
  Crop,
  Pencil,
  Copy,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  getContentMedia,
  uploadContentMedia,
  removeContentMedia,
  transformContentMedia,
  renameContentMedia,
  updateContentMediaAlt,
  getContentMediaDataUrl,
  replaceContentMediaFile,
} from "@/app/actions/pages"
import type { PayloadMediaSummary } from "@/lib/payload-bridge"
import { CroppedFileInput, type CroppedFileInputHandle } from "@/components/ui/cropped-file-input"
import { ImageCropper } from "@/components/ui/image-cropper"
import { ContentSheet } from "./content-sheet"

type TypeFilter = "all" | "image" | "video" | "document"

function isDocument(mimeType?: string | null) {
  const m = mimeType ?? ""
  return !m.startsWith("image/") && !m.startsWith("video/")
}

// Charles (2026-07-11): "on doit être capable de vérifier leur poids et la
// minification" — filesize was already on PayloadMediaSummary (Payload
// tracks it natively) but never surfaced in this UI.
function formatBytes(bytes?: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function upload(file: File): Promise<PayloadMediaSummary> {
  const formData = new FormData()
  formData.append("file", file)
  const result = await uploadContentMedia(formData)
  if (!result.success) throw new Error(result.error)
  return result.data
}

/**
 * Replaces the old "Open Media Library in Payload" link-out (Charles,
 * 2026-07-11: "j'ai un lien direct vers payload. c'est pas génial. je dois
 * avoir les mêmes fonctionnalités de neosaas app depuis l'ui") — a real
 * gallery, drag & drop upload, and the transform endpoint payload-cms
 * already had (rotate/flip/quality via Sharp) exposed here instead of only
 * in Payload's own admin.
 *
 * Two distinct upload paths, deliberately not unified into one flow:
 * - The "Upload" button routes a single image through CroppedFileInput
 *   (react-easy-crop, same component already proven on logos/avatars) —
 *   an explicit, interactive crop step.
 * - Drag & drop uploads every dropped file as-is, no crop interruption —
 *   the right default for dropping a batch of photos at once. Crop
 *   afterwards is still possible via each item's own transform popover
 *   for rotate/flip, though that's a Sharp resize, not a freeform crop.
 *
 * Video: uploads through the same path (Media has no mimeType
 * restriction), but the transform popover only shows for images —
 * mediaTransformHandler explicitly rejects non-image mimetypes (needs
 * ffmpeg, a separate backend task, tracked as its own open item).
 *
 * Multi-select + bulk actions (Charles, 2026-07-11: "on devrait avoir des
 * sélections multiples pour modifier en masse les images") — selection is
 * plain local state (a Set of ids), not persisted; bulk delete and bulk
 * alt-text both loop over per-item server actions rather than a new batch
 * endpoint, so partial failures surface per-item instead of failing the
 * whole batch silently.
 *
 * Per-item editing is a single icon (Charles, 2026-07-11: "on ne doit
 * avoir qu'une icone dans chaque image en plus du sélecteur pour éditer")
 * that opens a bottom overlay (ContentSheet, same component already used
 * for editing pages/articles/categories) instead of the small hover
 * Popover this used to be — rotate/flip are applied to a live CSS preview
 * first (transform: rotate/scaleX/scaleY), with a single explicit Save
 * that sends the one real transformContentMedia call once the user is
 * done, rather than one server round-trip (and one real S3 rewrite) per
 * click. That immediate-mutation popover is exactly what caused a real
 * incident this same session — a production image got rotated by mistake
 * while testing the rotate button, no preview step to catch it before it
 * was already live. Delete still routes through the existing confirmation
 * AlertDialog (closes the overlay, opens the confirm dialog) rather than
 * a bare click — Charles: "une suppression mérite une validation de popup
 * pour le coup par sécurité."
 */
export function MediaGallery() {
  const [items, setItems] = useState<PayloadMediaSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [sortField, setSortField] = useState<"date" | "name" | "size">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isUploading, setIsUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PayloadMediaSummary | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [overlayTarget, setOverlayTarget] = useState<PayloadMediaSummary | null>(null)
  const [overlayFilenameBase, setOverlayFilenameBase] = useState("")
  const [overlayExt, setOverlayExt] = useState("")
  const [overlayAlt, setOverlayAlt] = useState("")
  const [overlayRotation, setOverlayRotation] = useState(0)
  const [overlayFlip, setOverlayFlip] = useState<"none" | "horizontal" | "vertical">("none")
  const [overlayMinify, setOverlayMinify] = useState(false)
  const [overlayWidth, setOverlayWidth] = useState("")
  const [overlayHeight, setOverlayHeight] = useState("")
  // Charles (2026-07-11): "on a encore quelques fonctionnalités de
  // modification d'image. tel que le redimensionnement ou la découpe."
  // Crop is a separate flow from the rest of the overlay: it needs an
  // interactive dialog of its own (ImageCropper) and commits immediately
  // on save (replaceMediaFile) rather than queuing into the batched Save
  // like rotate/flip/minify/resize — a freeform crop can't be represented
  // as a CSS preview the way those can.
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [isLoadingCrop, setIsLoadingCrop] = useState(false)
  // Charles (2026-07-11): "le traitement de l'image qui fait sauter la page
  // c'est pas génial... on a un séquenceur, un pop annonce l'avancement...
  // et les images individuellement qui se modifient" — every bulk action
  // (and the single-item overlay Save) now processes items one at a time,
  // patches each item's row in `items` directly from that step's response
  // instead of an ending full `load()` refetch (no more grid-wide reload/
  // scroll jump), and reports live progress here.
  const [bulkProgress, setBulkProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const croppedInputRef = useRef<CroppedFileInputHandle>(null)
  const csvImportInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setIsLoading(true)
    const result = await getContentMedia({ limit: 200, search: search || undefined })
    if (result.success) setItems(result.data)
    else toast.error(result.error)
    setIsLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const filtered = items.filter((m) => {
    if (typeFilter === "all") return true
    if (typeFilter === "document") return isDocument(m.mimeType)
    return (m.mimeType ?? "").startsWith(`${typeFilter}/`)
  })

  // Charles (2026-07-11): "on doit pouvoir sélectionner les images par date
  // en plus et retrouver le même modèle de tri en terme d'UI que dans la
  // page product" — same toggle behavior as products-table.tsx's
  // SortableHeader (same field again flips direction, a new field picks a
  // sensible default), adapted to a small button row since this is a
  // thumbnail grid, not a table with clickable column headers.
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === "date") cmp = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    else if (sortField === "name") cmp = a.filename.localeCompare(b.filename)
    else cmp = (a.filesize ?? 0) - (b.filesize ?? 0)
    return sortDirection === "asc" ? cmp : -cmp
  })

  function handleSort(field: "date" | "name" | "size") {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection(field === "date" ? "desc" : "asc")
    }
  }

  const selectedItems = filtered.filter((m) => selected.has(m.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id))

  function toggleSelected(id: string | number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allFilteredSelected) return new Set()
      const next = new Set(prev)
      for (const m of filtered) next.add(m.id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleUploadFiles(files: FileList | File[]) {
    setIsUploading(true)
    let ok = 0
    let fail = 0
    for (const file of Array.from(files)) {
      try {
        await upload(file)
        ok++
      } catch (error) {
        console.error("Upload failed:", error)
        fail++
      }
    }
    setIsUploading(false)
    toast[fail > 0 ? "warning" : "success"](`${ok} file(s) uploaded${fail > 0 ? `, ${fail} failed` : ""}`)
    load()
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length === 0) return
    // Charles (2026-07-11): "dans l'espace drag and drop on doit être capable
    // d'intégrer les images individuellement sans ajout de bouton
    // supplémentaire" — a single dropped image routes through the same crop
    // step as the explicit "Upload image (with crop)" button, no new UI
    // needed. Multi-file drops keep the batch (no crop) path — the right
    // default when importing a set of photos at once.
    if (files.length === 1 && files[0].type.startsWith("image/")) {
      croppedInputRef.current?.openWithFile(files[0])
      return
    }
    handleUploadFiles(files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCroppedFileReady(file: File) {
    setIsUploading(true)
    try {
      await upload(file)
      toast.success("Uploaded")
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  async function handlePlainFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) await handleUploadFiles(e.target.files)
    e.target.value = ""
  }

  async function handleDelete(item: PayloadMediaSummary) {
    const result = await removeContentMedia(item.id)
    if (result.success) {
      toast.success("Deleted")
      setItems((prev) => prev.filter((m) => m.id !== item.id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    } else {
      toast.error(result.error)
    }
  }

  async function handleBulkDelete() {
    const targets = selectedItems
    setBulkDeleteOpen(false)
    setBulkProgress({ label: "Deleting", done: 0, total: targets.length })
    let ok = 0
    let fail = 0
    for (const item of targets) {
      const result = await removeContentMedia(item.id)
      if (result.success) {
        ok++
        setItems((prev) => prev.filter((m) => m.id !== item.id))
      } else {
        fail++
      }
      setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    }
    setBulkProgress(null)
    clearSelection()
    if (fail > 0) toast.warning(`${ok} deleted, ${fail} failed`)
    else toast.success(`${ok} file(s) deleted`)
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success("URL copied")
  }

  // Charles (2026-07-11): "la sélection multiple doit permettre de modifier
  // en masse les images ou le traitement rotation crop." Images only —
  // transformContentMedia (mediaTransformHandler) rejects non-image
  // mimetypes outright.
  async function handleBulkRotate() {
    const targets = selectedItems.filter((m) => (m.mimeType ?? "").startsWith("image/"))
    if (targets.length === 0) {
      toast.warning("No images in the selection")
      return
    }
    setBulkProgress({ label: "Rotating", done: 0, total: targets.length })
    let ok = 0
    let fail = 0
    for (const item of targets) {
      const result = await transformContentMedia(item.id, { rotate: 90 })
      if (result.success) {
        ok++
        setItems((prev) => prev.map((m) => (m.id === item.id ? result.data : m)))
      } else {
        fail++
      }
      setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    }
    setBulkProgress(null)
    if (fail > 0) toast.warning(`${ok} rotated, ${fail} failed`)
    else toast.success(`${ok} image(s) rotated`)
  }

  // Charles: "on doit être capable de vérifier leur poids et la
  // minification." Reuses the same `quality` param transformContentMedia
  // already supported server-side (Sharp — lossy re-encode for jpeg/webp/
  // avif, max lossless compression for png) but this UI never exposed.
  async function handleBulkMinify() {
    const targets = selectedItems.filter((m) => (m.mimeType ?? "").startsWith("image/"))
    if (targets.length === 0) {
      toast.warning("No images in the selection")
      return
    }
    setBulkProgress({ label: "Minifying", done: 0, total: targets.length })
    let ok = 0
    let fail = 0
    for (const item of targets) {
      const result = await transformContentMedia(item.id, { quality: 75 })
      if (result.success) {
        ok++
        setItems((prev) => prev.map((m) => (m.id === item.id ? result.data : m)))
      } else {
        fail++
      }
      setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    }
    setBulkProgress(null)
    if (fail > 0) toast.warning(`${ok} minified, ${fail} failed`)
    else toast.success(`${ok} image(s) minified`)
  }

  // Extension kept out of the editable field on purpose (Charles, 2026-07-11:
  // "éviter d'avoir les extensions dans le champs du nom du fichier") — shown
  // as a fixed suffix instead, reattached on save. Matches the extension
  // payload-cms's rename endpoint already preserves server-side regardless.
  function splitFilename(filename: string): { base: string; ext: string } {
    const dot = filename.lastIndexOf(".")
    if (dot <= 0) return { base: filename, ext: "" }
    return { base: filename.slice(0, dot), ext: filename.slice(dot) }
  }

  function openOverlay(item: PayloadMediaSummary) {
    const { base, ext } = splitFilename(item.filename)
    setOverlayTarget(item)
    setOverlayFilenameBase(base)
    setOverlayExt(ext)
    setOverlayAlt(item.alt ?? "")
    setOverlayRotation(0)
    setOverlayFlip("none")
    setOverlayMinify(false)
    setOverlayWidth("")
    setOverlayHeight("")
  }

  // Charles (2026-07-11): "la modification de masse est séquencée comme il
  // faut mais pas l'édition individuelle" — reuses the exact same
  // bulkProgress popup as the bulk actions instead of a plain "Saving..."
  // button label, one step per real change (transform/rename/alt) so the
  // two flows behave consistently.
  async function handleSaveOverlay() {
    if (!overlayTarget) return
    const isImage = (overlayTarget.mimeType ?? "").startsWith("image/")
    const width = overlayWidth ? Number(overlayWidth) : undefined
    const height = overlayHeight ? Number(overlayHeight) : undefined
    const needsTransform = isImage && (overlayRotation !== 0 || overlayFlip !== "none" || overlayMinify || !!width || !!height)
    const newFilename = `${overlayFilenameBase}${overlayExt}`
    const needsRename = newFilename !== overlayTarget.filename
    const needsAlt = overlayAlt !== (overlayTarget.alt ?? "")
    const totalSteps = [needsTransform, needsRename, needsAlt].filter(Boolean).length
    if (totalSteps === 0) {
      setOverlayTarget(null)
      return
    }
    setBulkProgress({ label: "Saving", done: 0, total: totalSteps })
    try {
      // Tracks the latest known state of the doc across the up-to-3 calls
      // below (each returns the doc's full current state after its own
      // patch) — patched into `items` once at the end instead of a full
      // `load()` refetch, so the grid updates just this one thumbnail in
      // place rather than reloading/jumping.
      let updated = overlayTarget
      if (needsTransform) {
        const transformResult = await transformContentMedia(overlayTarget.id, {
          rotate: overlayRotation || undefined,
          flip: overlayFlip !== "none" ? overlayFlip : undefined,
          quality: overlayMinify ? 75 : undefined,
          width,
          height,
        })
        if (!transformResult.success) throw new Error(transformResult.error)
        updated = transformResult.data
        setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
      }
      if (needsRename) {
        const renameResult = await renameContentMedia(overlayTarget.id, newFilename)
        if (!renameResult.success) throw new Error(renameResult.error)
        updated = renameResult.data
        setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
      }
      if (needsAlt) {
        const altResult = await updateContentMediaAlt(overlayTarget.id, overlayAlt)
        if (!altResult.success) throw new Error(altResult.error)
        updated = altResult.data
        setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
      }
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      toast.success("Saved")
      setOverlayTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes")
    } finally {
      setBulkProgress(null)
    }
  }

  function handleOverlayDelete() {
    if (!overlayTarget) return
    // Closes the overlay and routes through the existing confirmation
    // AlertDialog below rather than deleting directly — Charles: "une
    // suppression mérite une validation de popup pour le coup par sécurité."
    setDeleteTarget(overlayTarget)
    setOverlayTarget(null)
  }

  async function handleOpenCrop() {
    if (!overlayTarget) return
    setIsLoadingCrop(true)
    const result = await getContentMediaDataUrl(overlayTarget.id)
    setIsLoadingCrop(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setCropSrc(result.dataUrl)
    setCropOpen(true)
  }

  // ImageCropper hands back a Blob of the cropped result — uploaded through
  // replaceMediaFile (PATCHes the existing doc's file, same id/url slug,
  // only the pixels change), separate from the batched overlay Save since a
  // freeform crop can't be previewed as a CSS transform the way rotate/
  // flip/resize can.
  async function handleCropComplete(blob: Blob) {
    if (!overlayTarget) return
    setBulkProgress({ label: "Saving crop", done: 0, total: 1 })
    try {
      const file = new File([blob], overlayTarget.filename, { type: blob.type || "image/jpeg" })
      const formData = new FormData()
      formData.append("file", file)
      const result = await replaceContentMediaFile(overlayTarget.id, formData)
      if (!result.success) throw new Error(result.error)
      setItems((prev) => prev.map((m) => (m.id === result.data.id ? result.data : m)))
      setOverlayTarget(result.data)
      toast.success("Cropped")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save crop")
    } finally {
      setBulkProgress(null)
      setCropSrc(null)
    }
  }

  // Charles (2026-07-11): "c'est pour cela qu'un ajout des fonctions
  // d'import en csv serait super" — same client-side generation pattern as
  // pages-settings.tsx's handleExportCSV (Content tab).
  function handleExportCSV() {
    if (sorted.length === 0) {
      toast.error("No media to export")
      return
    }
    const headers = ["ID", "Filename", "Alt", "MimeType", "Filesize", "URL", "CreatedAt"]
    const rows = sorted.map((m) => [
      m.id,
      `"${m.filename.replace(/"/g, '""')}"`,
      `"${(m.alt ?? "").replace(/"/g, '""')}"`,
      m.mimeType ?? "",
      m.filesize ?? "",
      m.url,
      m.createdAt ?? "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `media_export_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success(`${sorted.length} file(s) exported`)
  }

  // Charles: "éditer des balises alt en masse c'est pas génial" was the
  // objection to a single bulk value — a CSV round-trip gives each row its
  // own alt (and optionally filename), edited in a real spreadsheet.
  // Same parser pattern as products-table.tsx's handleImportCSV (ID +
  // quoted-field regex), matched against `items` by ID rather than upserted
  // blind — this only ever updates existing docs, never creates new media.
  // Sequenced through the same bulkProgress popup as every other multi-step
  // action here.
  async function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const lines = text.split("\n")
      if (lines.length < 2) {
        toast.error("CSV file is empty")
        return
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""))
      const idIdx = header.indexOf("id")
      const altIdx = header.indexOf("alt")
      const filenameIdx = header.indexOf("filename")
      if (idIdx === -1) {
        toast.error('CSV must have an "ID" column')
        return
      }
      const dataLines = lines.slice(1).filter((line) => line.trim())
      setBulkProgress({ label: "Importing CSV", done: 0, total: dataLines.length })
      let ok = 0
      let fail = 0
      for (const line of dataLines) {
        const values =
          line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? []
        const id = values[idIdx]?.trim()
        const item = id ? items.find((m) => String(m.id) === id) : undefined
        if (!item) {
          fail++
          setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
          continue
        }
        try {
          let updated = item
          if (altIdx !== -1) {
            const alt = values[altIdx] ?? ""
            if (alt !== (item.alt ?? "")) {
              const result = await updateContentMediaAlt(item.id, alt)
              if (!result.success) throw new Error(result.error)
              updated = result.data
            }
          }
          if (filenameIdx !== -1) {
            const filename = values[filenameIdx]?.trim()
            if (filename && filename !== updated.filename) {
              const result = await renameContentMedia(item.id, filename)
              if (!result.success) throw new Error(result.error)
              updated = result.data
            }
          }
          setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          ok++
        } catch {
          fail++
        }
        setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
      }
      setBulkProgress(null)
      if (fail > 0) toast.warning(`${ok} updated, ${fail} failed`)
      else toast.success(`${ok} file(s) updated from CSV`)
    } catch (error) {
      console.error("CSV import error:", error)
      toast.error("Failed to import CSV file")
      setBulkProgress(null)
    } finally {
      if (csvImportInputRef.current) csvImportInputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-brand" />
            Media
          </CardTitle>
          <CardDescription>
            Images, videos and documents used across Pages, Articles, and blocks — upload, organize, and edit directly
            here. PDFs get a stable, publishable URL just like Payload&apos;s own admin.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={handlePlainFileChange}
          />
          <CroppedFileInput ref={croppedInputRef} accept="image/*" aspectRatio={16 / 9} fileName="upload.png" onFileReady={handleCroppedFileReady} />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="h-3.5 w-3.5" /> Upload (multiple)
          </Button>
          <Button size="sm" onClick={() => croppedInputRef.current?.open()} disabled={isUploading}>
            <Upload className="h-3.5 w-3.5" /> Upload image (with crop)
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename or alt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="document">Documents (PDF...)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charles (2026-07-11): "on doit pouvoir sélectionner les images par
            date en plus et retrouver le même modèle de tri en terme d'UI que
            dans la page product" — same toggle-direction-on-click behavior
            as products-table.tsx's SortableHeader (with its ↑/↓ indicator),
            adapted to a button row since thumbnails don't have table column
            headers to click. */}
        <div className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span className="mr-1">Sort by</span>
          {(["date", "name", "size"] as const).map((field) => (
            <Button
              key={field}
              size="sm"
              variant={sortField === field ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => handleSort(field)}
            >
              {field === "date" ? "Date" : field === "name" ? "Name" : "Size"}
              {sortField === field && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
            </Button>
          ))}
          {/* Separate group, right-aligned — CSV round-trips edit metadata
              (mainly alt text, one value per row, unlike the removed bulk
              "Set alt text" button), not a way to add new files, so kept
              visually apart from Upload in the header above. */}
          <div className="ml-auto flex items-center gap-1">
            <input ref={csvImportInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => csvImportInputRef.current?.click()} disabled={!!bulkProgress}>
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mb-4 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
            isDragging ? "border-primary bg-primary/5 text-foreground" : "border-muted-foreground/30 text-muted-foreground"
          }`}
        >
          {isUploading ? "Uploading…" : "Drag & drop images, videos or PDFs here to upload"}
        </div>

        {filtered.length > 0 && (
          <div
            className={`mb-3 flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              selected.size > 0 ? "border bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 ? `${selected.size} selected` : "Select all"}
              </span>
            </div>
            {/* Charles (2026-07-11): "les boutons ajout et édition sont mal
                placés on confond" — this bar only renders once something is
                selected, gets a distinct bg/border (above), and stays fully
                separate from the "Upload"/"Upload image (with crop)" buttons
                in the header — those add new files, this acts on the current
                selection.
                No bulk "Set alt text" here on purpose — Charles: "éditer des
                balises alt en masse c'est pas génial autant faire disparaître
                le bouton en cas de sélection multiple." Alt text should
                describe each file's specific content, so applying one
                identical value across several different images is bad
                practice by default; per-item editing stays in the overlay,
                differentiated bulk editing is a CSV-import job (tracked
                separately), not a single-value bulk button. */}
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkRotate} disabled={!!bulkProgress}>
                  <RotateCw className="h-3.5 w-3.5" /> Rotate 90°
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkMinify} disabled={!!bulkProgress}>
                  <Minimize2 className="h-3.5 w-3.5" /> Minify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={!!bulkProgress}
                >
                  <Trash className="h-3.5 w-3.5" /> Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} disabled={!!bulkProgress}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading media...</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {search ? "No results for this search." : "No media yet — upload something above."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sorted.map((item) => {
              const isImage = (item.mimeType ?? "").startsWith("image/")
              const isVideo = (item.mimeType ?? "").startsWith("video/")
              const isSelected = selected.has(item.id)
              return (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-lg border bg-muted ${isSelected ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="absolute left-1 top-1 z-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelected(item.id)}
                      aria-label={`Select ${item.filename}`}
                      className="bg-background/90"
                    />
                  </div>
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.alt ?? item.filename} className="h-full w-full object-cover" />
                    ) : isVideo ? (
                      <Video className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 truncate bg-background/90 px-2 py-1 text-xs">
                    <span className="truncate">{item.filename}</span>
                    {item.filesize != null && <span className="shrink-0 text-muted-foreground">{formatBytes(item.filesize)}</span>}
                  </div>
                  {/* Charles (2026-07-11): "on ne doit avoir qu'une icone dans
                      chaque image en plus du selecteur pour éditer" — a single
                      edit icon opens the overlay (copy/rename/alt/transform/
                      delete all live there now). max-md:opacity-100 +
                      focus-within:opacity-100 keep it reachable without a
                      mouse hover, same touch-accessibility fix as before. */}
                  <div className="absolute right-1 top-1 opacity-0 transition-opacity max-md:opacity-100 focus-within:opacity-100 group-hover:opacity-100">
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openOverlay(item)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.filename}</strong> will be permanently deleted. Any page/block still referencing it will
              show a broken image. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget)
                setDeleteTarget(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Charles (2026-07-11): "l'action est lancée par le hook, un pop
          annonce l'avancement du projet et on a les images individuellement
          qui se modifient" — no onOpenChange (can't be dismissed mid-batch),
          closes itself once bulkProgress goes back to null. */}
      <AlertDialog open={!!bulkProgress}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkProgress?.label}...</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkProgress?.done} / {bulkProgress?.total}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Progress value={bulkProgress ? (bulkProgress.done / bulkProgress.total) * 100 : 0} />
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} file(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all selected files. Any page/block still referencing one of them will show a
              broken image. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContentSheet
        open={!!overlayTarget}
        onOpenChange={(open) => !open && setOverlayTarget(null)}
        title={overlayTarget ? `${overlayFilenameBase}${overlayExt}` : "Edit file"}
        description="Renaming updates the file's public URL — links pointing at the old URL (e.g. a PDF you already shared) will stop working. Transform, alt text and rename are all saved together."
      >
        {overlayTarget && (
          <div className="space-y-4">
            {/* Charles (2026-07-11): "l'image à droite serait parfait et plus
                adapté" — form fields on the left, preview on the right on
                desktop; stacks to a single column on narrow viewports where
                there's no room for two columns anyway. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {(overlayTarget.mimeType ?? "").startsWith("image/") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rotate / flip — previewed on the right, applied on Save</Label>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => setOverlayRotation((r) => (r + 90) % 360)} title="Rotate 90°">
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant={overlayFlip === "horizontal" ? "default" : "outline"}
                        onClick={() => setOverlayFlip((f) => (f === "horizontal" ? "none" : "horizontal"))}
                        title="Flip horizontal"
                      >
                        <FlipHorizontal className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant={overlayFlip === "vertical" ? "default" : "outline"}
                        onClick={() => setOverlayFlip((f) => (f === "vertical" ? "none" : "vertical"))}
                        title="Flip vertical"
                      >
                        <FlipVertical className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={handleOpenCrop} disabled={isLoadingCrop} title="Crop">
                        <Crop className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Charles: "on doit être capable de vérifier leur poids et
                        la minification" — current size shown next to the
                        toggle, queued into the same Save call as rotate/flip
                        (one real transformContentMedia call, not a separate
                        immediate mutation). */}
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox id="overlay-minify" checked={overlayMinify} onCheckedChange={(c) => setOverlayMinify(c === true)} />
                      <Label htmlFor="overlay-minify" className="cursor-pointer text-xs font-normal">
                        Minify (reduce file size) — currently {formatBytes(overlayTarget.filesize) || "unknown"}
                      </Label>
                    </div>
                    {/* Charles (2026-07-11): "on a encore quelques
                        fonctionnalités de modification d'image. tel que le
                        redimensionnement" — transformContentMedia already
                        accepted width/height (Sharp resize, same "fit:
                        inside" behavior as the crop-on-upload flow), just
                        never had UI here. Empty = unchanged, queued into the
                        same Save call as rotate/flip/minify. */}
                    <div className="flex items-center gap-2 pt-1">
                      <Label className="shrink-0 text-xs font-normal">
                        Resize {overlayTarget.width && overlayTarget.height ? `(currently ${overlayTarget.width}×${overlayTarget.height}px)` : ""}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Width"
                        value={overlayWidth}
                        onChange={(e) => setOverlayWidth(e.target.value)}
                        className="h-8 w-24"
                      />
                      <span className="text-xs text-muted-foreground">×</span>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Height"
                        value={overlayHeight}
                        onChange={(e) => setOverlayHeight(e.target.value)}
                        className="h-8 w-24"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="overlay-filename">Filename</Label>
                  <div className="flex items-center gap-1">
                    <Input id="overlay-filename" value={overlayFilenameBase} onChange={(e) => setOverlayFilenameBase(e.target.value)} />
                    {overlayExt && <span className="shrink-0 text-sm text-muted-foreground">{overlayExt}</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="overlay-alt">Alt text / description</Label>
                  <Input id="overlay-alt" value={overlayAlt} onChange={(e) => setOverlayAlt(e.target.value)} placeholder="Describe this file..." />
                </div>

                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{overlayTarget.url}</span>
                  <Button variant="ghost" size="icon-sm" className="ml-auto shrink-0" onClick={() => copyUrl(overlayTarget.url)} title="Copy URL">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {(() => {
                const isImage = (overlayTarget.mimeType ?? "").startsWith("image/")
                const isVideo = (overlayTarget.mimeType ?? "").startsWith("video/")
                return (
                  <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted py-8 md:order-last">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={overlayTarget.url}
                        alt={overlayAlt || overlayTarget.filename}
                        className="max-h-64 object-contain transition-transform"
                        style={{
                          transform: `rotate(${overlayRotation}deg) ${
                            overlayFlip === "horizontal" ? "scaleX(-1)" : overlayFlip === "vertical" ? "scaleY(-1)" : ""
                          }`,
                        }}
                      />
                    ) : isVideo ? (
                      <Video className="h-16 w-16 text-muted-foreground" />
                    ) : (
                      <FileText className="h-16 w-16 text-muted-foreground" />
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleOverlayDelete}>
                <Trash className="h-3.5 w-3.5" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOverlayTarget(null)} disabled={!!bulkProgress}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOverlay} disabled={!!bulkProgress || !overlayFilenameBase.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </ContentSheet>

      <ImageCropper
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 9}
      />
    </Card>
  )
}
