import { ArticleEditor } from "@/components/admin/content/article-editor"

export default function NewContentArticle() {
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Nouvel article</h1>
      <ArticleEditor article={null} />
    </div>
  )
}
