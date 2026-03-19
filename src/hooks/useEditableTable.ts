import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

interface UseEditableTableOptions<T extends { id: string }> {
  queryData: T[];
  allTags?: { id: string; name: string; color: string }[];
}

interface UseEditableTableReturn<T> {
  mergedData: T[];
  editedRows: Record<string, boolean>;
  setEditedRows: Dispatch<SetStateAction<Record<string, boolean>>>;
  updateData: (rowId: string, columnId: string, value: unknown) => void;
  revertData: (rowId: string) => void;
  clearPendingEdits: (rowId: string) => void;
  hasPendingEdit: (rowId: string) => boolean;
}

export function useEditableTable<T extends { id: string }>({
  queryData,
  allTags,
}: UseEditableTableOptions<T>): UseEditableTableReturn<T> {
  const [pendingEdits, setPendingEdits] = useState<Record<string, Partial<T>>>({});
  const [editedRows, setEditedRows] = useState<Record<string, boolean>>({});

  const updateData = useCallback((rowId: string, columnId: string, value: unknown) => {
    setPendingEdits((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [columnId]: value } as Partial<T>,
    }));
  }, []);

  const revertData = useCallback((rowId: string) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const clearPendingEdits = useCallback((rowId: string) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const hasPendingEdit = useCallback(
    (rowId: string) => Boolean(pendingEdits[rowId]),
    [pendingEdits],
  );

  const mergedData = useMemo(() => {
    return queryData.map((row) => {
      const edits = pendingEdits[row.id];
      if (!edits) return row;

      const merged = { ...row, ...edits };

      // Tag normalization: if pending tags are string IDs, resolve to full objects
      const mergedRecord = merged as Record<string, unknown>;
      const tags = mergedRecord.tags;
      if (
        allTags &&
        Array.isArray(tags) &&
        tags.length > 0 &&
        typeof tags[0] === "string"
      ) {
        mergedRecord.tags = (tags as string[])
          .map((id) => allTags.find((t) => t.id === id))
          .filter(Boolean);
      }

      return merged;
    });
  }, [queryData, pendingEdits, allTags]);

  return {
    mergedData,
    editedRows,
    setEditedRows,
    updateData,
    revertData,
    clearPendingEdits,
    hasPendingEdit,
  };
}
