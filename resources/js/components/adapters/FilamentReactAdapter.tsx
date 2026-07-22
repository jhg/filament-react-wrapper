import { universalReactRenderer } from '../UniversalReactRenderer';

// Filament-specific adapter for React components
export class FilamentReactAdapter {
  static scanTimeout: number | null = null;
  static mutationObserver: MutationObserver | null = null;
  /**
   * Initialize React components in Filament context
   */
  static initializeComponents(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.scanAndRenderComponents();
      });
    } else {
      this.scanAndRenderComponents();
    }

    // Watch for dynamically added components (for Livewire updates)
    this.setupMutationObserver();
  }

  /**
   * Scan DOM for React component containers and render them
   */
  private static scanAndRenderComponents(): void {
    const containers = document.querySelectorAll(
      '[data-react-component]:not([data-react-rendered])'
    );

    // Process containers in batches to avoid blocking the main thread
    const processContainers = (
      containers: NodeListOf<Element>,
      startIndex: number,
      batchSize: number
    ) => {
      const endIndex = Math.min(startIndex + batchSize, containers.length);

      for (let i = startIndex; i < endIndex; i++) {
        this.renderComponent(containers[i] as HTMLElement);
      }

      // Process next batch if there are more containers
      if (endIndex < containers.length) {
        setTimeout(() => {
          processContainers(containers, endIndex, batchSize);
        }, 0); // Use setTimeout to yield to the browser
      }
    };

    // Start processing in batches of 5
    processContainers(containers, 0, 5);
  }

  /**
   * Render a single React component
   */
  private static renderComponent(element: HTMLElement): void {
    const componentName = element.dataset.reactComponent;
    const propsData = element.dataset.reactProps;
    const statePath = element.dataset.reactStatePath;

    if (!componentName) {
      console.warn('React component container missing component name:', element);
      return;
    }

    // Generate unique ID if not present
    if (!element.id) {
      element.id = `react-${componentName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Mark as processed to avoid duplicate rendering
    element.setAttribute('data-react-rendered', 'true');

    try {
      let props = {};
      if (propsData) {
        try {
          props = JSON.parse(propsData);
        } catch (parseError) {
          console.warn(
            `Invalid JSON in data-react-props for component "${componentName}":`,
            parseError
          );
          props = {};
        }
      }

      // Use a small timeout to stagger rendering and improve perceived performance
      setTimeout(() => {
        try {
          // Render the component using the universal renderer
          universalReactRenderer.render({
            component: componentName,
            props: props,
            containerId: element.id,
            statePath: statePath,
            onDataChange: data => {
              // Emit custom event for Filament/Livewire integration
              if (statePath) {
                element.dispatchEvent(
                  new CustomEvent('react-data-changed', {
                    detail: {
                      data,
                      statePath,
                      property: statePath,
                      fieldName: statePath,
                      value: data,
                    },
                    bubbles: true,
                  })
                );
              }
            },
            onError: error => {
              console.error(`Error in Filament React component "${componentName}":`, error);

              // Remove the rendered flag so it can be retried
              element.removeAttribute('data-react-rendered');

              // Emit error event
              element.dispatchEvent(
                new CustomEvent('react-error', {
                  detail: {
                    error: error instanceof Error ? error.message : String(error),
                    componentName,
                  },
                  bubbles: true,
                })
              );
            },
          });
        } catch (error) {
          // This catch block handles errors that occur before the component is rendered
          // For example, errors in parsing props or finding the component
          console.error(`Error setting up React component "${componentName}":`, error);

          // Remove the rendered flag so it can be retried
          element.removeAttribute('data-react-rendered');

          // Emit error event
          element.dispatchEvent(
            new CustomEvent('react-error', {
              detail: {
                error: error instanceof Error ? error.message : String(error),
                componentName,
              },
              bubbles: true,
            })
          );
        }
      }, 0);
    } catch (error) {
      console.error('Error parsing React component props:', error, element);
      // Remove the rendered flag so it can be retried
      element.removeAttribute('data-react-rendered');
    }
  }

  /**
   * Setup mutation observer to handle dynamically added components
   */
  private static setupMutationObserver(): void {
    // Disconnect existing observer first to prevent memory leaks
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver(mutations => {
      let hasNewComponents = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if the node itself is a React component container
            if (element.hasAttribute('data-react-component')) {
              hasNewComponents = true;
            }

            // Check for React component containers within the added node
            if (element.querySelectorAll('[data-react-component]').length > 0) {
              hasNewComponents = true;
            }
          }
        });
      });

      if (hasNewComponents) {
        // Clear existing timeout
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout);
        }

        // Debounce to avoid excessive re-rendering
        this.scanTimeout = window.setTimeout(() => {
          this.scanAndRenderComponents();
          this.scanTimeout = null;
        }, 100);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  static cleanup(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  /**
   * Create a Filament form field wrapper for React components
   */
  static createFormField(options: {
    component: string;
    statePath: string;
    props?: Record<string, unknown>;
    containerId?: string;
  }): HTMLElement {
    const { component, statePath, props = {}, containerId = `react-${Date.now()}` } = options;

    const container = document.createElement('div');
    container.id = containerId;
    container.dataset.reactComponent = component;
    container.dataset.reactStatePath = statePath;
    container.dataset.reactProps = JSON.stringify(props);
    container.className = 'react-component-container';

    return container;
  }

  /**
   * Handle Livewire component updates
   */
  static handleLivewireUpdate(event: CustomEvent): void {
    const { component, data, statePath } = event.detail;

    // Find containers for this component and update them
    const containers = document.querySelectorAll(
      `[data-react-component="${component}"][data-react-state-path="${statePath}"]`
    );

    containers.forEach(container => {
      const element = container as HTMLElement;
      if (element.id && universalReactRenderer.hasActiveComponent(element.id)) {
        universalReactRenderer.updateProps(element.id, data);
      }
    });
  }
}

// Auto-initialize when this module is loaded
FilamentReactAdapter.initializeComponents();

// Listen for Livewire events
if (typeof window !== 'undefined') {
  document.addEventListener('livewire:update', event => {
    FilamentReactAdapter.handleLivewireUpdate(event as CustomEvent);
  });

  // Re-scan after Livewire navigation
  document.addEventListener('livewire:navigated', () => {
    setTimeout(() => {
      FilamentReactAdapter.initializeComponents();
    }, 100);
  });

  // Cleanup on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    FilamentReactAdapter.cleanup();
  });
}
