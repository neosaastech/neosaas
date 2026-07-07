import { draftMode } from "next/headers"
import { redirect } from "next/navigation"

/** Exits Live Preview draft mode — linked from the preview banner. */
export async function GET() {
  const draft = await draftMode()
  draft.disable()
  redirect("/")
}
