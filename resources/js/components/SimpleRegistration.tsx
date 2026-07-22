import React from 'react';
import { componentRegistry } from './ReactComponentRegistry';
import type {
  ComponentProps,
  IComponentDefinition,
  ReactComponent,
} from '../interfaces/IComponentRegistry';

// MingleJS-inspired simple component registration
export interface SimpleComponentConfig {
  lazy?: boolean;
  category?: string;
  props?: ComponentProps;
  middleware?: string[];
}

// Decorator pattern for component registration
export function Component(name: string, config: SimpleComponentConfig = {}) {
  return function <T extends ReactComponent>(target: T): T {
    // Auto-register component when decorator is applied
    componentRegistry.register({
      name,
      component: target,
      defaultProps: config.props || {},
      config: {
        lazy: config.lazy || false,
        dependencies: [],
        // Exclude middleware to avoid type conflicts
        ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'middleware')),
      },
      metadata: {
        category: config.category || 'general',
        description: `Auto-registered component: ${name}`,
      },
    });

    return target;
  };
}

// Simple component registration function (alternative to decorator)
export const registerComponent = <T extends ReactComponent>(
  name: string,
  component: T,
  config: SimpleComponentConfig = {}
) => {
  componentRegistry.register({
    name,
    component,
    defaultProps: config.props || {},
    config: {
      lazy: config.lazy || false,
      dependencies: [],
      // Exclude middleware to avoid type conflicts
      ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'middleware')),
    },
    metadata: {
      category: config.category || 'general',
      description: `Simple registered component: ${name}`,
    },
  });
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
  selector: string,
  componentName: string,
  props: ComponentProps = {}
) => {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`Element with selector "${selector}" not found`);
    return;
  }

  const component = getComponent(componentName);
  if (!component) {
    console.warn(`Component "${componentName}" not found`);
    return;
  }

  // Dynamic import for React DOM
  import('react-dom/client')
    .then(({ createRoot }) => {
      const root = createRoot(element);
      const Component = component.component as ReactComponent;
      root.render(React.createElement(Component, props));
    })
    .catch(error => {
      console.error('Failed to mount island:', error);
    });
};

// Auto-mount islands from DOM attributes
export const autoMountIslands = () => {
  const islands = document.querySelectorAll('[data-react-component]');

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

      mountIsland(`[data-react-component="${componentName}"]`, componentName, props);
    }
  });
};

// Simple component factory
export const createComponent = (name: string, render: ReactComponent) => {
  const Component = render;
  registerComponent(name, Component);
  return Component;
};

// Batch component registration
export const registerComponents = (components: Record<string, ReactComponent>) => {
  Object.entries(components).forEach(([name, component]) => {
    registerComponent(name, component);
  });
};

// Export for global access
if (typeof window !== 'undefined') {
  window.FilamentReact = {
    registerComponent,
    getComponent,
    listComponents,
    mountIsland,
    autoMountIslands,
    createComponent,
    registerComponents,
  };
}
