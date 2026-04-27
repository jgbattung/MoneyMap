// components/layouts/ConditionalLayout.tsx
'use client'

import { useSession } from '@/lib/auth-client'
import Sidebar from '@/components/shared/Sidebar'
import BottomBar from '@/components/shared/BottomBar'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending || !session) {
    return (
      <>
        <div className="hidden md:flex flex-col bg-background border-r border-secondary-700 w-56" />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-background border-t-2 border-secondary-700" />
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <BottomBar />
    </>
  )
}