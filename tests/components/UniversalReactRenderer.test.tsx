import React from 'react';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  componentRegistry,
} from '../../resources/js/components/ReactComponentRegistry';
import type { IComponentDefinition } from '../../resources/js/interfaces/IComponentRegistry';
import {
  NOT_FOUND_GRACE_MS,
  UniversalReactRenderer,
} from '../../resources/js/components/UniversalReactRenderer';

const definition: IComponentDefinition = {
  name: 'RendererProbe',
  component: ({ label }: { label?: string }) => <span>{label || 'empty'}</span>,
  isAsync: false,
};

describe('UniversalReactRenderer', () => {
  afterEach(() => {
    componentRegistry.unregister(definition.name);
    vi.useRealTimers();
  });

  it('renders registered components and tracks active containers', async () => {
    componentRegistry.register(definition);
    document.body.innerHTML = '<div id="renderer-container"></div>';
    const renderer = new UniversalReactRenderer();

    await act(async () => {
      renderer.render({
        component: definition.name,
        props: { label: 'Rendered' },
        containerId: 'renderer-container',
      });
    });

    expect(screen.getByText('Rendered')).toBeInTheDocument();
    expect(renderer.isRendered('renderer-container')).toBe(true);
    expect(renderer.getActiveContainers()).toEqual(['renderer-container']);

    await act(async () => renderer.unmount('renderer-container'));
    expect(renderer.hasActiveComponent('renderer-container')).toBe(false);
  });

  it('reports missing containers and renders registry errors', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const renderer = new UniversalReactRenderer();
    const missingContainerError = vi.fn();

    renderer.render({ component: 'Missing', containerId: 'missing', onError: missingContainerError });
    expect(missingContainerError).toHaveBeenCalledWith(expect.any(Error));

    document.body.innerHTML = '<div id="error-container"></div>';
    await act(async () => {
      renderer.render({ component: 'Missing', containerId: 'error-container', onError });
    });
    expect(screen.queryByText(/Component "Missing" not found/)).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(NOT_FOUND_GRACE_MS);
    });
    expect(screen.getByText(/Component "Missing" not found/)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ReactWrapperComponentNotFound' })
    );
    await act(async () => renderer.unmountAll());
  });

  it('mounts a component registered after the initial render without a rescan', async () => {
    const renderer = new UniversalReactRenderer();
    document.body.innerHTML = '<div id="late-container"></div>';

    await act(async () => {
      renderer.render({ component: 'LateComponent', containerId: 'late-container' });
    });

    expect(document.getElementById('late-container')?.textContent).toBe('');

    await act(async () => {
      componentRegistry.register({
        name: 'LateComponent',
        component: () => <span>Registered late</span>,
        isAsync: false,
      });
    });

    expect(screen.getByText('Registered late')).toBeInTheDocument();
    await act(async () => renderer.unmountAll());
    componentRegistry.unregister('LateComponent');
  });

  it('updates props using the container metadata and safely ignores unknown containers', async () => {
    componentRegistry.register(definition);
    document.body.innerHTML =
      '<div id="update-container" data-component="RendererProbe" data-state-path="profile"></div>';
    const container = document.getElementById('update-container')!;
    container.dataset.component = definition.name;
    const renderer = new UniversalReactRenderer();

    await act(async () => {
      renderer.render({
        component: definition.name,
        props: { label: 'Before' },
        containerId: container.id,
        statePath: 'profile',
      });
    });
    await act(async () => renderer.updateProps(container.id, { label: 'After' }));
    expect(screen.getByText('After')).toBeInTheDocument();

    expect(() => renderer.updateProps('unknown', {})).not.toThrow();
    await act(async () => renderer.unmountAll());
  });

  it('adapts Filament fields to value and onChange props', async () => {
    const onChange = vi.fn();
    const FieldProbe = ({
      value,
      onChange: change,
    }: {
      value: string;
      onChange: (value: string) => void;
    }) => <button onClick={() => change(`${value}!`)}>{value}</button>;

    componentRegistry.register({
      name: 'FieldProbe',
      component: FieldProbe,
      isAsync: false,
    });
    document.body.innerHTML = '<div id="field-container"></div>';
    const renderer = new UniversalReactRenderer();

    await act(async () => {
      renderer.render({
        component: 'FieldProbe',
        props: { isField: true, fieldName: 'profile.name', value: 'Ada' },
        containerId: 'field-container',
        onDataChange: onChange,
      });
    });

    await act(async () => {
      screen.getByRole('button').click();
    });

    expect(onChange).toHaveBeenCalledWith('Ada!');
    await act(async () => renderer.unmountAll());
    componentRegistry.unregister('FieldProbe');
  });
});
