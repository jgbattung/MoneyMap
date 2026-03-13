import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSidebarState } from './useSidebarState';

// Mock navigation constants to avoid importing Tabler icon components
vi.mock('@/app/constants/navigation', () => ({
  navGroups: [
    {
      label: 'Accounts',
      key: 'accounts',
      routes: [
        { name: 'Accounts', path: '/accounts', icon: null, activeIcon: null },
        { name: 'Cards', path: '/cards', icon: null, activeIcon: null },
      ],
    },
    {
      label: 'Activity',
      key: 'activity',
      routes: [
        { name: 'Transactions', path: '/transactions', icon: null, activeIcon: null },
        { name: 'Expenses', path: '/expenses', icon: null, activeIcon: null },
        { name: 'Income', path: '/income', icon: null, activeIcon: null },
        { name: 'Transfers', path: '/transfers', icon: null, activeIcon: null },
      ],
    },
    {
      label: 'Planning',
      key: 'planning',
      routes: [
        { name: 'Budgets', path: '/budgets', icon: null, activeIcon: null },
        { name: 'Reports', path: '/reports', icon: null, activeIcon: null },
      ],
    },
  ],
}));

const COLLAPSED_KEY = 'money-map-sidebar-collapsed';
const GROUPS_KEY = 'money-map-sidebar-groups';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function clearStorage() {
  localStorage.removeItem(COLLAPSED_KEY);
  localStorage.removeItem(GROUPS_KEY);
}

beforeEach(() => {
  clearStorage();
  vi.clearAllMocks();
});

afterEach(() => {
  clearStorage();
});

// ---------------------------------------------------------------------------
// Default / initial state
// ---------------------------------------------------------------------------

describe('useSidebarState — initial state', () => {
  it('returns isCollapsed false by default', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));
  });

  it('initialises all nav groups as expanded by default', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      expect(result.current.groupStates['accounts']).toBe(true);
      expect(result.current.groupStates['activity']).toBe(true);
      expect(result.current.groupStates['planning']).toBe(true);
    });
  });

  it('isGroupExpanded returns true for every group when no localStorage data', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      expect(result.current.isGroupExpanded('accounts')).toBe(true);
      expect(result.current.isGroupExpanded('activity')).toBe(true);
      expect(result.current.isGroupExpanded('planning')).toBe(true);
    });
  });

  it('isGroupExpanded returns true for an unknown key (fallback ?? true)', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      expect(result.current.isGroupExpanded('nonexistent')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Hydration from localStorage
// ---------------------------------------------------------------------------

describe('useSidebarState — localStorage hydration', () => {
  it('restores isCollapsed true from localStorage', async () => {
    localStorage.setItem(COLLAPSED_KEY, 'true');

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(true));
  });

  it('does NOT restore isCollapsed when value is "false"', async () => {
    localStorage.setItem(COLLAPSED_KEY, 'false');

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));
  });

  it('restores group states from localStorage', async () => {
    localStorage.setItem(
      GROUPS_KEY,
      JSON.stringify({ accounts: false, activity: true, planning: false })
    );

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      expect(result.current.groupStates['accounts']).toBe(false);
      expect(result.current.groupStates['activity']).toBe(true);
      expect(result.current.groupStates['planning']).toBe(false);
    });
  });

  it('merges stored group states over defaults (partial overrides)', async () => {
    // Only override "planning", leave accounts/activity as default (true)
    localStorage.setItem(GROUPS_KEY, JSON.stringify({ planning: false }));

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      expect(result.current.groupStates['accounts']).toBe(true);
      expect(result.current.groupStates['activity']).toBe(true);
      expect(result.current.groupStates['planning']).toBe(false);
    });
  });

  it('keeps defaults when localStorage contains invalid JSON', async () => {
    localStorage.setItem(GROUPS_KEY, 'not-valid-json{{{');

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      expect(result.current.groupStates['accounts']).toBe(true);
      expect(result.current.groupStates['activity']).toBe(true);
      expect(result.current.groupStates['planning']).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// toggleCollapsed
// ---------------------------------------------------------------------------

describe('useSidebarState — toggleCollapsed', () => {
  it('toggles isCollapsed from false to true', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));

    act(() => result.current.toggleCollapsed());
    expect(result.current.isCollapsed).toBe(true);
  });

  it('toggles isCollapsed back to false on second call', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));

    act(() => result.current.toggleCollapsed());
    act(() => result.current.toggleCollapsed());
    expect(result.current.isCollapsed).toBe(false);
  });

  it('persists isCollapsed true to localStorage after toggle', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));

    act(() => result.current.toggleCollapsed());
    expect(localStorage.getItem(COLLAPSED_KEY)).toBe('true');
  });

  it('persists isCollapsed false to localStorage after double toggle', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));

    act(() => result.current.toggleCollapsed());
    act(() => result.current.toggleCollapsed());
    expect(localStorage.getItem(COLLAPSED_KEY)).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// toggleGroup
// ---------------------------------------------------------------------------

describe('useSidebarState — toggleGroup', () => {
  it('collapses an expanded group', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.groupStates['accounts']).toBe(true));

    act(() => result.current.toggleGroup('accounts'));
    expect(result.current.groupStates['accounts']).toBe(false);
    expect(result.current.isGroupExpanded('accounts')).toBe(false);
  });

  it('expands a collapsed group', async () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify({ accounts: false }));

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.groupStates['accounts']).toBe(false));

    act(() => result.current.toggleGroup('accounts'));
    expect(result.current.groupStates['accounts']).toBe(true);
  });

  it('persists updated group states to localStorage', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.groupStates['accounts']).toBe(true));

    act(() => result.current.toggleGroup('accounts'));

    const stored = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}');
    expect(stored['accounts']).toBe(false);
  });

  it('toggling one group does not affect other groups', async () => {
    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.groupStates['activity']).toBe(true));

    act(() => result.current.toggleGroup('accounts'));
    expect(result.current.groupStates['activity']).toBe(true);
    expect(result.current.groupStates['planning']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auto-expand active route group
// ---------------------------------------------------------------------------

describe('useSidebarState — auto-expand active route group', () => {
  it('auto-expands the group whose route matches the active pathname', async () => {
    // Start with "activity" collapsed
    localStorage.setItem(GROUPS_KEY, JSON.stringify({ activity: false }));

    const { result } = renderHook(() => useSidebarState('/expenses'));
    await waitFor(() => {
      expect(result.current.groupStates['activity']).toBe(true);
    });
  });

  it('auto-expands via startsWith — nested path like /expenses/123', async () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify({ activity: false }));

    const { result } = renderHook(() => useSidebarState('/expenses/123'));
    await waitFor(() => {
      expect(result.current.groupStates['activity']).toBe(true);
    });
  });

  it('does NOT collapse a group that is already expanded', async () => {
    const { result } = renderHook(() => useSidebarState('/accounts'));
    await waitFor(() => {
      expect(result.current.groupStates['accounts']).toBe(true);
    });
    // Should still be true, not flipped
    expect(result.current.groupStates['accounts']).toBe(true);
  });

  it('does not change groups when the pathname matches no route', async () => {
    localStorage.setItem(
      GROUPS_KEY,
      JSON.stringify({ accounts: false, activity: false, planning: false })
    );

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      // hydrated but no group matched — all should remain false
      expect(result.current.groupStates['accounts']).toBe(false);
      expect(result.current.groupStates['activity']).toBe(false);
      expect(result.current.groupStates['planning']).toBe(false);
    });
  });

  it('re-runs when pathname changes and expands the new active group', async () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify({ planning: false }));

    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useSidebarState(path),
      { initialProps: { path: '/accounts' } }
    );

    // Wait for hydration and initial auto-expand
    await waitFor(() => expect(result.current.groupStates['accounts']).toBe(true));

    // planning is still collapsed
    expect(result.current.groupStates['planning']).toBe(false);

    // Navigate to a planning route
    act(() => rerender({ path: '/budgets' }));

    await waitFor(() => {
      expect(result.current.groupStates['planning']).toBe(true);
    });
  });

  it('persists the auto-expanded state to localStorage', async () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify({ activity: false }));

    const { result } = renderHook(() => useSidebarState('/transactions'));
    await waitFor(() => expect(result.current.groupStates['activity']).toBe(true));

    const stored = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}');
    expect(stored['activity']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// localStorage unavailable (graceful degradation)
// ---------------------------------------------------------------------------

describe('useSidebarState — localStorage unavailable', () => {
  it('keeps defaults when localStorage.getItem throws', async () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('localStorage unavailable');
    });

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => {
      // defaults: not collapsed, all groups expanded
      expect(result.current.isCollapsed).toBe(false);
      expect(result.current.groupStates['accounts']).toBe(true);
    });

    Storage.prototype.getItem = originalGetItem;
  });

  it('still toggles in-memory state when localStorage.setItem throws', async () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('localStorage unavailable');
    });

    const { result } = renderHook(() => useSidebarState('/dashboard'));
    await waitFor(() => expect(result.current.isCollapsed).toBe(false));

    act(() => result.current.toggleCollapsed());
    expect(result.current.isCollapsed).toBe(true);

    Storage.prototype.setItem = originalSetItem;
  });
});
