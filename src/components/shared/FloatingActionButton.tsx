import React, { useEffect, useRef, useState } from 'react'
import { Icons } from '../icons'
import { motion, AnimatePresence } from 'framer-motion'
import CreateIncomeTransactionDrawer from '../forms/CreateIncomeTransactionDrawer';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [createIncomeTransactionDrawerOpen, setCreateIncomeTransactionDrawerOpen] = useState(false);

  const handleAddIncome = () => {
    setCreateIncomeTransactionDrawerOpen(true);
  };

  const toggleActionButtons = () => {
    setIsOpen(prev => !prev);
  };

  const closeActionButtons = () => {
    setIsOpen(false);
  };

  const actionButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickAway = (event: MouseEvent) => {
      if (actionButtonsRef.current && !actionButtonsRef.current.contains(event.target as Node)) {
        closeActionButtons();
      }
    };

    window.addEventListener('mousedown', handleClickAway);

    return () => {
      window.removeEventListener('mousedown', handleClickAway)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeActionButtons();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen])

  return (
    <>
      <div
        ref={actionButtonsRef}
        className='relative'
      >
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0 }}
                className="absolute p-3 bg-error-500 hover:bg-error-600 rounded-full -top-24 left-1/2 transform -translate-x-1/2"
              >
                <Icons.addExpense className="text-white" size={18} />
              </motion.button>

              <motion.button
                onClick={handleAddIncome}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="absolute p-3 bg-success-500 hover:bg-success-600 rounded-full -top-12 -left-15"
              >
                <Icons.addIncome className="text-white" size={18} />
              </motion.button>

              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="absolute p-3 bg-secondary-500 hover:bg-secondary-600 rounded-full -top-12 -right-15"
              >
                <Icons.addTransfer className="text-white" size={18} />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        <motion.button
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className='p-2 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors'
          onClick={toggleActionButtons}
        >
          <Icons.actionButtonsTrigger size={22} />
        </motion.button>
      </div>

      <CreateIncomeTransactionDrawer
        open={createIncomeTransactionDrawerOpen}
        onOpenChange={setCreateIncomeTransactionDrawerOpen}
        className="block md:hidden"
      />
    </>
  )
}

export default FloatingActionButton