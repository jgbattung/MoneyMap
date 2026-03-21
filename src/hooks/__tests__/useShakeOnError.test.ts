import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShakeOnError } from '../useShakeOnError';

describe('useShakeOnError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty shakeClassName initially', () => {
    const { result } = renderHook(() =>
      useShakeOnError({ submitCount: 0, isSubmitSuccessful: false })
    );

    expect(result.current.shakeClassName).toBe('');
  });

  it('sets animate-shake when submit fails', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    act(() => {
      rerender({ submitCount: 1, isSubmitSuccessful: false });
    });

    expect(result.current.shakeClassName).toBe('animate-shake');
  });

  it('clears animate-shake after 300ms', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    act(() => {
      rerender({ submitCount: 1, isSubmitSuccessful: false });
    });

    expect(result.current.shakeClassName).toBe('animate-shake');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.shakeClassName).toBe('');
  });

  it('does not set shake when submit is successful', () => {
    const { result, rerender } = renderHook(
      ({ submitCount, isSubmitSuccessful }) =>
        useShakeOnError({ submitCount, isSubmitSuccessful }),
      { initialProps: { submitCount: 0, isSubmitSuccessful: false } }
    );

    act(() => {
      rerender({ submitCount: 1, isSubmitSuccessful: true });
    });

    expect(result.current.shakeClassName).toBe('');
  });

  it('returns a buttonRef', () => {
    const { result } = renderHook(() =>
      useShakeOnError({ submitCount: 0, isSubmitSuccessful: false })
    );

    expect(result.current.buttonRef).toBeDefined();
    expect(result.current.buttonRef.current).toBeNull();
  });
});
