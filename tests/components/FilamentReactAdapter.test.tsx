import { FilamentReactAdapter } from '../../resources/js/components/adapters/FilamentReactAdapter';
import { universalReactRenderer } from '../../resources/js/components/UniversalReactRenderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('FilamentReactAdapter', () => {
  afterEach(() => {
    FilamentReactAdapter.cleanup();
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

  it('updates active containers from a Livewire event', () => {
    document.body.innerHTML =
      '<div id="profile-field" data-react-component="ProfileField" data-react-state-path="profile.name"></div>';
    const hasActive = vi.spyOn(universalReactRenderer, 'hasActiveComponent').mockReturnValue(true);
    const updateProps = vi
      .spyOn(universalReactRenderer, 'updateProps')
      .mockImplementation(() => {});

    FilamentReactAdapter.handleLivewireUpdate(
      new CustomEvent('livewire:update', {
        detail: { component: 'ProfileField', statePath: 'profile.name', data: 'Ada' },
      })
    );

    expect(hasActive).toHaveBeenCalledWith('profile-field');
    expect(updateProps).toHaveBeenCalledWith('profile-field', 'Ada');
  });

  it('scans new containers and tolerates malformed props', () => {
    vi.useFakeTimers();
    const render = vi.spyOn(universalReactRenderer, 'render').mockImplementation(() => {});
    document.body.innerHTML =
      `<div id="valid" data-react-component="ProfileField" data-react-props='{"enabled":true}'></div>` +
      '<div id="invalid" data-react-component="ProfileField" data-react-props="not-json"></div>';

    FilamentReactAdapter.initializeComponents();
    vi.runAllTimers();

    expect(render).toHaveBeenCalledTimes(2);
    expect(document.getElementById('valid')?.dataset.reactRendered).toBe('true');
    expect(document.getElementById('invalid')?.dataset.reactRendered).toBe('true');
    vi.useRealTimers();
  });

  it('skips unnamed containers and reacts to Livewire navigation', () => {
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
    document.dispatchEvent(
      new CustomEvent('livewire:update', { detail: { component: 'ProfileField', data: {} } })
    );
    window.dispatchEvent(new Event('beforeunload'));
    vi.useRealTimers();
  });
});
