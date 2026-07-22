import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StatePersistenceService,
  usePersistedState,
} from '../../resources/js/services/StatePersistenceService';

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
    expect(JSON.parse(localStorage.getItem('profile') || '{}')).toEqual({ name: 'Ada' });
    expect(await service.load('profile')).toEqual({ name: 'Ada' });

    await service.remove('profile');
    expect(localStorage.getItem('profile')).toBeNull();
  });

  it('hydrates the React hook and supports functional updates', async () => {
    localStorage.setItem('counter', JSON.stringify(4));
    const { result } = renderHook(() => usePersistedState('counter', 0, { debounceMs: 0 }));

    await act(async () => undefined);
    expect(result.current[0]).toBe(4);
    act(() => result.current[1](value => value + 1));
    expect(result.current[0]).toBe(5);
  });
});
