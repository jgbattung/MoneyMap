"use client"

import { mobileNavRoutes } from '@/app/constants/navigation'
import { IconHomeFilled, IconHome, IconCashBanknoteFilled, IconCashBanknote, IconCreditCardFilled, IconCreditCard, IconDots } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import FloatingActionButton from './FloatingActionButton'

const BottomBar = () => {
  const pathname = usePathname();

  const getIcon = (routeName: string, isActive: boolean) => {
  switch (routeName) {
    case 'Dashboard':
      return isActive ? IconHomeFilled : IconHome;
    case 'Accounts':
      return isActive ? IconCashBanknoteFilled : IconCashBanknote;
    case 'Cards':
      return isActive ? IconCreditCardFilled : IconCreditCard;
    case 'More':
      return IconDots;
    default:
      return IconHome;
  }
  };

  return (
    <div className="md:hidden flex items-center justify-center fixed bottom-0 left-0 right-0 h-14 bg-background border-t-2 border-secondary-700">
      <div className='w-full flex items-center justify-around'>
        {/* First 2 navigation items */}
        {mobileNavRoutes.slice(0, 2).map((route) => {
          const IconComponent = getIcon(route.name, pathname === route.path);
          const isActive = pathname === route.path;
          
          return (
            <Link
              href={route.path}
              key={route.name}
              className={isActive ? 'text-white' : 'text-muted-foreground'}
            >
              <IconComponent size={24} />
            </Link>
          );
        })}

        {/* FAB in the center */}
        <FloatingActionButton />

        {/* Last 2 navigation items */}
        {mobileNavRoutes.slice(2).map((route) => {
          const IconComponent = getIcon(route.name, pathname === route.path);
          const isActive = pathname === route.path;
          
          return (
            <Link
              href={route.path}
              key={route.name}
              className={isActive ? 'text-white' : 'text-muted-foreground'}
            >
              <IconComponent size={24} />
            </Link>
          );
        })}
      </div>
    </div>
  )
}

export default BottomBar