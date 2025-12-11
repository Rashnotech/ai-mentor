export default function CourseDetailsLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-24">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded-lg w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-xl" />
              <div className="h-40 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
