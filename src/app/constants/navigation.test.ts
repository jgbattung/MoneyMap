import { describe, it, expect } from 'vitest';
import { navRoutes, mobileNavRoutes, navGroups } from './navigation';

describe('navigation constants', () => {
  it('every navRoute with a filled variant has a distinct activeIcon', () => {
    const exceptions = ['Accounts', 'Pay Division', 'More'];
    const routesWithFilledPairs = navRoutes.filter(r => !exceptions.includes(r.name));
    for (const route of routesWithFilledPairs) {
      expect(route.icon, `${route.name} should have distinct icon/activeIcon`).not.toBe(route.activeIcon);
    }
  });

  it('navRoutes includes all routes from navGroups plus dashboard', () => {
    const groupRouteCount = navGroups.reduce((sum, g) => sum + g.routes.length, 0);
    expect(navRoutes.length).toBe(groupRouteCount + 1);
  });

  it('lists Pay Division in the Planning group so it also appears under More', () => {
    const planning = navGroups.find(g => g.key === 'planning');
    expect(planning?.routes.map(r => r.path)).toContain('/pay-division');
  });

  it('mobileNavRoutes has expected entries', () => {
    const names = mobileNavRoutes.map(r => r.name);
    expect(names).toContain('Dashboard');
    expect(names).toContain('Transactions');
    expect(names).toContain('More');
  });

  it('no duplicate paths in navRoutes', () => {
    const paths = navRoutes.map(r => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
