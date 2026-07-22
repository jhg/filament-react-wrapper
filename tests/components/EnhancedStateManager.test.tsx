import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  EnhancedStateProvider,
  StateManagerFactory,
  useEnhancedStateManager,
  useEnhancedStatePath,
  useFilamentState,
} from '../../resources/js/components/EnhancedStateManager';

describe('EnhancedStateManager', () => {
  it('manages nested context state, subscriptions, batches, and resets', () => {
    const manager = StateManagerFactory.create({
      strategy: 'context',
      persistence: false,
      devtools: false,
    });
    const listener = vi.fn();
    const unsubscribe = manager.subscribe('user.name', listener);

    manager.setState('user.name', 'Ada');
    manager.batchUpdate([
      { path: 'user.name', value: 'Grace' },
      { path: 'user.role', value: 'admin' },
    ]);

    expect(manager.getState('user.name')).toBe('Grace');
    expect(manager.getState('user.role')).toBe('admin');
    expect(listener).toHaveBeenCalledWith('Grace');

    unsubscribe();
    manager.reset();
    expect(manager.getState('user.name')).toBeUndefined();
  });

  it('exposes state through the React hooks', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EnhancedStateProvider config={{ strategy: 'context', persistence: false, devtools: false }}>
        {children}
      </EnhancedStateProvider>
    );

    const { result } = renderHook(
      () => ({
        path: useEnhancedStatePath<string>('profile.name'),
        filament: useFilamentState('profile.count', 3),
        manager: useEnhancedStateManager(),
      }),
      { wrapper }
    );
    act(() => result.current.path[1]('Lin'));
    expect(result.current.path[0]).toBe('Lin');
    expect(result.current.filament[0]).toBe(3);
    expect(result.current.manager.getState('profile.name')).toBe('Lin');
  });

  it('rejects hooks outside a provider', () => {
    expect(() => renderHook(() => useEnhancedStateManager())).toThrow(
      'useEnhancedStateManager must be used within an EnhancedStateProvider'
    );
  });

  it('persists context state and falls back when Zustand is unavailable', () => {
    const persisted = StateManagerFactory.create({
      strategy: 'context',
      persistence: true,
      devtools: false,
      namespace: 'enhanced-test-state',
    });
    persisted.setState('value', 'saved');
    expect(JSON.parse(localStorage.getItem('enhanced-test-state')!)).toEqual({ value: 'saved' });

    const fallback = StateManagerFactory.create({
      strategy: 'zustand',
      persistence: false,
      devtools: false,
    });
    fallback.setState('fallback', true);
    expect(fallback.getState('fallback')).toBe(true);
  });
});
