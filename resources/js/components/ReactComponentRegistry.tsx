import { universalReactRenderer } from './UniversalReactRenderer';
import {
  IComponentRegistry,
  IComponentDefinition,
  IComponentMiddleware,
  IComponentContext,
  IHookManager,
  IEventSystem,
  ReactComponent,
  ComponentCallback,
} from '../interfaces/IComponentRegistry';
import { EventSystem } from '../services/EventSystem';

// Enhanced React Component Registry with SOLID principles
class ReactComponentRegistry implements IComponentRegistry {
  private components: Map<string, IComponentDefinition> = new Map();
  private events: IEventSystem = new EventSystem();
  private extensions: Map<string, unknown> = new Map();
  private middleware: Array<IComponentMiddleware> = [];
  private subscribers = new Set<() => void>();
  // Component factory for future extensibility
  // private componentFactory: ComponentFactoryManager =
  //   new ComponentFactoryManager();

  /**
   * Register a React component with enhanced features
   */
  register(definition: IComponentDefinition): void {
    // Emit before registration event
    this.events.emit('component:registering', { definition });

    // Validate dependencies
    if (definition.config?.dependencies) {
      for (const dep of definition.config.dependencies) {
        if (!this.has(dep)) {
          console.warn(`Component ${definition.name} depends on ${dep} which is not registered`);
        }
      }
    }

    let processedComponent = definition.component;

    // A functional React component is also a function, so it cannot be
    // reliably distinguished from an async module loader at runtime. Async
    // registration is therefore explicit (`isAsync: true`). This prevents a
    // normal `React.FC` from being passed to React.lazy as a loader.

    // Apply global middleware
    for (const middleware of this.middleware) {
      const context: IComponentContext = {
        registry: this,
        hooks: this.createHookManager(),
        config: definition.config || {},
        metadata: definition.metadata || {},
      };

      try {
        const result = middleware(
          processedComponent as ReactComponent,
          definition.defaultProps || {},
          context
        );
        if (result instanceof Promise) {
          // Handle async middleware
          result
            .then(comp => (processedComponent = comp))
            .catch(error => {
              console.error(`Error in async middleware for ${definition.name}:`, error);
            });
        } else {
          processedComponent = result;
        }
      } catch (error) {
        console.error(`Error in middleware for ${definition.name}:`, error);
      }
    }

    // Store the processed definition
    const processedDefinition = {
      ...definition,
      component: processedComponent,
      isAsync: definition.isAsync,
      config: {
        lazy: false,
        cache: false,
        ssr: false,
        preload: false,
        ...definition.config,
      },
    };

    this.components.set(definition.name, processedDefinition);

    // Emit after registration event
    this.events.emit('component:registered', {
      definition: processedDefinition,
    });
    this.notifySubscribers();
  }

  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener);

    return () => {
      this.subscribers.delete(listener);
    };
  }

  /**
   * Get a registered component by name
   */
  get(name: string): IComponentDefinition | undefined {
    const definition = this.components.get(name);
    if (definition) {
      // Emit component access event
      this.events.emit('component:accessed', { name, definition });
    }
    return definition;
  }

  /**
   * Create a component instance with processing
   */
  create(name: string, props: Record<string, unknown> = {}): ReactComponent | null {
    const definition = this.get(name);
    if (!definition) {
      console.error(`Component ${name} not found in registry`);
      return null;
    }

    // Merge props with defaults
    const mergedProps = { ...definition.defaultProps, ...props };

    // Apply component-level middleware
    let component = definition.component;
    if (definition.config?.middleware) {
      for (const middleware of definition.config.middleware) {
        const context: IComponentContext = {
          registry: this,
          hooks: this.createHookManager(),
          config: definition.config,
          metadata: definition.metadata || {},
        };
        // Ensure component is a React component type before passing to middleware
        if (
          typeof component === 'function' &&
          !(component as unknown as Promise<unknown>).then &&
          (component.prototype?.isReactComponent ||
            (typeof component === 'function' && !component.prototype?.isReactComponent))
        ) {
          component = middleware(
            component as ReactComponent,
            mergedProps,
            context
          ) as ReactComponent;
        }
      }
    }

    // Emit component creation event
    this.events.emit('component:created', {
      name,
      props: mergedProps,
      component,
    });

    // Ensure we're returning a valid React component
    if (
      typeof component === 'function' &&
      !(component as unknown as Promise<unknown>).then &&
      (component.prototype?.isReactComponent ||
        (typeof component === 'function' && !component.prototype?.isReactComponent))
    ) {
      return component as ReactComponent;
    }

    // If we somehow got a non-component, return a placeholder
    console.error(`Component ${name} is not a valid React component`);
    return (() => <div>Invalid component: {name}</div>) as ReactComponent;
  }

  /**
   * Register an extension
   */
  registerExtension(name: string, extension: unknown): void {
    this.extensions.set(name, extension);
    this.events.emit('extension:registered', { name, extension });
  }

  /**
   * Add global middleware
   */
  addMiddleware(middleware: IComponentMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Get all registered components with filtering
   */
  getAll(filter?: {
    category?: string;
    tag?: string;
    name?: RegExp;
  }): Map<string, IComponentDefinition> {
    if (!filter) {
      return new Map(this.components);
    }

    const filtered = new Map<string, IComponentDefinition>();

    this.components.forEach((definition, name) => {
      let include = true;

      if (filter.category && definition.metadata?.category !== filter.category) {
        include = false;
      }

      if (filter.tag && !definition.metadata?.tags?.includes(filter.tag)) {
        include = false;
      }

      if (filter.name && !filter.name.test(name)) {
        include = false;
      }

      if (include) {
        filtered.set(name, definition);
      }
    });

    return filtered;
  }

  /**
   * Check if a component is registered
   */
  has(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Unregister a component
   */
  unregister(name: string): boolean {
    if (this.components.has(name)) {
      this.events.emit('component:unregistering', { name });
      const result = this.components.delete(name);
      this.events.emit('component:unregistered', { name });
      this.notifySubscribers();
      return result;
    }
    return false;
  }

  /**
   * Clear all registered components
   */
  clear(): void {
    this.events.emit('registry:clearing');
    this.components.clear();
    this.events.emit('registry:cleared');
    this.notifySubscribers();
  }

  /**
   * Get list of registered component names
   */
  getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get component statistics
   */
  getStats(): {
    totalComponents: number;
    categoryCounts: Record<string, number>;
    tagCounts: Record<string, number>;
  } {
    const stats = {
      totalComponents: this.components.size,
      categoryCounts: {} as Record<string, number>,
      tagCounts: {} as Record<string, number>,
    };

    this.components.forEach(definition => {
      // Count categories
      const category = definition.metadata?.category || 'uncategorized';
      stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;

      // Count tags
      if (definition.metadata?.tags) {
        for (const tag of definition.metadata.tags) {
          stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
        }
      }
    });

    return stats;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(listener => listener());
  }

  /**
   * Add event listener
   */
  on(event: string, callback: ComponentCallback, priority?: number): void {
    this.events.on(event, callback, priority);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: ComponentCallback): void {
    this.events.off(event, callback);
  }

  /**
   * Mount a component to a DOM container for Blade template integration.
   */
  mount(componentName: string, containerId: string, props: Record<string, unknown> = {}): void {
    try {
      universalReactRenderer.render({
        component: componentName,
        props,
        containerId,
        onDataChange: props.onDataChange as ((data: unknown) => void) | undefined,
        onError: error => {
          console.error(`Error mounting component ${componentName}:`, error);
        },
      });
    } catch (error) {
      console.error(`Failed to mount component ${componentName}:`, error);
    }
  }

  /**
   * Unmount a component from a DOM container
   */
  unmount(containerId: string): void {
    try {
      universalReactRenderer.unmount(containerId);
    } catch (error) {
      console.error(`Failed to unmount component:`, error);
    }
  }

  /**
   * Create hook manager for component context
   */
  private createHookManager(): IHookManager {
    return {
      addHook: (event: string, callback: ComponentCallback, priority?: number) => {
        this.events.on(event, callback, priority);
      },
      removeHook: (event: string, callback: ComponentCallback) => {
        this.events.off(event, callback);
      },
      executeHooks: (event: string, data?: unknown) => {
        return this.events.emit(event, data);
      },
    };
  }
}

// Global singleton instance
export const componentRegistry = new ReactComponentRegistry();

// Helper function to register multiple components at once
export function registerComponents(definitions: IComponentDefinition[]): void {
  definitions.forEach(definition => {
    componentRegistry.register(definition);
  });
}

// Extension helper
export function createExtension(name: string, setup: (registry: ReactComponentRegistry) => void) {
  return {
    name,
    install: () => setup(componentRegistry),
  };
}

// Export the registry class for creating custom instances
export { ReactComponentRegistry };
