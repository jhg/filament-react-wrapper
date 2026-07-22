import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { componentRegistry } from './ReactComponentRegistry';
import { setWindowGlobal } from '../utils/globals';

// Interface for component data and state synchronization
export interface ReactRendererProps {
  component: string;
  props?: Record<string, unknown>;
  statePath?: string;
  containerId: string;
  onDataChange?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ReactErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React component error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 rounded-md bg-red-50">
          <h3 className="text-red-800 font-medium">Component Error</h3>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Universal React renderer wrapper component
const UniversalReactWrapper: React.FC<{
  componentName: string;
  componentProps: Record<string, unknown>;
  onDataChange?: (data: unknown) => void;
  onError?: (error: Error) => void;
  statePath?: string;
}> = React.memo(
  ({ componentName, componentProps, onDataChange, onError }) => {
    // Use useMemo to cache the component definition lookup
    const componentDef = React.useMemo(() => {
      return componentRegistry.get(componentName);
    }, [componentName]);

    // Always call useMemo for Component to avoid conditional hooks
    const Component:
      | React.ComponentType<Record<string, unknown>>
      | React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>
      | null = React.useMemo(() => {
      if (!componentDef) return null;

      if (componentDef.isAsync) {
        // If isAsync is true, we assume componentDef.component is the function that returns a promise
        return React.lazy(
          componentDef.component as () => Promise<{
            default: React.ComponentType<Record<string, unknown>>;
          }>
        );
      } else {
        // Otherwise, it's a regular React component type
        return componentDef.component as React.ComponentType<Record<string, unknown>>;
      }
    }, [componentDef]);

    // Use useMemo to prevent unnecessary re-renders when props haven't changed
    const mergedProps = React.useMemo(() => {
      const props = {
        ...(componentDef?.defaultProps || {}),
        ...componentProps,
        onDataChange,
      } as Record<string, unknown>;

      // Fields expose a normal controlled React contract while retaining the
      // legacy initialData/onDataChange props for existing components.
      const isField =
        componentProps.isField === true || typeof componentProps.fieldName === 'string';
      if (isField) {
        props.value = Object.prototype.hasOwnProperty.call(componentProps, 'value')
          ? componentProps.value
          : componentProps.initialData;
        props.onChange = onDataChange ?? componentProps.onChange;
      }

      return props;
    }, [componentDef?.defaultProps, componentProps, onDataChange]);

    // Handle missing component after all hooks have been called
    if (!componentDef || !Component) {
      const error = new Error(`Component "${componentName}" not found in registry`);
      onError?.(error);
      return (
        <div className="p-4 border border-yellow-300 rounded-md bg-yellow-50">
          <p className="text-yellow-800">
            Component &quot;{componentName}&quot; not found. Available components:{' '}
            {componentRegistry.getComponentNames().join(', ') || 'None'}
          </p>
        </div>
      );
    }

    return (
      <ReactErrorBoundary onError={onError}>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component {...mergedProps} />
        </React.Suspense>
      </ReactErrorBoundary>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memoization
    // Only re-render if component name changes or if props have changed
    if (prevProps.componentName !== nextProps.componentName) {
      return false; // Different component, should re-render
    }

    // Deep compare props to prevent unnecessary re-renders
    try {
      // Quick reference check first
      if (prevProps.componentProps === nextProps.componentProps) {
        return true;
      }

      // Compare object keys for basic structure check
      const prevKeys = Object.keys(prevProps.componentProps || {});
      const nextKeys = Object.keys(nextProps.componentProps || {});

      if (prevKeys.length !== nextKeys.length) {
        return false;
      }

      // Only use JSON stringify for small objects (< 10 keys)
      if (prevKeys.length < 10) {
        return (
          JSON.stringify(prevProps.componentProps) === JSON.stringify(nextProps.componentProps)
        );
      }

      // For larger objects, do shallow comparison
      return prevKeys.every(key => prevProps.componentProps[key] === nextProps.componentProps[key]);
    } catch {
      // If comparison fails, fall back to reference equality
      return prevProps.componentProps === nextProps.componentProps;
    }
  }
);

// Universal React renderer class
export class UniversalReactRenderer {
  private roots: Map<string, Root> = new Map();
  private containers: Map<string, HTMLElement> = new Map();
  private metadata: Map<
    string,
    { component: string; props: Record<string, unknown>; statePath?: string }
  > = new Map();

  /**
   * Render a React component in the specified container
   */
  render({
    component,
    props = {},
    statePath,
    containerId,
    onDataChange,
    onError,
  }: ReactRendererProps): void {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container element with ID "${containerId}" not found`);
      }

      this.metadata.set(containerId, { component, props, statePath });
      container.dataset.reactComponent = component;
      if (statePath) container.dataset.reactStatePath = statePath;
      try {
        container.dataset.reactProps = JSON.stringify(props);
      } catch {
        // Function props are valid for direct JS mounts but cannot be mirrored
        // into a DOM data attribute. The in-memory metadata remains canonical.
      }

      // Check if root already exists
      let root = this.roots.get(containerId);

      if (!root) {
        // Create new root only if it doesn't exist
        root = createRoot(container);
        this.roots.set(containerId, root);
        this.containers.set(containerId, container);
      }

      // Enhanced data change handler with state path support (not using hooks here)
      const handleDataChange = (data: unknown) => {
        if (onDataChange) {
          onDataChange(data);
        }

        // Sync with Livewire if available and statePath is provided
        if (statePath && typeof window !== 'undefined' && window.workflowDataSync) {
          window.workflowDataSync(statePath, data);
        }
      };

      root.render(
        <UniversalReactWrapper
          componentName={component}
          componentProps={props}
          onDataChange={handleDataChange}
          onError={onError}
          statePath={statePath}
        />
      );
    } catch (error) {
      console.error('Error rendering React component:', error);
      onError?.(error as Error);
    }
  }

  /**
   * Update props for an already rendered component
   */
  updateProps(containerId: string, newProps: unknown): void {
    const root = this.roots.get(containerId);
    const container = this.containers.get(containerId);

    if (!root || !container) {
      console.warn(`No rendered component found for container "${containerId}"`);
      return;
    }

    // Re-render with updated props
    const metadata = this.metadata.get(containerId);
    if (!metadata) {
      console.warn(`No metadata found for rendered component "${containerId}"`);
      return;
    }

    const nextProps =
      typeof newProps === 'object' && newProps !== null && !Array.isArray(newProps)
        ? { ...metadata.props, ...(newProps as Record<string, unknown>) }
        : { ...metadata.props, value: newProps };

    this.render({
      component: metadata.component,
      props: nextProps,
      statePath: metadata.statePath,
      containerId,
    });
  }

  /**
   * Unmount a React component
   */
  unmount(containerId: string): void {
    const root = this.roots.get(containerId);
    if (root) {
      root.unmount();
      this.roots.delete(containerId);
      this.containers.delete(containerId);
      this.metadata.delete(containerId);
    }
  }

  /**
   * Check if a component is rendered in the specified container
   */
  isRendered(containerId: string): boolean {
    return this.roots.has(containerId);
  }

  /**
   * Unmount all rendered components
   */
  unmountAll(): void {
    for (const [containerId] of this.roots) {
      this.unmount(containerId);
    }
  }

  /**
   * Get list of active container IDs
   */
  getActiveContainers(): string[] {
    return Array.from(this.roots.keys());
  }

  /**
   * Check if a container has an active React component
   */
  hasActiveComponent(containerId: string): boolean {
    return this.roots.has(containerId);
  }
}

// Global singleton instance
export const universalReactRenderer = new UniversalReactRenderer();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    universalReactRenderer.unmountAll();
  });
}

// Make renderer available globally
if (typeof window !== 'undefined') {
  setWindowGlobal('universalReactRenderer', universalReactRenderer);
}
