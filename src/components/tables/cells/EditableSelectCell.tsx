import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React from 'react'

type SelectOption = {
  value: string;
  label: string;
}

type EditableSelectCellProps = {
  value: string;
  displayValue: string;
  options: SelectOption[];
  isEditing: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  isError?: boolean;
}

const EditableSelectCell = ({
  value,
  displayValue,
  options,
  isEditing, 
  onStartEdit, 
  onChange,
  isError = false,
  placeholder = "Select..."
}: EditableSelectCellProps) => {
  if (isEditing) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`h-8 ${isError ? 'border-red-600' : ''}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div 
      onClick={onStartEdit}
      className="cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
    >
      {displayValue || '-'}
    </div>
  )
}

export default EditableSelectCell