import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeMarker = '__filamentReactWrapperRuntime';

describe('runtimeGuard', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as Record<string, unknown>)[runtimeMarker];
  });

  afterEach(() => {
    delete (window as Record<string, unknown>)[runtimeMarker];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function loadRuntime(mode: 'prebuilt' | 'vite' | 'unknown') {
    vi.stubGlobal('__REACT_WRAPPER_RUNTIME_MODE__', mode);
    return import('../../resources/js/runtimeGuard');
  }

  it('registers a clean runtime marker and allows initialization', async () => {
    const runtime = await loadRuntime('prebuilt');

    expect(runtime.runtimeCanInitialize).toBe(true);
    expect((window as Record<string, unknown>)[runtimeMarker]).toEqual(runtime.runtimeInfo);
  });

  it('allows a second runtime with the same mode without reporting a conflict', async () => {
    window[runtimeMarker] = { mode: 'prebuilt', reactVersion: '18.2.0' };
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const runtime = await loadRuntime('prebuilt');

    expect(runtime.runtimeCanInitialize).toBe(true);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns but allows the same mode with a different React major', async () => {
    window[runtimeMarker] = { mode: 'prebuilt', reactVersion: '17.0.2' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const runtime = await loadRuntime('prebuilt');

    expect(runtime.runtimeCanInitialize).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('different React major versions'));
  });

  it('refuses a second runtime with a different mode', async () => {
    window[runtimeMarker] = { mode: 'prebuilt', reactVersion: '18.3.1' };
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const runtime = await loadRuntime('vite');

    expect(runtime.runtimeCanInitialize).toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Refusing to initialize a vite runtime'));
  });

  it('allows unknown modes so test and future build environments are not blocked', async () => {
    window[runtimeMarker] = { mode: 'prebuilt', reactVersion: '18.3.1' };

    const runtime = await loadRuntime('unknown');

    expect(runtime.runtimeCanInitialize).toBe(true);
  });
});
