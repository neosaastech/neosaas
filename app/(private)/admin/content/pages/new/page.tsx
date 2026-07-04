import { PageEditor } from "@/components/admin/content/page-editor"

export default function NewContentPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Nouvelle page</h1>
      <PageEditor page={null} />
    </div>
  )
}
