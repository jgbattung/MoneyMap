import React from 'react'

const Sidebar = () => {
  return (
    <div
      className="hidden md:flex flex-col px-5 w-2xs bg-background border-r-2 border-secondary-700">
      <div className='pt-6'>
        HEADER
      </div>

      <div className='flex-1 flex flex-col justify-center'>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground mb-3'>Quick Actions</p>
        </div>

        <div className='mb-6'>
          <p className='text-sm text-muted-foreground mb-3'>Main Menu</p>
        </div>
      </div>

      <div className='pb-6'>
        FOOTER
      </div>
    </div>
  )
}

export default Sidebar