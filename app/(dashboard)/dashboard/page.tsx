import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome, {session.user?.name?.split(' ')[0]}
      </h1>
      <p className="text-gray-500 mb-8">Your projects and availability at a glance.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Project cards rendered client-side */}
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-400">
          Create or join a project to get started
        </div>
      </div>
    </main>
  )
}
