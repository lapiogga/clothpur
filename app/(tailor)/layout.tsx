import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { TailorSidebar } from '@/components/layout/tailor-sidebar'
import type { UserRole } from '@/types'

export default async function TailorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'tailor') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userName={session.user.name ?? ''}
        userRole={session.user.role as UserRole}
      />
      <div className="flex">
        <TailorSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
