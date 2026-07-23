import { FilamentReactAdapter } from '../../resources/js/components/adapters/FilamentReactAdapter';
import { universalReactRenderer } from '../../resources/js/components/UniversalReactRenderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('FilamentReactAdapter', () => {
  afterEach(() => {
    FilamentReactAdapter.cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete window.Livewire;
  });

  it('creates a form field container with serialised integration data', () => {
    const field = FilamentReactAdapter.createFormField({
      component: 'ProfileField',
      statePath: 'profile.name',
      props: { required: true },
      containerId: 'profile-field',
    });

    expect(field.id).toBe('profile-field');
    expect(field.dataset.reactComponent).toBe('ProfileField');
    expect(field.dataset.reactStatePath).toBe('profile.name');
    expect(JSON.parse(field.dataset.reactProps!)).toEqual({ required: true });
  });

  it('syncs React changes to Livewire and server changes after a morph', () => {
    vi.useFakeTimers();
    const set = vi.fn();
    let livewireValue = 'From Livewire';
    let morphCallback: (() => void) | undefined;
    const get = vi.fn(() => livewireValue);
    const hook = vi.fn((_name: string, callback: () => void) => {
      morphCallback = callback;
    });
    window.Livewire = {
      find: vi.fn(() => ({
        call: vi.fn(),
        set: vi.fn(),
        get,
        $set: set,
      })),
      hook,
    };

    let rendererProps: Parameters<typeof universalReactRenderer.render>[0] | undefined;
    vi.spyOn(universalReactRenderer, 'render').mockImplementation(props => {
      rendererProps = props;
      props.onMounted?.();
    });
    const updateProps = vi
      .spyOn(universalReactRenderer, 'updateProps')
      .mockImplementation(() => {});
    vi.spyOn(universalReactRenderer, 'hasActiveComponent').mockReturnValue(true);
    const loaded = vi.fn();

    document.body.innerHTML =
      '<div wire:id="lw-1"><div id="profile-field" data-react-component="ProfileField" ' +
      'data-react-state-path="data.profile.name" data-react-props="{}"></div></div>';
    document.getElementById('profile-field')!.addEventListener('react-loaded', loaded);

    FilamentReactAdapter.initializeComponents();
    vi.runAllTimers();
    rendererProps?.onDataChange?.('From React');
    livewireValue = 'From Livewire';
    morphCallback?.();

    expect(window.Livewire.find).toHaveBeenCalledWith('lw-1');
    expect(set).toHaveBeenCalledWith('data.profile.name', 'From React');
    expect(hook).toHaveBeenCalledWith('morphed', expect.any(Function));
    expect(get).toHaveBeenCalledWith('data.profile.name');
    expect(updateProps).toHaveBeenCalledWith('profile-field', { value: 'From Livewire' });
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  it('mounts dynamically added containers and tolerates malformed props', async () => {
    vi.useFakeTimers();
    const render = vi.spyOn(universalReactRenderer, 'render').mockImplementation(() => {});
    document.body.innerHTML = '<div id="root"></div>';

    FilamentReactAdapter.initializeComponents();
    document.getElementById('root')!.innerHTML =
      `<div id="valid" data-react-component="ProfileField" data-react-props='{"enabled":true}'></div>` +
      '<div id="invalid" data-react-component="ProfileField" data-react-props="not-json"></div>';
    await Promise.resolve();
    vi.runAllTimers();
    await Promise.resolve();

    expect(render).toHaveBeenCalledTimes(2);
    expect(document.getElementById('valid')?.dataset.reactRendered).toBe('true');
    expect(document.getElementById('invalid')?.dataset.reactRendered).toBe('true');
  });

  it('pushes server-rendered props into an existing React island after a Livewire morph', () => {
    vi.useFakeTimers();
    const render = vi.spyOn(universalReactRenderer, 'render').mockImplementation(props => {
      props.onMounted?.();
    });
    const updateProps = vi.spyOn(universalReactRenderer, 'updateProps').mockImplementation(() => {});

    document.body.innerHTML =
      '<div id="morphed-field" data-react-component="ProfileField" ' +
      'data-react-props=\'{"value":"before","errors":[]}\'></div>';

    FilamentReactAdapter.initializeComponents();
    vi.runAllTimers();

    document.getElementById('morphed-field')?.setAttribute(
      'data-react-props',
      '{"value":"after","errors":["Required"]}'
    );
    document.dispatchEvent(new Event('livewire:navigated'));

    expect(render).toHaveBeenCalledTimes(1);
    expect(updateProps).toHaveBeenCalledWith('morphed-field', {
      value: 'after',
      errors: ['Required'],
    });
  });

  it('removes the old livewire:update dependency and rescans after navigation', () => {
    vi.useFakeTimers();
    const render = vi.spyOn(universalReactRenderer, 'render').mockImplementation(() => {});
    document.body.innerHTML =
      '<div data-react-props="{}"></div><div data-react-component="ProfileField"></div>';

    FilamentReactAdapter.initializeComponents();
    vi.runOnlyPendingTimers();
    expect(render).toHaveBeenCalledTimes(1);

    document.querySelector('[data-react-component]')?.removeAttribute('data-react-rendered');
    document.dispatchEvent(new Event('livewire:navigated'));
    vi.advanceTimersByTime(100);
    vi.runOnlyPendingTimers();
    expect(render).toHaveBeenCalledTimes(2);
  });
});
