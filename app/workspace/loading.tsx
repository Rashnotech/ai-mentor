export default function WorkspaceLoading() {
  return (
    <div className="h-screen w-full bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Loading Workspace...</p>
          <p className="text-sm text-gray-500 mt-1">Setting up your project environment</p>
        </div>
      </div>
    </div>
  )
}
