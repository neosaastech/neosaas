export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-gray-200 rounded" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-96 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded" />
      </div>
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  )
}
