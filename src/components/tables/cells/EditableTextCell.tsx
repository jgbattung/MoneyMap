"use client"

import { Input } from "@/components/ui/input";

type EditableTextCellProps = {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  isError?: boolean;
}

const EditableTextCell = ({
  value,
  isEditing,
  onStartEdit,
  onChange,
  isError = false,
}: EditableTextCellProps) => {
  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        className={`h-8 ${isError ? 'border-red-600 focus-visible:ring-red-600' : ''}`}
      />
    )
  }

  return (
    <div 
      onClick={onStartEdit}
      className="cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
    >
      {value || '-'}
    </div>
  )
}

export default EditableTextCell