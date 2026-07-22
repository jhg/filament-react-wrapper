import React from 'react';
import { componentRegistry } from './ReactComponentRegistry';
import { universalReactRenderer } from './UniversalReactRenderer';
import type {
  ComponentProps,
  IComponentDefinition,
  IComponentMetadata,
  ReactComponent,
} from '../interfaces/IComponentRegistry';
import { registerFilamentReactGlobals } from '../utils/globals';

let autoMountTimeout: ReturnType<typeof setTimeout> | null = null;

const scheduleAutoMount = () => {
  if (typeof document === 'undefined' || autoMountTimeout !== null) return;

  autoMountTimeout = setTimeout(() => {
    autoMountTimeout = null;
    autoMountIslands();
  }, 0);
};

// MingleJS-inspired simple component registration
export interface SimpleComponentConfig<P extends object = Record<string, unknown>> {
  lazy?: boolean;
  category?: string;
  props?: Partial<P> & ComponentProps;
  /** Registry naming used by the advanced API, accepted for convenience. */
  defaultProps?: Partial<P> & ComponentProps;
  metadata?: IComponentMetadata;
  middleware?: string[];
}

// Decorator pattern for component registration
export function Component(name: string, config: SimpleComponentConfig = {}) {
  return function <T extends ReactComponent>(target: T): T {
    // Auto-register component when decorator is applied
    componentRegistry.register({
      name,
      component: target,
      isAsync: false,
      defaultProps: config.defaultProps ?? config.props ?? {},
      config: {
        lazy: config.lazy || false,
        dependencies: [],
        // Exclude middleware to avoid type conflicts
        ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'middleware')),
      },
      metadata: {
        ...config.metadata,
        category: config.category ?? config.metadata?.category ?? 'general',
        description: config.metadata?.description ?? `Auto-registered component: ${name}`,
      },
    });
    scheduleAutoMount();

    return target;
  };
}

// Simple component registration function (alternative to decorator)
export const registerComponent = <P extends object>(
  name: string,
  component: React.ComponentType<P>,
  config: SimpleComponentConfig<P> = {}
) => {
  componentRegistry.register({
    name,
    component,
    isAsync: false,
    defaultProps: config.defaultProps ?? config.props ?? {},
    config: {
      lazy: config.lazy || false,
      dependencies: [],
      // Exclude middleware to avoid type conflicts
      ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'middleware')),
    },
    metadata: {
      ...config.metadata,
      category: config.category ?? config.metadata?.category ?? 'general',
      description: config.metadata?.description ?? `Simple registered component: ${name}`,
    },
  });
  scheduleAutoMount();
};

/**
 * Register a named component map and return the same map for convenient
 * composition in a normal React entrypoint.
 */
export const defineComponents = <T extends Record<string, ReactComponent>>(components: T): T => {
  Object.entries(components).forEach(([name, component]) => {
    componentRegistry.register({ name, component, isAsync: false });
  });

  scheduleAutoMount();

  return components;
};

/** Register a component whose value is loaded through a dynamic import. */
export const registerLazyComponent = (
  name: string,
  loader: () => Promise<{ default: ReactComponent }>,
  config: SimpleComponentConfig = {}
) => {
  componentRegistry.register({
    name,
    component: loader,
    isAsync: true,
    defaultProps: config.defaultProps ?? config.props ?? {},
    config: {
      lazy: true,
      dependencies: [],
      ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'middleware')),
    },
    metadata: {
      ...config.metadata,
      category: config.category ?? config.metadata?.category ?? 'general',
      description: config.metadata?.description ?? `Lazy registered component: ${name}`,
    },
  });
  scheduleAutoMount();
};

// Simple component getter
export const getComponent = (name: string) => {
  return componentRegistry.get(name);
};

// Simple component list
export const listComponents = (category?: string) => {
  const components = componentRegistry.getAll();

  if (category) {
    const filteredComponents = new Map<string, IComponentDefinition>();
    components.forEach((definition, name) => {
      if (definition.metadata?.category === category) filteredComponents.set(name, definition);
    });
    return filteredComponents;
  }

  return components;
};

// Island renderer (MingleJS style)
export const mountIsland = (
  selector: string | Element,
  componentName: string,
  props: ComponentProps = {}
) => {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!element) {
    console.warn(`Element with selector "${String(selector)}" not found`);
    return undefined;
  }

  const component = getComponent(componentName);
  if (!component) {
    console.warn(`Component "${componentName}" not found`);
    return undefined;
  }

  const htmlElement = element as HTMLElement;
  if (!htmlElement.id) {
    htmlElement.id = `react-island-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  htmlElement.dataset.reactComponent = componentName;
  htmlElement.dataset.reactProps = JSON.stringify(props);
  htmlElement.setAttribute('data-react-rendered', 'true');

  universalReactRenderer.render({
    component: componentName,
    props,
    containerId: htmlElement.id,
    onError: error => {
      htmlElement.removeAttribute('data-react-rendered');
      console.error(`Failed to mount island "${componentName}":`, error);
    },
  });

  return () => universalReactRenderer.unmount(htmlElement.id);
};

// Auto-mount islands from DOM attributes
export const autoMountIslands = () => {
  const islands = document.querySelectorAll<HTMLElement>(
    '[data-react-component]:not([data-react-rendered])'
  );

  islands.forEach(island => {
    const componentName = island.getAttribute('data-react-component');
    const propsData = island.getAttribute('data-react-props');

    if (componentName) {
      let props = {};
      if (propsData) {
        try {
          props = JSON.parse(propsData);
        } catch (error) {
          console.warn('Invalid props data for component:', componentName, error);
        }
      }

      mountIsland(island, componentName, props);
    }
  });
};

// Simple component factory
export const createComponent = (name: string, render: React.ComponentType<object>) => {
  const Component = render;
  registerComponent(name, Component);
  return Component;
};

// Batch component registration
export const registerComponents = (components: Record<string, ReactComponent>) => {
  Object.entries(components).forEach(([name, component]) => {
    componentRegistry.register({ name, component, isAsync: false });
  });

  scheduleAutoMount();
};

// Export for global access
if (typeof window !== 'undefined') {
  registerFilamentReactGlobals({
    registerComponent,
    defineComponents,
    getComponent,
    listComponents,
    mountIsland,
    registerLazyComponent,
    autoMountIslands,
    createComponent,
    registerComponents,
  });
}
