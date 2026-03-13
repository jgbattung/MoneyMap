"use client";

import { useState, useEffect, useCallback } from "react";
import { navGroups } from "@/app/constants/navigation";

const COLLAPSED_KEY = "money-map-sidebar-collapsed";
const GROUPS_KEY = "money-map-sidebar-groups";

function getDefaultGroupStates(): Record<string, boolean> {
  return Object.fromEntries(navGroups.map((g) => [g.key, true]));
}

export function useSidebarState(pathname: string) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>(
    getDefaultGroupStates
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (SSR-safe)
  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem(COLLAPSED_KEY);
      if (storedCollapsed === "true") {
        setIsCollapsed(true);
      }

      const storedGroups = localStorage.getItem(GROUPS_KEY);
      if (storedGroups) {
        const parsed = JSON.parse(storedGroups) as Record<string, boolean>;
        setGroupStates((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // localStorage unavailable — keep defaults
    }
    setHydrated(true);
  }, []);

  // Auto-expand the group containing the active route
  useEffect(() => {
    if (!hydrated) return;
    for (const group of navGroups) {
      if (group.routes.some((r) => pathname.startsWith(r.path))) {
        setGroupStates((prev) => {
          if (prev[group.key]) return prev; // already expanded
          const next = { ...prev, [group.key]: true };
          try {
            localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        break;
      }
    }
  }, [pathname, hydrated]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setGroupStates((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isGroupExpanded = useCallback(
    (key: string) => groupStates[key] ?? true,
    [groupStates]
  );

  return {
    isCollapsed,
    toggleCollapsed,
    groupStates,
    toggleGroup,
    isGroupExpanded,
  };
}
