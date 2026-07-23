import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatePersistenceService } from '../../resources/js/services/StatePersistenceService';
import { usePersistedState } from '../../resources/js/hooks/usePersistedState';

describe('StatePersistenceService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('persists, loads, flushes, and removes values', async () => {
    vi.useFakeTimers();
    const service = new StatePersistenceService();
    service.register({ key: 'profile', debounceMs: 10 });

    await service.save('profile', { name: 'Ada' });
    vi.advanceTimersByTime(10);
    expect(JSON.parse(localStorage.getItem('react-wrapper:profile') || '{}')).toEqual({
      name: 'Ada',
    });
    expect(await service.load('profile')).toEqual({ name: 'Ada' });

    await service.remove('profile');
    expect(localStorage.getItem('react-wrapper:profile')).toBeNull();
  });

  it('hydrates the React hook and supports functional updates', async () => {
    localStorage.setItem('counter', JSON.stringify(4));
    const { result } = renderHook(() => usePersistedState('counter', 0, { debounceMs: 0 }));

    await act(async () => undefined);
    expect(result.current[0]).toBe(4);
    act(() => result.current[1](value => value + 1));
    expect(result.current[0]).toBe(5);
  });

  it('keeps unrelated browser storage when clearing its own keys', async () => {
    localStorage.setItem('application-owned', 'keep-me');

    const service = new StatePersistenceService();
    service.register({ key: 'preferences', namespace: 'package' });
    await service.save('preferences', { compact: true });

    await service.clear();

    expect(localStorage.getItem('application-owned')).toBe('keep-me');
    expect(localStorage.getItem('package:preferences')).toBeNull();
  });

  it('reference-counts shared keys across multiple consumers', async () => {
    vi.useFakeTimers();
    const service = new StatePersistenceService();
    service.register({ key: 'shared', debounceMs: 1 });
    service.register({ key: 'shared', debounceMs: 1 });

    service.unregister('shared');
    await service.save('shared', 'still-active');
    vi.advanceTimersByTime(1);

    expect(localStorage.getItem('react-wrapper:shared')).toBe(JSON.stringify('still-active'));
    service.unregister('shared');
    vi.useRealTimers();
  });
});
