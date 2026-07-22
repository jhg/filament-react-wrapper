import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PersistentStateManager,
  StandardStateManager,
  ValidatedStateManager,
} from '../../resources/js/services/StateManagerService';

describe('StateManagerService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('supports nested updates, subscriptions, batches, and reset', () => {
    const manager = new StandardStateManager();
    const userValues: unknown[] = [];
    const unsubscribe = manager.subscribe('user', value => userValues.push(value));

    manager.setState('user.name', 'Ada');
    manager.updateState('user.age', current => (current as number | undefined ?? 0) + 1);
    manager.batchUpdate([
      { path: 'user.name', value: 'Grace' },
      { path: 'settings.theme', value: 'dark' },
    ]);

    expect(manager.getState('user')).toEqual({ name: 'Grace', age: 1 });
    expect(manager.getState('settings.theme')).toBe('dark');
    expect(userValues.length).toBeGreaterThan(1);

    manager.resetState({ user: { name: 'Marie' } });
    expect(manager.getState('user.name')).toBe('Marie');
    unsubscribe();
    manager.setState('user.name', 'No callback');
    expect(userValues.at(-1)).toEqual({ name: 'Marie' });
  });

  it('rejects invalid values without mutating state', () => {
    const validator = {
      validate: vi.fn((_path: string, value: unknown) => typeof value === 'string'),
      getValidationErrors: vi.fn(() => ['must be a string']),
    };
    const manager = new ValidatedStateManager(validator);

    manager.setState('name', 42);
    expect(manager.getState('name')).toBeUndefined();
    manager.setState('name', 'Ada');
    expect(manager.getState('name')).toBe('Ada');
    expect(validator.getValidationErrors).toHaveBeenCalled();
  });

  it('persists changes and can clear the persisted state', async () => {
    const persistence = {
      load: vi.fn().mockResolvedValue({ count: 2 }),
      save: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const manager = new PersistentStateManager(persistence, 'counter');

    await Promise.resolve();
    expect(manager.getState('count')).toBe(2);
    await manager.setState('count', 3);
    await manager.clearPersistence();
    expect(persistence.save).toHaveBeenCalledWith('counter', { count: 3 });
    expect(persistence.remove).toHaveBeenCalledWith('counter');
  });
});
