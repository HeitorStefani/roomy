export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Carregando...</p>
      </div>
    </div>
  )
}