"use client"

import { navRoutes, mobileNavRoutes } from '@/app/constants/navigation'
import { IconChevronRight } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const More = () => {
  const pathname = usePathname();

  // Get paths that are already in mobile nav (excluding More itself)
  const visibleMobilePaths = mobileNavRoutes
    .filter(route => route.path !== '/more')
    .map(route => route.path);

  // Filter navRoutes to only show items NOT in mobile nav
  const moreRoutes = navRoutes.filter(
    route => !visibleMobilePaths.includes(route.path)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col">
      <div className="mb-6">
        <h1 className='text-2xl font-semibold'>More</h1>
        <p className='text-muted-foreground mt-2 text-sm md:text-base'>Browse more pages and features</p>
      </div>

      <div className='flex flex-col'>
        {moreRoutes.map((route) => {
          const isActive = pathname === route.path;
          
          return (
            <Link
              href={route.path}
              key={route.name}
              className={`flex items-center justify-between py-4 px-4 border-b border-secondary-700 ${
                isActive ? 'bg-white/10' : 'active:bg-white/5'
              } transition-colors`}
            >
              <div className='flex items-center gap-3'>
                <route.icon size={24} className={isActive ? 'text-white' : 'text-muted-foreground'} />
                <span className={`text-base ${isActive ? 'text-white font-medium' : 'text-foreground'}`}>
                  {route.name}
                </span>
              </div>
              <IconChevronRight 
                size={20} 
                className='text-muted-foreground' 
                strokeWidth={1.5}
              />
            </Link>
          );
        })}
      </div>
    </div>
  )
}

export default More