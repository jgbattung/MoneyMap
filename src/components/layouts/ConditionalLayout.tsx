// components/layouts/ConditionalLayout.tsx
'use client'

import { useSession } from '@/lib/auth-client'
import Sidebar from '@/components/shared/Sidebar'
import BottomBar from '@/components/shared/BottomBar'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (!isPending && !session) {
    return <>{children}</>
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