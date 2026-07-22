import {
  getFilamentReactNamespace,
  registerFilamentReactGlobals,
  setWindowGlobal,
} from '../../resources/js/utils/globals';
import { describe, expect, it } from 'vitest';

describe('browser globals', () => {
  it('merges package globals without replacing the namespace', () => {
    registerFilamentReactGlobals({ existing: 'kept' });
    const namespace = registerFilamentReactGlobals({ registry: 'registered' });

    expect(namespace).toEqual({ existing: 'kept', registry: 'registered' });
    expect(getFilamentReactNamespace()).toBe(namespace);

    setWindowGlobal('standalone', 42);
    expect((window as unknown as Record<string, unknown>).standalone).toBe(42);
  });
});
