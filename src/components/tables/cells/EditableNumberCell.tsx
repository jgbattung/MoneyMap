import { Input } from '@/components/ui/input';
import React from 'react'

type EditableNumberCellProps = {
  value: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onChange: (value: number) => void;
  decimals?: number;
}

const EditableNumberCell = ({
  value,
  isEditing,
  onStartEdit,
  onChange,
  decimals = 2,
}: EditableNumberCellProps ) => {
  if (isEditing) {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const numValue = parseFloat(e.target.value);
          if (!isNaN(numValue)) {
            onChange(numValue);
          }
        }}
        step="0.01"
        min="0"
        autoFocus
        className="h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
      />
    )
  }

  return (
    <div 
      onClick={onStartEdit}
      className="cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
    >
      {value.toFixed(decimals)}
    </div>
  )
}

export default EditableNumberCell