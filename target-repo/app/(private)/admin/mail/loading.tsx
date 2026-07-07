export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-gray-200 rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-64 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded md:col-span-2" />
      </div>
    </div>
  )
}
