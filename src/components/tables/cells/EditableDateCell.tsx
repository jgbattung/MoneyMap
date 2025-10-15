import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React from 'react'

type EditableDateCellProps = {
  value: Date;
  isEditing: boolean;
  onStartEdit: () => void;
  onChange: (value: Date) => void;
  isError?: boolean;
}

const EditableDateCell = ({
  value, 
  isEditing, 
  onStartEdit, 
  onChange,
  isError = false,
}: EditableDateCellProps) => {
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  if (isEditing) {
    return (
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-8 w-full justify-start text-left font-normal ${isError ? 'border-red-600' : ''}`}
            onClick={() => setCalendarOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value, "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            captionLayout="dropdown"
            onDayClick={(date) => {
              if (date) {
                onChange(date);
                setCalendarOpen(false);
              }
            }}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div 
      onClick={onStartEdit}
      className="cursor-pointer hover:bg-secondary/50 transition-all rounded px-2 py-1 -mx-2 -my-1"
    >
      {format(value, "MMM d, yyyy")}
    </div>
  )
}

export default EditableDateCell