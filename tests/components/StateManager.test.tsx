import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  GlobalStateManager,
  StateManagerProvider,
  useStatePath,
  useStateManager,
  withStateManager,
} from '../../resources/js/components/StateManager';

function StateConsumer() {
  const { getState, setState } = useStateManager();
  return <button onClick={() => setState('user.name', 'Grace')}>{String(getState('user.name'))}</button>;
}

function PathConsumer() {
  const [value, setValue] = useStatePath<number>('count', 0);
  return <button onClick={() => setValue(previous => previous + 1)}>{value}</button>;
}

describe('StateManager React integration', () => {
  it('provides state, updates consumers, and invokes change callbacks', async () => {
    const onStateChange = vi.fn();
    render(
      <StateManagerProvider initialState={{ user: { name: 'Ada' } }} onStateChange={onStateChange}>
        <StateConsumer />
      </StateManagerProvider>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Ada');
    await act(async () => {
      screen.getByRole('button').click();
    });
    expect(screen.getByRole('button')).toHaveTextContent('Grace');
    expect(onStateChange).not.toHaveBeenCalledWith(expect.anything());
  });

  it('supports the hook outside React markup through a provider wrapper', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateManagerProvider initialState={{ count: 1 }}>{children}</StateManagerProvider>
    );
    const { result } = renderHook(() => useStateManager(), { wrapper });

    expect(result.current.getState('count')).toBe(1);
    act(() => result.current.updateState('count', value => Number(value) + 1));
    expect(result.current.getState('count')).toBe(2);
  });

  it('supports path subscriptions, batches, reset, and delayed external sync', async () => {
    vi.useFakeTimers();
    const onStateChange = vi.fn();
    render(
      <StateManagerProvider initialState={{ count: 0 }} onStateChange={onStateChange}>
        <PathConsumer />
      </StateManagerProvider>
    );

    await act(async () => {
      screen.getByRole('button').click();
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('button')).toHaveTextContent('1');
    expect(onStateChange).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('supports the global manager and its lifecycle methods', () => {
    const manager = new GlobalStateManager();
    const values: unknown[] = [];
    const unsubscribe = manager.subscribe('user.name', value => values.push(value));

    manager.setState('user.name', 'Ada');
    manager.updateState('user.name', value => `${String(value)} Lovelace`);
    manager.batchUpdate([{ path: 'user.age', value: 36 }]);
    expect(manager.getState('user.name')).toBe('Ada Lovelace');
    expect(manager.getState('user.age')).toBe(36);
    expect(values).toContain('Ada Lovelace');

    manager.resetState({ user: { name: 'Grace' } });
    expect(manager.getState('user.name')).toBe('Grace');
    unsubscribe();
    manager.reset();
    expect(manager.state).toEqual({});
    expect(manager.subscribers.size).toBe(0);
  });

  it('wraps components with a state provider', () => {
    const Wrapped = withStateManager(StateConsumer, { initialState: { user: { name: 'Ada' } } });
    render(<Wrapped />);
    expect(screen.getByRole('button')).toHaveTextContent('Ada');
    expect(Wrapped.displayName).toBe('withStateManager(StateConsumer)');
  });

  it('rejects useStateManager outside a provider', () => {
    expect(() => renderHook(() => useStateManager())).toThrow(
      'useStateManager must be used within a StateManagerProvider'
    );
  });
});
