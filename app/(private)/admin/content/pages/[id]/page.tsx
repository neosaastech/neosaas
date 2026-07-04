import { notFound } from "next/navigation"
import { getContentPage } from "@/app/actions/pages"
import { PageEditor } from "@/components/admin/content/page-editor"

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getContentPage(id)

  if (!result.success) {
    notFound()
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{result.data.title}</h1>
      <PageEditor page={result.data} />
    </div>
  )
}
