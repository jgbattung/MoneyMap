"use client"

import { PageHeader } from '@/components/shared/PageHeader'

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-0 pb-20 md:pb-6 flex flex-col">
      <PageHeader title="Settings" />
      <div className="mt-10 flex flex-col items-center justify-center text-center py-16">
        <p className="text-muted-foreground">Settings page coming soon.</p>
      </div>
    </div>
  )
}
