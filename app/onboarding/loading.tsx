export default function OnboardingLoading() {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Preparing Your Assessment...</p>
          <p className="text-sm text-gray-500 mt-1">This will only take a moment</p>
        </div>
      </div>
    </div>
  )
}
