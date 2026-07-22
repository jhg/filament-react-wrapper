import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilamentBridge } from '../../resources/js/services/FilamentBridge';

describe('FilamentBridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'Livewire');
  });

  it('prefers an explicitly configured Livewire component', async () => {
    const call = vi.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(window, 'Livewire', {
      configurable: true,
      value: { find: vi.fn().mockReturnValue({ call }) },
    });
    const bridge = new FilamentBridge({ livewireComponentId: 'lw-1' });

    await expect(bridge.call('refresh', 1)).resolves.toEqual({ ok: true });
    expect(call).toHaveBeenCalledWith('refresh', 1);
  });

  it('uses the configured HTTP bridge and supports local listeners', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ saved: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const bridge = new FilamentBridge({ baseUrl: '/custom', token: 'csrf' });
    const listener = vi.fn();
    const unsubscribe = bridge.on('saved', listener);

    bridge.emitLocal('saved', { id: 1 });
    unsubscribe();
    bridge.emitLocal('saved', { id: 2 });

    await expect(bridge.call('save', { id: 1 })).resolves.toEqual({ saved: true });
    expect(listener).toHaveBeenCalledWith({ id: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      '/custom/react-bridge',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'csrf' }),
      })
    );
  });

  it('can reconfigure a bridge and reports failed HTTP responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal('fetch', fetchMock);
    const bridge = new FilamentBridge({ baseUrl: '/one' }).configure({ baseUrl: '/two' });

    await expect(bridge.refresh()).rejects.toThrow('HTTP error! status: 403');
    expect(fetchMock).toHaveBeenCalledWith('/two/react-bridge', expect.anything());
  });
});
