"use client"

import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import TransactionsDesktopView from '@/components/transactions/TransactionsDesktopView'
import TransactionsMobileView from '@/components/transactions/TransactionsMobileView'
import { CalendarView } from '@/components/calendar/CalendarView'

type ViewMode = 'list' | 'calendar'

/**
 * Isolates useSearchParams() behind a Suspense boundary, per Next.js App
 * Router requirements — reads the initial view once, then hands control to
 * the parent's own state so the toggle doesn't touch the URL on every click.
 */
function InitialViewFromSearchParams({ onReady }: { onReady: (view: ViewMode) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    onReady(searchParams.get('view') === 'calendar' ? 'calendar' : 'list')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

const Transactions = () => {
  const [view, setView] = useState<ViewMode>('list')

  const handleInitialView = useCallback((initial: ViewMode) => {
    setView(initial)
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-0 pb-36 md:pb-6 flex flex-col">
      <PageHeader title="Transactions" />

      <Suspense fallback={null}>
        <InitialViewFromSearchParams onReady={handleInitialView} />
      </Suspense>

      <ToggleGroup
        type="single"
        value={view}
        variant="outline"
        size="sm"
        onValueChange={(value) => value && setView(value as ViewMode)}
        className="justify-start mb-4"
      >
        <ToggleGroupItem
          value="list"
          className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2"
        >
          List
        </ToggleGroupItem>
        <ToggleGroupItem
          value="calendar"
          className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2"
        >
          Calendar
        </ToggleGroupItem>
      </ToggleGroup>

      {view === 'calendar' ? (
        <CalendarView />
      ) : (
        <>
          <div className="block md:hidden">
            <TransactionsMobileView />
          </div>

          <div className="hidden md:block">
            <TransactionsDesktopView />
          </div>
        </>
      )}
    </div>
  )
}

export default Transactions
