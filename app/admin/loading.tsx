export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Loading Admin Dashboard...</p>
        <p className="text-sm text-gray-500 mt-1">Fetching system data</p>
      </div>
    </div>
  )
}
