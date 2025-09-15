import { getOrdinalSuffix } from "@/lib/utils";
import { Icons } from "../icons";


interface CreditCardCardProps {
  currentBalance: string;
  name: string;
  statementDate?: number;
  dueDate?: number;
  onClick?: () => void;
}

const CreditCardCard = ({ currentBalance, name, statementDate, dueDate, onClick }: CreditCardCardProps) => {
  const formattedBalance = parseFloat(currentBalance).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer'
      onClick={onClick}
    >
      <div className='flex flex-col gap-1'>
        <div className='flex items-center gap-2'>
        <div className='p-2 bg-primary/10 rounded-lg'>
          <Icons.creditCardIcon size={20} className='text-primary' />
        </div>
          <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
        </div>
        <div className="text-muted-foreground text-xs space-y-0.5">
          {statementDate && (
            <p>{`Statement date every ${statementDate}${getOrdinalSuffix(statementDate)} of the month.`}</p>
          )}
          {dueDate && (
            <p>{`Due date every ${dueDate}${getOrdinalSuffix(dueDate)} of the month.`}</p>
          )}
        </div>
      </div>
      <div className='flex flex-col items-end'>
        <div className='flex items-end justify-center gap-2'>
          <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
          <p className='text-foreground md:text-md lg:text-lg'>{formattedBalance}</p>
        </div>
        <p className='text-muted-foreground text-xs'>Outstanding balance</p>
      </div>
    </div>
  )
}

export default CreditCardCard
