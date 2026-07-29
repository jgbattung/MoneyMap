import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

/**
 * `cn` runs clsx through tailwind-merge. tailwind-merge only knows Tailwind's
 * stock scales, so every project-specific `text-*` utility falls through to its
 * text-COLOR group and silently conflicts with real colours. These tests pin the
 * `extendTailwindMerge` config that fixes that, because the failure mode is
 * invisible: the class is simply dropped from the DOM and the component looks
 * "almost right" rather than broken.
 */
describe('cn', () => {
  describe('custom text utilities survive alongside colours', () => {
    it('keeps text-numeric when a conditional colour is applied', () => {
      // The Monospace Money Rule: every currency figure is Geist Mono with
      // tabular-nums. Before the config fix this returned only the colour, so
      // negative money silently lost its mono/tabular treatment.
      const result = cn('text-numeric', 'text-text-error');

      expect(result).toContain('text-numeric');
      expect(result).toContain('text-text-error');
    });

    it('keeps the custom xxs font size alongside a colour', () => {
      const result = cn('text-xxs font-medium', 'text-primary');

      expect(result).toContain('text-xxs');
      expect(result).toContain('text-primary');
    });

    it('keeps the custom xxxs font size alongside a colour', () => {
      const result = cn('text-numeric text-xxxs leading-none', 'text-text-success');

      expect(result).toContain('text-numeric');
      expect(result).toContain('text-xxxs');
      expect(result).toContain('text-text-success');
    });

    it('keeps text-numeric alongside a stock font size and a colour', () => {
      const result = cn('text-numeric text-sm font-semibold', 'text-text-error');

      expect(result).toContain('text-numeric');
      expect(result).toContain('text-sm');
      expect(result).toContain('text-text-error');
    });
  });

  describe('real conflicts still resolve last-wins', () => {
    it('treats the custom sizes as font sizes that conflict with each other', () => {
      expect(cn('text-xxs', 'text-xxxs')).toBe('text-xxxs');
    });

    it('lets a custom size override a stock size', () => {
      expect(cn('text-sm', 'text-xxs')).toBe('text-xxs');
    });

    it('lets a stock size override a custom size', () => {
      expect(cn('text-xxs', 'text-lg')).toBe('text-lg');
    });

    it('still resolves competing text colours', () => {
      expect(cn('text-text-error', 'text-text-success')).toBe('text-text-success');
    });

    it('still resolves ordinary conflicting utilities', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4');
    });
  });

  it('still applies clsx conditional semantics', () => {
    expect(cn('base', false && 'skipped', undefined, 'applied')).toBe('base applied');
  });
});
