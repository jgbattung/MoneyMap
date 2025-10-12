"use client"

import { Input } from "@/components/ui/input";

type EditableTextCellProps = {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
}

const EditableTextCell = ({
  value,
  isEditing,
  onStartEdit,
  onChange,
}: EditableTextCellProps) => {
  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        className="h-8"
      />
    )
  }

  return (
    <div 
      onClick={onStartEdit}
      className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1"
    >
      {value || '-'}
    </div>
  )
}

export default EditableTextCell