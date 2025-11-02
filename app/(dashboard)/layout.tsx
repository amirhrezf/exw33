import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BottomDockWrapper } from '@/components/navigation/bottom-dock-wrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {children}
      </main>
      <BottomDockWrapper />
    </div>
  )
}
