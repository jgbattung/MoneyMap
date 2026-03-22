"use client"

import React, { useState } from 'react'
import { Icons } from '../icons'
import { dashboardRoute, navGroups, NavRoute } from '@/app/constants/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import CreateIncomeTransactionSheet from '../forms/CreateIncomeTransactionSheet'
import CreateTransferSheet from '../forms/CreateTransferSheet'
import CreateExpenseTransactionSheet from '../forms/CreateExpenseTransactionSheet'
import { useSidebarState } from '@/hooks/useSidebarState'
import { IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const Sidebar = () => {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed, isGroupExpanded, toggleGroup } = useSidebarState(pathname);
  const [createIncomeTransactionSheetOpen, setCreateIncomeTransactionSheetOpen] = useState(false);
  const [createTransferSheetOpen, setCreateTransferSheetOpen] = useState(false);
  const [createExpenseSheetOpen, setCreateExpenseSheetOpen] = useState(false);

  const handleAddIncome = () => {
    setCreateIncomeTransactionSheetOpen(true);
  };

  const handleAddTransfer = () => {
    setCreateTransferSheetOpen(true);
  }

  const handleAddExpense = () => {
    setCreateExpenseSheetOpen(true);
  }

  const renderNavLink = (route: NavRoute) => {
    const isActive = pathname.startsWith(route.path);
    const IconComponent = isActive ? route.activeIcon : route.icon;

    if (isCollapsed) {
      return (
        <Tooltip key={route.name}>
          <TooltipTrigger asChild>
            <Link
              href={route.path}
              className={`flex items-center justify-center w-10 h-10 rounded-md ${isActive ? 'bg-white/15' : 'hover:bg-white/10'} transition-colors`}
            >
              <IconComponent size={20} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{route.name}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        href={route.path}
        key={route.name}
        className={`flex gap-2 items-center pl-2.5 pr-3 py-1.5 w-full border rounded-md ${isActive ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'} transition-all duration-200 ease-in-out`}
      >
        <IconComponent size={20} />
        <span className='sidebar-animate transition-opacity duration-150'>{route.name}</span>
      </Link>
    );
  };

  const quickActions = [
    { label: 'Add expense', icon: Icons.addExpense, handler: handleAddExpense },
    { label: 'Add income', icon: Icons.addIncome, handler: handleAddIncome },
    { label: 'Add transfer', icon: Icons.addTransfer, handler: handleAddTransfer },
  ];

  return (
    <>
      <div
        className={`hidden md:flex flex-col bg-background border-r border-secondary-700 sidebar-animate transition-[width] duration-200 ease-out ${isCollapsed ? 'w-16 px-2' : 'w-56 px-5'}`}
      >
        {/* Logo + Toggle */}
        <div className='pt-6 pb-4 flex items-center justify-between'>
          {isCollapsed ? (
            <h1 className='text-2xl font-bold tracking-tight w-full text-center'>
              <span className='text-primary'>M</span>
            </h1>
          ) : (
            <>
              <h1 className='text-2xl font-bold tracking-tight'>
                <span className='text-primary'>Money</span>
                <span className='text-white'>Map</span>
              </h1>
              <button
                onClick={toggleCollapsed}
                className='p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer'
                aria-label='Collapse sidebar'
              >
                <IconChevronLeft size={18} />
              </button>
            </>
          )}
        </div>
        {isCollapsed && (
          <div className='flex justify-center pb-3'>
            <button
              onClick={toggleCollapsed}
              className='p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer'
              aria-label='Expand sidebar'
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className='flex-1 flex flex-col justify-start overflow-y-auto scrollbar-hide'>
          {/* Quick actions */}
          <div className='mb-4'>
            {!isCollapsed && (
              <p className='text-sm text-muted-foreground mb-3'>Quick actions</p>
            )}
            <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
              {isCollapsed ? (
                quickActions.map((action) => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={action.handler}
                        className='w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer'
                      >
                        <action.icon size={16} className='text-white' />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{action.label}</TooltipContent>
                  </Tooltip>
                ))
              ) : (
                quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={action.handler}
                    className='flex items-center w-fit px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors cursor-pointer'
                  >
                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <action.icon size={16} className='text-background' />
                    </div>
                    <span>{action.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main navigation */}
          <nav aria-label="Main navigation" className='mb-4'>
            {!isCollapsed && (
              <p className='text-sm text-muted-foreground mb-3'>Main menu</p>
            )}
            <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
              {/* Dashboard - ungrouped */}
              {renderNavLink(dashboardRoute)}

              {isCollapsed ? (
                /* Collapsed: flat list of all group routes */
                navGroups.flatMap((group) =>
                  group.routes.map((route) => renderNavLink(route))
                )
              ) : (
                /* Expanded: collapsible groups */
                navGroups.map((group) => {
                  const expanded = isGroupExpanded(group.key);
                  return (
                    <div key={group.key}>
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className='flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer'
                        aria-expanded={expanded}
                      >
                        <span>{group.label}</span>
                        <IconChevronDown
                          size={14}
                          className={`sidebar-animate transition-transform duration-200 ease-out ${expanded ? '' : '-rotate-90'}`}
                        />
                      </button>
                      <div
                        className="nav-group-content"
                        data-expanded={expanded}
                      >
                        <div>
                          <div className='flex flex-col gap-1 pt-1'>
                            {group.routes.map((route) => renderNavLink(route))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </nav>
        </div>

      </div>

      <CreateIncomeTransactionSheet
        open={createIncomeTransactionSheetOpen}
        onOpenChange={setCreateIncomeTransactionSheetOpen}
        className="hidden md:block"
      />

      <CreateTransferSheet
        open={createTransferSheetOpen}
        onOpenChange={setCreateTransferSheetOpen}
        className="hidden md:block"
      />

      <CreateExpenseTransactionSheet
        open={createExpenseSheetOpen}
        onOpenChange={setCreateExpenseSheetOpen}
        className='hidden md:block'
      />
    </>
  )
}

export default Sidebar
