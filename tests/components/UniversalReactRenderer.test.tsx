import React from 'react';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  componentRegistry,
} from '../../resources/js/components/ReactComponentRegistry';
import type { IComponentDefinition } from '../../resources/js/interfaces/IComponentRegistry';
import { UniversalReactRenderer } from '../../resources/js/components/UniversalReactRenderer';

const definition: IComponentDefinition = {
  name: 'RendererProbe',
  component: ({ label }: { label?: string }) => <span>{label || 'empty'}</span>,
  isAsync: false,
};

describe('UniversalReactRenderer', () => {
  afterEach(() => {
    componentRegistry.unregister(definition.name);
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

    renderer.unmount('renderer-container');
    expect(renderer.hasActiveComponent('renderer-container')).toBe(false);
  });

  it('reports missing containers and renders registry errors', async () => {
    const onError = vi.fn();
    const renderer = new UniversalReactRenderer();

    renderer.render({ component: 'Missing', containerId: 'missing', onError });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    document.body.innerHTML = '<div id="error-container"></div>';
    await act(async () => {
      renderer.render({ component: 'Missing', containerId: 'error-container', onError });
    });
    expect(screen.getByText(/Component "Missing" not found/)).toBeInTheDocument();
    renderer.unmountAll();
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
    renderer.unmountAll();
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
    renderer.unmountAll();
    componentRegistry.unregister('FieldProbe');
  });
});
