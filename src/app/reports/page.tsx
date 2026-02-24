"use client"

import NetWorthCard from '@/components/shared/NetWorthCard'
import CategoryBreakdownChart from '@/components/shared/CategoryBreakdownChart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEarliestTransaction } from '@/hooks/useEarliestTransaction'
import AnnualSummaryTable from '@/components/shared/AnnualSummaryTable'
import React, { useState } from 'react'

const Reports = () => {
  // Initialize with current month and year
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const { earliestMonth, earliestYear } = useEarliestTransaction()

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
  }

  // Generate month options from earliest transaction to current month
  const generateMonthOptions = () => {
    const options: { label: string; month: number; year: number }[] = []
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Use earliest transaction date, fallback to current month if no data yet
    const startYear = earliestYear ?? currentYear
    const startMonth = earliestMonth ?? currentMonth

    let iterYear = startYear
    let iterMonth = startMonth

    while (iterYear < currentYear || (iterYear === currentYear && iterMonth <= currentMonth)) {
      const date = new Date(iterYear, iterMonth - 1)
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      options.push({ label, month: iterMonth, year: iterYear })

      iterMonth++
      if (iterMonth > 12) {
        iterMonth = 1
        iterYear++
      }
    }

    return options.reverse()
  }

  const monthOptions = generateMonthOptions()
  const selectedValue = `${selectedYear}-${selectedMonth}`

  const handleMonthSelect = (value: string) => {
    const [year, month] = value.split('-').map(Number)
    handleMonthChange(month, year)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
      {/* Page Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Reports</h1>
      </div>

      <div className='mt-10 space-y-6'>
        <div>
          <NetWorthCard />
        </div>

        {/* Category Breakdown Card with Tabs */}
        <div className='flex flex-col max-w-5xl gap-4 bg-card border border-border rounded-md p-4 shadow-md'>
          {/* Header with title and month picker */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <p className='text-foreground font-semibold text-sm md:text-base'>Category Breakdown</p>
            <Select value={selectedValue} onValueChange={handleMonthSelect}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="expenses">
            <TabsList className="w-full">
              <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
              <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses">
              <CategoryBreakdownChart
                type="expense"
                month={selectedMonth}
                year={selectedYear}
              />
            </TabsContent>

            <TabsContent value="income">
              <CategoryBreakdownChart
                type="income"
                month={selectedMonth}
                year={selectedYear}
              />
            </TabsContent>
          </Tabs>
        </div>

        <AnnualSummaryTable />
      
      </div>
    </div>
  )
}

export default Reports