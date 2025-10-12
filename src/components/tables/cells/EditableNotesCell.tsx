import { Textarea } from '@/components/ui/textarea';
import React from 'react'

type EditableNotesCellProps = {
  value: string | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  maxLength?: number;
}

const EditableNotesCell = ({
  value, 
  isEditing, 
  onStartEdit, 
  onChange,
  maxLength = 50,
}: EditableNotesCellProps) => {
  if (isEditing) {
    return (
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes..."
        autoFocus
        className="min-h-[60px] resize-none"
        rows={2}
      />
    )
  }

  const displayValue = value || '-';
  const truncated = displayValue.length > maxLength 
    ? `${displayValue.substring(0, maxLength)}...` 
    : displayValue;

  return (
    <div 
      onClick={onStartEdit}
      className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1"
      title={value || undefined}
    >
      {truncated}
    </div>
  )
}

export default EditableNotesCell