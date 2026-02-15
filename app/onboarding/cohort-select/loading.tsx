export default function CohortSelectLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Skeleton */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="w-24 h-5 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        </div>
      </header>

      <div className="w-full h-1 bg-gray-200" />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Title Skeleton */}
          <div className="text-center mb-8">
            <div className="w-32 h-6 mx-auto rounded-full bg-gray-200 animate-pulse mb-4" />
            <div className="w-64 h-8 mx-auto rounded bg-gray-200 animate-pulse mb-2" />
            <div className="w-96 h-4 mx-auto rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Card Skeletons */}
          <div className="space-y-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full p-5 rounded-xl border-2 border-gray-200 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="w-48 h-5 rounded bg-gray-200 animate-pulse mb-2" />
                    <div className="w-24 h-4 rounded bg-gray-200 animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="w-32 h-4 rounded bg-gray-100 animate-pulse" />
                  <div className="w-32 h-4 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Button Skeleton */}
          <div className="flex justify-center">
            <div className="w-48 h-12 rounded-lg bg-gray-200 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  )
}
