import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import {
  componentRegistry,
  registerComponents,
  ReactComponentRegistry,
} from '../../resources/js/components/ReactComponentRegistry';
import { universalReactRenderer } from '../../resources/js/components/UniversalReactRenderer';

// Simple mock component for testing
const TestComponent = ({ title = 'Test' }: { title?: string }) =>
  React.createElement('div', { 'data-testid': 'test-component' }, title);

describe('ComponentRegistry - Basic Functionality', () => {
  beforeEach(() => {
    componentRegistry.clear();
  });

  it('should register and retrieve a component', () => {
    componentRegistry.register({
      name: 'TestComponent',
      component: TestComponent,
    });

    expect(componentRegistry.has('TestComponent')).toBe(true);
    const retrieved = componentRegistry.get('TestComponent');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('TestComponent');
  });

  it('should return false for non-existent components', () => {
    expect(componentRegistry.has('NonExistent')).toBe(false);
    expect(componentRegistry.get('NonExistent')).toBeUndefined();
  });

  it('should clear all components', () => {
    componentRegistry.register({
      name: 'TestComponent1',
      component: TestComponent,
    });

    componentRegistry.register({
      name: 'TestComponent2',
      component: TestComponent,
    });

    expect(componentRegistry.getComponentNames()).toHaveLength(2);

    componentRegistry.clear();

    expect(componentRegistry.getComponentNames()).toHaveLength(0);
  });

  it('should get component names', () => {
    componentRegistry.register({
      name: 'Component1',
      component: TestComponent,
    });

    componentRegistry.register({
      name: 'Component2',
      component: TestComponent,
    });

    const names = componentRegistry.getComponentNames();
    expect(names).toContain('Component1');
    expect(names).toContain('Component2');
    expect(names).toHaveLength(2);
  });

  it('should unregister components', () => {
    componentRegistry.register({
      name: 'TestComponent',
      component: TestComponent,
    });

    expect(componentRegistry.has('TestComponent')).toBe(true);

    const removed = componentRegistry.unregister('TestComponent');
    expect(removed).toBe(true);
    expect(componentRegistry.has('TestComponent')).toBe(false);
  });

  it('should return stats', () => {
    componentRegistry.register({
      name: 'TestComponent',
      component: TestComponent,
    });

    const stats = componentRegistry.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalComponents).toBe('number');
  });

  it('filters components and applies middleware', () => {
    const registry = new ReactComponentRegistry();
    const hook = vi.fn();
    const middleware = vi.fn((component: React.ElementType, _props, context) => {
      context.hooks.addHook('middleware:hook', hook);
      context.hooks.executeHooks('middleware:hook', { ok: true });
      context.hooks.removeHook('middleware:hook', hook);
      return component;
    });
    const callback = vi.fn();
    registry.on('component:registered', callback);
    registry.addMiddleware(middleware);
    registry.register({
      name: 'AdminCard',
      component: TestComponent,
      metadata: { category: 'admin', tags: ['card'] },
      config: { middleware: [middleware] },
    });

    expect(registry.getAll({ category: 'admin', tag: 'card' }).has('AdminCard')).toBe(true);
    expect(registry.getAll({ name: /missing/ }).size).toBe(0);
    expect(registry.create('AdminCard', { title: 'Admin' })).toBe(TestComponent);
    expect(middleware).toHaveBeenCalled();
    expect(hook).toHaveBeenCalledWith({ ok: true });
    expect(callback).toHaveBeenCalled();
  });

  it('mounts and unmounts through the universal renderer', () => {
    const registry = new ReactComponentRegistry();
    const render = vi.spyOn(universalReactRenderer, 'render').mockImplementation(() => undefined);
    const unmount = vi.spyOn(universalReactRenderer, 'unmount').mockImplementation(() => undefined);
    registry.register({ name: 'TestComponent', component: TestComponent });

    registry.mount('TestComponent', 'container', { title: 'Mounted' });
    registry.unmount('container');

    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        component: 'TestComponent',
        containerId: 'container',
      })
    );
    expect(unmount).toHaveBeenCalledWith('container');
  });

  it('supports extensions and bulk registration helpers', () => {
    const registry = new ReactComponentRegistry();
    registry.registerExtension('analytics', { enabled: true });
    registerComponents([
      { name: 'One', component: TestComponent },
      { name: 'Two', component: TestComponent },
    ]);

    expect(registry.get('missing')).toBeUndefined();
    expect(componentRegistry.getComponentNames()).toEqual(expect.arrayContaining(['One', 'Two']));
    registry.clear();
    expect(registry.getComponentNames()).toEqual([]);
  });
});
