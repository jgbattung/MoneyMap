import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShakeOnError } from '../useShakeOnError';

describe('useShakeOnError — extended cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Timeout cleanup on unmount
  // -------------------------------------------------------------------------

  it('clears the pending timeout on unmount (no state update after unmount)', () => {
    const { result, rerender, unmount } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    act(() => {
      rerender({ submitCount: 1, isSubmitSuccessful: false });
    });

    expect(result.current.shakeClassName).toBe('animate-shake');

    // Unmount before the 300ms timeout fires — should not throw or warn
    act(() => {
      unmount();
    });

    // Advancing past the timeout after unmount should not cause any error
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Multiple consecutive failed submits — debounce behavior
  // -------------------------------------------------------------------------

  it('resets the 300ms window on each new failed submit (debounce)', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    // First failed submit
    act(() => {
      rerender({ submitCount: 1, isSubmitSuccessful: false });
    });
    expect(result.current.shakeClassName).toBe('animate-shake');

    // Advance 200ms (not yet cleared)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.shakeClassName).toBe('animate-shake');

    // Second failed submit — restarts the 300ms window
    act(() => {
      rerender({ submitCount: 2, isSubmitSuccessful: false });
    });
    expect(result.current.shakeClassName).toBe('animate-shake');

    // Advance only 200ms from the second submit — should still be shaking
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.shakeClassName).toBe('animate-shake');

    // Advance the remaining 100ms — now 300ms from the second submit
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.shakeClassName).toBe('');
  });

  // -------------------------------------------------------------------------
  // submitCount = 0 with isSubmitSuccessful change — no shake
  // -------------------------------------------------------------------------

  it('does not shake when submitCount is 0 even if isSubmitSuccessful changes', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    act(() => {
      rerender({ submitCount: 0, isSubmitSuccessful: true });
    });

    expect(result.current.shakeClassName).toBe('');
  });

  // -------------------------------------------------------------------------
  // Successful submit after a previous failure — shake should not re-trigger
  // -------------------------------------------------------------------------

  it('does not shake when a subsequent submit is successful after prior failure', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    // First submit fails — shake activates
    act(() => {
      rerender({ submitCount: 1, isSubmitSuccessful: false });
    });
    expect(result.current.shakeClassName).toBe('animate-shake');

    // Clear the shake timer
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.shakeClassName).toBe('');

    // Second submit succeeds — no shake
    act(() => {
      rerender({ submitCount: 2, isSubmitSuccessful: true });
    });
    expect(result.current.shakeClassName).toBe('');
  });

  // -------------------------------------------------------------------------
  // buttonRef type check
  // -------------------------------------------------------------------------

  it('buttonRef is a React ref object compatible with HTMLButtonElement', () => {
    const { result } = renderHook(() =>
      useShakeOnError({ submitCount: 0, isSubmitSuccessful: false })
    );

    const ref = result.current.buttonRef;
    expect(ref).toHaveProperty('current');
    expect(ref.current).toBeNull();
  });

  // -------------------------------------------------------------------------
  // No shake when submitCount is positive but submit was successful
  // -------------------------------------------------------------------------

  it('keeps shakeClassName empty when isSubmitSuccessful is true even with high submitCount', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    act(() => {
      rerender({ submitCount: 5, isSubmitSuccessful: true });
    });

    expect(result.current.shakeClassName).toBe('');
  });
});
