/**
 * Local development without a real Postgres/Neon database.
 * Active only when NODE_ENV=development and DATABASE_URL is a placeholder
 * (or NEOSAAS_OFFLINE_DEV=true is set explicitly).
 */
export function isOfflineDev(): boolean {
  if (process.env.NODE_ENV !== "development") return false
  if (process.env.NEOSAAS_OFFLINE_DEV === "true") return true
  if (process.env.NEOSAAS_OFFLINE_DEV === "false") return false

  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? ""
  return (
    url.includes("placeholder") ||
    url.includes("localhost:5432/placeholder") ||
    url === ""
  )
}
