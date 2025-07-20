import React from 'react'
import { Icons } from '../icons'

const Sidebar = () => {
  return (
    <div
      className="hidden md:flex flex-col px-5 w-3xs bg-background border-r-2 border-secondary-700">
      <div className='pt-6'>
        HEADER
      </div>

      <div className='flex-1 flex flex-col justify-center'>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground mb-5'>Quick actions</p>
          <div className='flex flex-col gap-3'>
            {/* Add expense */}
            <button
              // onClick={}
              className='flex items-center w-36 px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors'
            >
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <Icons.addExpense
                  size={16}
                  className='text-background'
                />
              </div>
              <span>Add expense</span>
            </button>

            {/* Add income */}
            <button
              // onClick={}
              className='flex items-center w-36 px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors'
            >
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <Icons.addIncome
                  size={16}
                  className='text-background'
                />
              </div>
              <span>Add income</span>
            </button>

            {/* Add income */}
            <button
              // onClick={}
              className='flex items-center w-36 px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors'
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

        <div className='mb-6'>
          <p className='text-sm text-muted-foreground mb-3'>Main menu</p>
        </div>
      </div>

      <div className='pb-6'>
        FOOTER
      </div>
    </div>
  )
}

export default Sidebar