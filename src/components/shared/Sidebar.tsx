"use client"

import React, { useState } from 'react'
import { Icons } from '../icons'
import { dashboardRoute, navGroups, NavRoute } from '@/app/constants/navigation'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CreateIncomeTransactionSheet from '../forms/CreateIncomeTransactionSheet'
import CreateTransferSheet from '../forms/CreateTransferSheet'
import CreateExpenseTransactionSheet from '../forms/CreateExpenseTransactionSheet'
import { useSession, signOut } from '@/lib/auth-client'
import { useSidebarState } from '@/hooks/useSidebarState'
import { IconChevronDown } from '@tabler/icons-react'

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isGroupExpanded, toggleGroup } = useSidebarState(pathname);
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

  const handleLogout = () => {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in")
        }
      }
    });
  };

  const getUserInitial = () => {
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const renderNavLink = (route: NavRoute) => {
    const isActive = pathname.startsWith(route.path);
    const IconComponent = isActive ? route.activeIcon : route.icon;

    return (
      <Link
        href={route.path}
        key={route.name}
        className={`flex gap-2 items-center pl-2.5 pr-3 py-1.5 w-full border rounded-md ${isActive ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'} transition-all duration-200 ease-in-out`}
      >
        <IconComponent size={20} />
        <span>{route.name}</span>
      </Link>
    );
  };

  return (
    <>
      <div
        className="hidden md:flex flex-col px-5 w-56 bg-background border-r border-secondary-700">
        <div className='pt-6 pb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>
            <span className='text-primary'>Money</span>
            <span className='text-white'>Map</span>
          </h1>
        </div>

        <div className='flex-1 flex flex-col justify-start overflow-y-auto scrollbar-hide'>
          <div className='mb-4'>
            <p className='text-sm text-muted-foreground mb-3'>Quick actions</p>
            <div className='flex flex-col gap-2'>
              {/* Add expense */}
              <button
                onClick={handleAddExpense}
                className='flex items-center px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors cursor-pointer'
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Icons.addExpense
                    size={16}
                    className='text-background'
                  />
                </div>
                <span>Add expense</span>
              </button>

              <button
                onClick={handleAddIncome}
                className='flex items-center px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors cursor-pointer'
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Icons.addIncome
                    size={16}
                    className='text-background'
                  />
                </div>
                <span>Add income</span>
              </button>

              <button
                onClick={handleAddTransfer}
                className='flex items-center px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors cursor-pointer'
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Icons.addTransfer
                    size={16}
                    className='text-background'
                  />
                </div>
                <span>Add transfer</span>
              </button>
            </div>
          </div>

          <nav aria-label="Main navigation" className='mb-4'>
            <p className='text-sm text-muted-foreground mb-3'>Main menu</p>
            <div className='flex flex-col gap-2'>
              {/* Dashboard - ungrouped */}
              {renderNavLink(dashboardRoute)}

              {/* Collapsible groups */}
              {navGroups.map((group) => {
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
              })}
            </div>
          </nav>
        </div>

        <div className='pb-6 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold'>
              {getUserInitial()}
            </div>
            <div className='flex flex-col'>
              <p className='text-sm font-medium truncate max-w-[120px]'>
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='p-2 hover:bg-white/10 rounded-md transition-colors cursor-pointer'
            aria-label='Log out'
          >
            <Icons.logOut size={20} />
          </button>
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
