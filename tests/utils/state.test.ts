import { describe, expect, it, vi } from 'vitest';
import {
  getNestedValue,
  isStateRecord,
  notifySubscribers,
  setNestedValue,
} from '../../resources/js/utils/state';

describe('state helpers', () => {
  it('reads and immutably writes nested values', () => {
    const original = { user: { name: 'Ada' }, untouched: true };
    const updated = setNestedValue(original, 'user.name', 'Grace');

    expect(getNestedValue(original, 'user.name')).toBe('Ada');
    expect(getNestedValue(updated, 'user.name')).toBe('Grace');
    expect(original).toEqual({ user: { name: 'Ada' }, untouched: true });
    expect(updated).toEqual({ user: { name: 'Grace' }, untouched: true });
  });

  it('handles missing paths and non-record values safely', () => {
    expect(isStateRecord(null)).toBe(false);
    expect(isStateRecord([])).toBe(false);
    expect(isStateRecord({})).toBe(true);
    expect(getNestedValue({ user: 'invalid' }, 'user.name')).toBeUndefined();
    expect(setNestedValue({}, 'user.profile.name', 'Ada')).toEqual({
      user: { profile: { name: 'Ada' } },
    });
  });

  it('notifies exact and parent subscribers and reports callback failures', () => {
    const subscribers = new Map([
      ['user', new Set([(value: unknown) => expect(value).toEqual({ name: 'Ada' })])],
      ['user.name', new Set([(value: unknown) => expect(value).toBe('Ada')])],
    ]);
    const onError = vi.fn();

    notifySubscribers(subscribers, { user: { name: 'Ada' } }, 'user.name', 'Ada', onError);

    expect(onError).not.toHaveBeenCalled();

    const failing = new Map([
      ['user.name', new Set([(value: unknown) => { throw new Error(String(value)); }])],
    ]);
    notifySubscribers(failing, { user: { name: 'Ada' } }, 'user.name', 'Ada', onError);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'user.name');
  });
});
