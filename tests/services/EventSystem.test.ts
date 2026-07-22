import { describe, expect, it, vi } from 'vitest';
import { EventSystem } from '../../resources/js/services/EventSystem';

describe('EventSystem', () => {
  it('runs listeners by priority and passes each result forward', () => {
    const events = new EventSystem();
    const order: string[] = [];

    events.on('change', value => {
      order.push(`high:${String(value)}`);
      return `${String(value)}!`;
    }, 20);
    events.on('change', value => {
      order.push(`low:${String(value)}`);
      return `${String(value)}?`;
    }, 1);

    expect(events.emit('change', 'value')).toBe('value!?');
    expect(order).toEqual(['high:value', 'low:value!']);
    expect(events.getListenerCount('change')).toBe(2);
  });

  it('supports removal, event checks, and resilient listener errors', () => {
    const events = new EventSystem();
    const listener = vi.fn(() => { throw new Error('boom'); });
    events.on('failure', listener);

    expect(events.hasListeners('failure')).toBe(true);
    expect(events.emit('failure', 'unchanged')).toBe('unchanged');
    events.off('failure', listener);
    expect(events.hasListeners('failure')).toBe(false);
    events.clear();
    expect(events.getListenerCount()).toBe(0);
  });
});
