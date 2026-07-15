/**
 * Charles (2026-07-15): "on doit être capable de uploader ou downloader les
 * contenus des header, des footer, des modules et des pages que ce soit en
 * csv ou json" — shared client-side helpers for the Export/Import buttons
 * added to those four content panels (mirrors the CSV Blob-download /
 * regex-parse pattern already used on /admin/products, minus a dependency).
 */

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function downloadJson(filenamePrefix: string, data: unknown) {
  downloadTextFile(
    `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.json`,
    JSON.stringify(data, null, 2),
    "application/json",
  )
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function downloadCsv(filenamePrefix: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n")
  downloadTextFile(`${filenamePrefix}_${new Date().toISOString().split("T")[0]}.csv`, csv, "text/csv;charset=utf-8;")
}

/** Same quoted-field-aware line parser as products-table.tsx's handleImportCSV. */
export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => (line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) ?? []).map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"')))
}

/** Payload's depth=1 responses populate relation fields as objects ({id, title, ...}) — write endpoints expect the bare id back. */
export function scopeRefToId(value: string | number | { id: string | number } | null | undefined): string | number | null {
  if (value === null || value === undefined) return null
  return typeof value === "object" ? value.id : value
}
