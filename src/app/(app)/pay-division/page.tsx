"use client"

import { Icons } from '@/components/icons'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import NewDivisionCard from '@/components/pay-division/NewDivisionCard'
import PayPlanDrawer from '@/components/pay-division/PayPlanDrawer'
import PayPlanList from '@/components/pay-division/PayPlanList'
import PayPlanSheet from '@/components/pay-division/PayPlanSheet'
import RecentDivisions from '@/components/pay-division/RecentDivisions'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePayPlansQuery, type PayPlan } from '@/hooks/usePayPlansQuery'
import { Split } from 'lucide-react'
import React, { useState } from 'react'

const PayDivision = () => {
  const { payPlans, isLoading, error } = usePayPlansQuery()
  const [tab, setTab] = useState('divide')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // null means "new plan"
  const [editingPlan, setEditingPlan] = useState<PayPlan | null>(null)

  const openEditor = (plan: PayPlan | null) => {
    setEditingPlan(plan)
    if (window.innerWidth >= 768) {
      setSheetOpen(true)
    } else {
      setDrawerOpen(true)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-36 md:pb-6 flex flex-col">
      <PageHeader title="Pay Division" />

      <PayPlanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        plan={editingPlan}
        className="hidden md:block"
      />
      <PayPlanDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        plan={editingPlan}
        className="block md:hidden"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="divide">Divide</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="divide" className="flex flex-col gap-6 mt-4 max-w-3xl">
          <NewDivisionCard onGoToPlans={() => setTab('plans')} />
          <RecentDivisions />
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="plans-skeleton">
              {Array.from({ length: 2 }, (_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <Icons.error className="h-24 w-24 mb-10" strokeWidth={1.25} />
              <div className="flex flex-col px-4 items-center justify-center gap-3 text-center">
                <p className="text-2xl min-md:text-4xl font-semibold">Failed to load plans</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()} className="mt-10">
                Try again
              </Button>
            </div>
          ) : payPlans.length === 0 ? (
            <EmptyState
              icon={Split}
              title="No plans yet"
              description="A plan sets where pay lands, where Save and Spend go, and how Save is split."
              action={{ label: "Create your first plan", onClick: () => openEditor(null) }}
              variant="page"
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button onClick={() => openEditor(null)}>New plan</Button>
              </div>
              <PayPlanList plans={payPlans} onSelect={openEditor} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PayDivision
