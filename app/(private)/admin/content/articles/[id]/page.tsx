import { notFound } from "next/navigation"
import { getContentArticle } from "@/app/actions/pages"
import { ArticleEditor } from "@/components/admin/content/article-editor"

export default async function EditContentArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getContentArticle(id)

  if (!result.success) {
    notFound()
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{result.data.title}</h1>
      <ArticleEditor article={result.data} />
    </div>
  )
}
