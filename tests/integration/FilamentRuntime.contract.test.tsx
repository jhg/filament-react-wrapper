import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { componentRegistry } from '../../resources/js/components/ReactComponentRegistry';
import { FilamentReactAdapter } from '../../resources/js/components/adapters/FilamentReactAdapter';
import { universalReactRenderer } from '../../resources/js/components/UniversalReactRenderer';
import { useReactField, type ReactFieldProps } from '../../resources/js/hooks/useReactField';

function IntegrationControlledEditor(props: ReactFieldProps<string>) {
  const field = useReactField({
    ...props,
    value: props.value ?? '',
  });

  return (
    <button
      type="button"
      data-testid="controlled-editor"
      disabled={field.disabled}
      onClick={() => field.setValue('edited by real React')}
    >
      {field.value}
      {field.errors.length > 0 ? `|${field.errors.join('|')}` : ''}
    </button>
  );
}

describe('Filament runtime contract', () => {
  const wire = {
    $set: vi.fn(),
    $watch: vi.fn((_path: string, callback: (value: unknown) => void) => {
      watchCallbacks.push(callback);
    }),
    $call: vi.fn(),
  };
  let watchCallbacks: Array<(value: unknown) => void> = [];

  afterEach(() => {
    FilamentReactAdapter.cleanup();
    universalReactRenderer.unmountAll();
    watchCallbacks = [];
    vi.restoreAllMocks();
    delete window.Livewire;
    document.body.innerHTML = '';
  });

  it('mounts a real controlled React component and synchronizes both directions', async () => {
    componentRegistry.register({
      name: 'IntegrationControlledEditor',
      component: IntegrationControlledEditor,
      isAsync: false,
    });

    window.Livewire = {
      find: vi.fn(() => wire),
    };

    document.body.innerHTML = `
      <div wire:id="real-livewire-component">
        <div
          id="real-field"
          data-react-component="IntegrationControlledEditor"
          data-react-state-path="data.content"
          data-react-reactive="true"
          data-react-props='{"isField":true,"value":"initial value","errors":[]}'
        ></div>
      </div>
    `;

    const loaded = vi.fn();
    document.getElementById('real-field')?.addEventListener('react-loaded', loaded);
    FilamentReactAdapter.initializeComponents();

    await waitFor(() => expect(document.querySelector('[data-testid="controlled-editor"]')).toBeTruthy());
    expect(loaded).toHaveBeenCalledTimes(1);
    expect(wire.$watch).toHaveBeenCalledWith('data.content', expect.any(Function));

    await act(async () => {
      fireEvent.click(document.querySelector('[data-testid="controlled-editor"]')!);
    });
    expect(wire.$set).toHaveBeenCalledWith('data.content', 'edited by real React');

    await act(async () => {
      watchCallbacks.forEach(callback => callback('updated by Livewire'));
    });
    await waitFor(() => expect(document.querySelector('[data-testid="controlled-editor"]')).toHaveTextContent('updated by Livewire'));
  });

  it('handles React validation events and exposes them through the controlled error props', async () => {
    componentRegistry.register({
      name: 'IntegrationControlledEditor',
      component: IntegrationControlledEditor,
      isAsync: false,
    });

    window.Livewire = { find: vi.fn(() => wire) };
    document.body.innerHTML = `
      <div wire:id="validation-component">
        <div id="validation-field" data-react-component="IntegrationControlledEditor"
          data-react-state-path="data.content" data-react-props='{"isField":true,"value":"value","errors":[]}'></div>
      </div>
    `;

    FilamentReactAdapter.initializeComponents();
    await waitFor(() => expect(document.querySelector('[data-testid="controlled-editor"]')).toBeTruthy());

    const field = document.getElementById('validation-field')!;
    await act(async () => {
      field.dispatchEvent(
        new CustomEvent('react-validation-error', {
          detail: { errors: ['The editor value is invalid.'] },
          bubbles: true,
        })
      );
    });

    await waitFor(() => expect(field).toHaveTextContent('The editor value is invalid.'));

    await act(async () => {
      field.dispatchEvent(new CustomEvent('react-validation-clear', { bubbles: true }));
    });
    await waitFor(() => expect(field).not.toHaveTextContent('The editor value is invalid.'));
  });

  it('mounts components inserted after initialization and neutralizes stale watchers on removal', async () => {
    componentRegistry.register({
      name: 'IntegrationControlledEditor',
      component: IntegrationControlledEditor,
      isAsync: false,
    });

    window.Livewire = { find: vi.fn(() => wire) };
    document.body.innerHTML = '<main id="dynamic-root"></main>';
    FilamentReactAdapter.initializeComponents();

    const root = document.getElementById('dynamic-root')!;
    root.innerHTML = `
      <div wire:id="dynamic-component">
        <div id="dynamic-field" data-react-component="IntegrationControlledEditor"
          data-react-state-path="data.content" data-react-props='{"isField":true,"value":"dynamic"}'></div>
      </div>
    `;

    await waitFor(() => expect(document.querySelector('[data-testid="controlled-editor"]')).toBeTruthy());
    expect(universalReactRenderer.isRendered('dynamic-field')).toBe(true);

    const warn = vi.spyOn(console, 'warn');
    root.innerHTML = '';
    await waitFor(() => expect(universalReactRenderer.isRendered('dynamic-field')).toBe(false));

    watchCallbacks.forEach(callback => callback('late update'));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('No rendered component found'));
  });
});
