import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditableTable } from './useEditableTable';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  name: string;
  amount: number;
}

interface TaggedRow {
  id: string;
  name: string;
  tags: { id: string; name: string; color: string }[] | string[];
}

const makeRows = (): Row[] => [
  { id: 'r1', name: 'Alpha', amount: 100 },
  { id: 'r2', name: 'Beta', amount: 200 },
];

const allTags = [
  { id: 't1', name: 'Food', color: '#ff0000' },
  { id: 't2', name: 'Travel', color: '#00ff00' },
  { id: 't3', name: 'Work', color: '#0000ff' },
];

beforeEach(() => {
  // no external state to clear — hook is self-contained
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useEditableTable — initial state', () => {
  it('returns mergedData equal to queryData when there are no pending edits', () => {
    const rows = makeRows();
    const { result } = renderHook(() => useEditableTable({ queryData: rows }));

    expect(result.current.mergedData).toEqual(rows);
  });

  it('returns an empty editedRows map by default', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    expect(result.current.editedRows).toEqual({});
  });

  it('hasPendingEdit returns false for every row when no edits exist', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    expect(result.current.hasPendingEdit('r1')).toBe(false);
    expect(result.current.hasPendingEdit('r2')).toBe(false);
  });

  it('returns empty mergedData when queryData is an empty array', () => {
    const { result } = renderHook(() => useEditableTable<Row>({ queryData: [] }));

    expect(result.current.mergedData).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateData
// ---------------------------------------------------------------------------

describe('useEditableTable — updateData', () => {
  it('applies a single field edit to the correct row in mergedData', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'name', 'Alpha Updated'));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.name).toBe('Alpha Updated');
  });

  it('does not affect other rows when one row is edited', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'amount', 999));

    const r2 = result.current.mergedData.find((r) => r.id === 'r2');
    expect(r2?.amount).toBe(200);
  });

  it('merges multiple field edits on the same row', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => {
      result.current.updateData('r1', 'name', 'New Name');
      result.current.updateData('r1', 'amount', 500);
    });

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.name).toBe('New Name');
    expect(r1?.amount).toBe(500);
  });

  it('allows editing multiple rows independently', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => {
      result.current.updateData('r1', 'name', 'R1 Edited');
      result.current.updateData('r2', 'amount', 777);
    });

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    const r2 = result.current.mergedData.find((r) => r.id === 'r2');
    expect(r1?.name).toBe('R1 Edited');
    expect(r2?.amount).toBe(777);
  });

  it('hasPendingEdit returns true after updateData is called for a row', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'name', 'Changed'));

    expect(result.current.hasPendingEdit('r1')).toBe(true);
    expect(result.current.hasPendingEdit('r2')).toBe(false);
  });

  it('overwrites a field that was already edited', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'amount', 300));
    act(() => result.current.updateData('r1', 'amount', 450));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.amount).toBe(450);
  });

  it('preserves original row fields not mentioned in updateData', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'amount', 999));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    // 'name' was never edited — should still be from queryData
    expect(r1?.name).toBe('Alpha');
  });
});

// ---------------------------------------------------------------------------
// revertData
// ---------------------------------------------------------------------------

describe('useEditableTable — revertData', () => {
  it('removes pending edits and restores original data for the row', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'name', 'Changed'));
    act(() => result.current.revertData('r1'));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.name).toBe('Alpha');
  });

  it('hasPendingEdit returns false after revertData', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'amount', 999));
    act(() => result.current.revertData('r1'));

    expect(result.current.hasPendingEdit('r1')).toBe(false);
  });

  it('does not affect other rows when one row is reverted', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => {
      result.current.updateData('r1', 'name', 'R1 Edited');
      result.current.updateData('r2', 'amount', 999);
    });

    act(() => result.current.revertData('r1'));

    expect(result.current.hasPendingEdit('r1')).toBe(false);
    expect(result.current.hasPendingEdit('r2')).toBe(true);
  });

  it('is a no-op when called on a row with no pending edits', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    // r1 has no edits — revert should not throw or change anything
    act(() => result.current.revertData('r1'));

    expect(result.current.mergedData).toEqual(makeRows());
  });
});

// ---------------------------------------------------------------------------
// clearPendingEdits
// ---------------------------------------------------------------------------

describe('useEditableTable — clearPendingEdits', () => {
  it('removes pending edits for the specified row', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'name', 'Will Be Cleared'));
    act(() => result.current.clearPendingEdits('r1'));

    expect(result.current.hasPendingEdit('r1')).toBe(false);
  });

  it('restores the original row value after clearPendingEdits', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.updateData('r1', 'amount', 9999));
    act(() => result.current.clearPendingEdits('r1'));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.amount).toBe(100);
  });

  it('is a no-op on a row that has no pending edits', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.clearPendingEdits('r2'));

    expect(result.current.mergedData).toEqual(makeRows());
  });

  it('behaves identically to revertData — both clear the pending map entry', () => {
    const rows = makeRows();
    const { result } = renderHook(() => useEditableTable({ queryData: rows }));

    act(() => result.current.updateData('r2', 'amount', 111));

    // clearPendingEdits and revertData should produce the same outcome
    act(() => result.current.clearPendingEdits('r2'));

    expect(result.current.hasPendingEdit('r2')).toBe(false);
    const r2 = result.current.mergedData.find((r) => r.id === 'r2');
    expect(r2?.amount).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// editedRows / setEditedRows
// ---------------------------------------------------------------------------

describe('useEditableTable — editedRows', () => {
  it('setEditedRows updates the editedRows map', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.setEditedRows({ r1: true }));

    expect(result.current.editedRows).toEqual({ r1: true });
  });

  it('setEditedRows can mark multiple rows as edited', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.setEditedRows({ r1: true, r2: true }));

    expect(result.current.editedRows['r1']).toBe(true);
    expect(result.current.editedRows['r2']).toBe(true);
  });

  it('setEditedRows can clear the edited state by setting to empty object', () => {
    const { result } = renderHook(() => useEditableTable({ queryData: makeRows() }));

    act(() => result.current.setEditedRows({ r1: true }));
    act(() => result.current.setEditedRows({}));

    expect(result.current.editedRows).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Tag normalization
// ---------------------------------------------------------------------------

describe('useEditableTable — tag normalization', () => {
  it('resolves string tag IDs to full tag objects when allTags is provided', () => {
    const rows: TaggedRow[] = [
      { id: 'r1', name: 'Alpha', tags: [{ id: 't1', name: 'Food', color: '#ff0000' }] },
    ];

    const { result } = renderHook(() =>
      useEditableTable({ queryData: rows, allTags })
    );

    // Update tags with string IDs (simulating a picker that emits IDs)
    act(() => result.current.updateData('r1', 'tags', ['t1', 't2']));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    const tags = r1?.tags as { id: string; name: string; color: string }[];
    expect(tags).toHaveLength(2);
    expect(tags[0]).toEqual({ id: 't1', name: 'Food', color: '#ff0000' });
    expect(tags[1]).toEqual({ id: 't2', name: 'Travel', color: '#00ff00' });
  });

  it('filters out unresolvable tag IDs (not present in allTags)', () => {
    const rows: TaggedRow[] = [
      { id: 'r1', name: 'Alpha', tags: [] },
    ];

    const { result } = renderHook(() =>
      useEditableTable({ queryData: rows, allTags })
    );

    act(() => result.current.updateData('r1', 'tags', ['t1', 'unknown-id']));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    const tags = r1?.tags as { id: string; name: string; color: string }[];
    expect(tags).toHaveLength(1);
    expect(tags[0].id).toBe('t1');
  });

  it('does NOT normalize tags when allTags is not provided', () => {
    const rows: TaggedRow[] = [
      { id: 'r1', name: 'Alpha', tags: [] },
    ];

    // No allTags passed
    const { result } = renderHook(() => useEditableTable({ queryData: rows }));

    act(() => result.current.updateData('r1', 'tags', ['t1', 't2']));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    // String IDs should remain as-is because allTags is undefined
    expect(r1?.tags).toEqual(['t1', 't2']);
  });

  it('does not normalize when tags is an array of objects (not string IDs)', () => {
    const objectTags = [{ id: 't1', name: 'Food', color: '#ff0000' }];
    const rows: TaggedRow[] = [{ id: 'r1', name: 'Alpha', tags: [] }];

    const { result } = renderHook(() =>
      useEditableTable({ queryData: rows, allTags })
    );

    act(() => result.current.updateData('r1', 'tags', objectTags));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    // First element is an object, not a string — normalization should be skipped
    expect(r1?.tags).toEqual(objectTags);
  });

  it('does not normalize when the tags array is empty', () => {
    const rows: TaggedRow[] = [{ id: 'r1', name: 'Alpha', tags: [] }];

    const { result } = renderHook(() =>
      useEditableTable({ queryData: rows, allTags })
    );

    act(() => result.current.updateData('r1', 'tags', []));

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.tags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mergedData reactivity — queryData changes
// ---------------------------------------------------------------------------

describe('useEditableTable — mergedData reactivity', () => {
  it('reflects updated queryData on re-render when there are no pending edits', () => {
    let rows = makeRows();
    const { result, rerender } = renderHook(() =>
      useEditableTable({ queryData: rows })
    );

    expect(result.current.mergedData[0].name).toBe('Alpha');

    // Simulate server refresh returning updated data
    rows = [{ id: 'r1', name: 'Alpha Refreshed', amount: 100 }, rows[1]];
    rerender();

    expect(result.current.mergedData[0].name).toBe('Alpha Refreshed');
  });

  it('preserves pending edits on top of refreshed queryData', () => {
    let rows = makeRows();
    const { result, rerender } = renderHook(() =>
      useEditableTable({ queryData: rows })
    );

    act(() => result.current.updateData('r1', 'amount', 555));

    // Server refreshes but amount edit should still win
    rows = [{ id: 'r1', name: 'Alpha Refreshed', amount: 100 }, rows[1]];
    rerender();

    const r1 = result.current.mergedData.find((r) => r.id === 'r1');
    expect(r1?.name).toBe('Alpha Refreshed');  // from new queryData
    expect(r1?.amount).toBe(555);               // from pending edit
  });
});
