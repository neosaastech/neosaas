"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import {
  listHeaders,
  getHeader,
  createHeader,
  updateHeader,
  deleteHeader,
  listFooters,
  getFooter,
  createFooter,
  updateFooter,
  deleteFooter,
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  type PayloadHeaderSummary,
  type PayloadHeaderDoc,
  type HeaderWriteInput,
  type PayloadFooterSummary,
  type PayloadFooterDoc,
  type FooterWriteInput,
  type PayloadModuleSummary,
  type PayloadModuleDoc,
  type ModuleWriteInput,
} from "@/lib/payload-bridge"

/** Same write-role gate as saveCategory/saveContentPage — read is open (used by the admin table only, no public consumer here). */
async function assertAdmin(): Promise<{ success: false; error: string } | null> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  return null
}

export async function getContentHeaders(locale: string = "fr"): Promise<
  { success: true; data: PayloadHeaderSummary[] } | { success: false; error: string }
> {
  try {
    return { success: true, data: await listHeaders(locale) }
  } catch (error) {
    console.error("Failed to fetch headers from Payload:", error)
    return { success: false, error: "Failed to fetch headers" }
  }
}

export async function getContentHeader(
  id: string | number,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadHeaderDoc } | { success: false; error: string }> {
  try {
    return { success: true, data: await getHeader(id, locale) }
  } catch (error) {
    console.error(`Failed to fetch header ${id} from Payload:`, error)
    return { success: false, error: "Failed to fetch header" }
  }
}

export async function saveContentHeader(
  id: string | number | null,
  input: HeaderWriteInput,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadHeaderDoc } | { success: false; error: string }> {
  const unauthorized = await assertAdmin()
  if (unauthorized) return unauthorized

  try {
    const header = id ? await updateHeader(id, input, locale) : await createHeader(input, locale)
    revalidatePath("/admin/pages")
    return { success: true, data: header }
  } catch (error) {
    console.error("Failed to save header to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save header"
    return { success: false, error: message }
  }
}

export async function removeContentHeader(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const unauthorized = await assertAdmin()
  if (unauthorized) return unauthorized

  try {
    await deleteHeader(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error(`Failed to delete header ${id} from Payload:`, error)
    return { success: false, error: "Failed to delete header" }
  }
}

export async function getContentFooters(locale: string = "fr"): Promise<
  { success: true; data: PayloadFooterSummary[] } | { success: false; error: string }
> {
  try {
    return { success: true, data: await listFooters(locale) }
  } catch (error) {
    console.error("Failed to fetch footers from Payload:", error)
    return { success: false, error: "Failed to fetch footers" }
  }
}

export async function getContentFooter(
  id: string | number,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadFooterDoc } | { success: false; error: string }> {
  try {
    return { success: true, data: await getFooter(id, locale) }
  } catch (error) {
    console.error(`Failed to fetch footer ${id} from Payload:`, error)
    return { success: false, error: "Failed to fetch footer" }
  }
}

export async function saveContentFooter(
  id: string | number | null,
  input: FooterWriteInput,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadFooterDoc } | { success: false; error: string }> {
  const unauthorized = await assertAdmin()
  if (unauthorized) return unauthorized

  try {
    const footer = id ? await updateFooter(id, input, locale) : await createFooter(input, locale)
    revalidatePath("/admin/pages")
    return { success: true, data: footer }
  } catch (error) {
    console.error("Failed to save footer to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save footer"
    return { success: false, error: message }
  }
}

export async function removeContentFooter(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const unauthorized = await assertAdmin()
  if (unauthorized) return unauthorized

  try {
    await deleteFooter(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error(`Failed to delete footer ${id} from Payload:`, error)
    return { success: false, error: "Failed to delete footer" }
  }
}

export async function getContentModules(locale: string = "fr"): Promise<
  { success: true; data: PayloadModuleSummary[] } | { success: false; error: string }
> {
  try {
    return { success: true, data: await listModules(locale) }
  } catch (error) {
    console.error("Failed to fetch modules from Payload:", error)
    return { success: false, error: "Failed to fetch modules" }
  }
}

export async function getContentModule(
  id: string | number,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadModuleDoc } | { success: false; error: string }> {
  try {
    return { success: true, data: await getModule(id, locale) }
  } catch (error) {
    console.error(`Failed to fetch module ${id} from Payload:`, error)
    return { success: false, error: "Failed to fetch module" }
  }
}

export async function saveContentModule(
  id: string | number | null,
  input: ModuleWriteInput,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadModuleDoc } | { success: false; error: string }> {
  const unauthorized = await assertAdmin()
  if (unauthorized) return unauthorized

  try {
    const module = id ? await updateModule(id, input, locale) : await createModule(input, locale)
    revalidatePath("/admin/pages")
    return { success: true, data: module }
  } catch (error) {
    console.error("Failed to save module to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save module"
    return { success: false, error: message }
  }
}

export async function removeContentModule(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const unauthorized = await assertAdmin()
  if (unauthorized) return unauthorized

  try {
    await deleteModule(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error(`Failed to delete module ${id} from Payload:`, error)
    return { success: false, error: "Failed to delete module" }
  }
}
