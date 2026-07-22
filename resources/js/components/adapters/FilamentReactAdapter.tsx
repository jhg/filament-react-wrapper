import { universalReactRenderer } from '../UniversalReactRenderer';

type Cleanup = () => void;
type LivewireWire = {
  call?: (method: string, ...args: unknown[]) => unknown;
  set?: (path: string, value: unknown) => unknown;
  get?: (path: string) => unknown;
  $call?: (method: string, ...args: unknown[]) => unknown;
  $set?: (path: string, value: unknown) => unknown;
  $watch?: (path: string, callback: (value: unknown) => void) => (() => void) | void;
  $wire?: LivewireWire;
};

/**
 * Mounts React fields/widgets and owns the small Livewire bridge needed by
 * Filament. Keeping this here means it also works for DOM that Livewire adds
 * after the initial page load (modals, repeaters, wizards and slideovers).
 */
export class FilamentReactAdapter {
  static scanTimeout: number | null = null;
  static mutationObserver: MutationObserver | null = null;
  private static containerCleanups = new Map<string, Cleanup>();
  private static lifecycleListenersRegistered = false;
  private static livewireHooksRegistered = false;

  static initializeComponents(): void {
    const start = () => {
      this.scanAndRenderComponents();
      this.setupMutationObserver();
      this.registerLifecycleListeners();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  private static scanAndRenderComponents(): void {
    const containers = document.querySelectorAll<HTMLElement>(
      '[data-react-component]:not([data-react-rendered])'
    );

    const processContainers = (startIndex: number, batchSize: number) => {
      const endIndex = Math.min(startIndex + batchSize, containers.length);

      for (let i = startIndex; i < endIndex; i++) {
        const container = containers.item(i);
        if (container) this.renderComponent(container);
      }

      if (endIndex < containers.length) {
        window.setTimeout(() => processContainers(endIndex, batchSize), 0);
      }
    };

    processContainers(0, 5);
  }

  private static renderComponent(element: HTMLElement): void {
    const componentName = element.dataset.reactComponent;
    const propsData = element.dataset.reactProps;
    const statePath = element.dataset.reactStatePath;

    if (!componentName || !element.isConnected) {
      if (element.dataset.reactComponent) {
        console.warn('React component container is missing a component name:', element);
      }
      return;
    }

    if (!element.id) {
      element.id = `react-${componentName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    element.setAttribute('data-react-rendered', 'true');

    let props: Record<string, unknown> = {};
    if (propsData) {
      try {
        props = JSON.parse(propsData) as Record<string, unknown>;
      } catch (error) {
        console.warn(`Invalid JSON in data-react-props for component "${componentName}":`, error);
      }
    }

    window.setTimeout(() => {
      if (!element.isConnected) return;

      try {
        universalReactRenderer.render({
          component: componentName,
          props,
          containerId: element.id,
          statePath,
          onDataChange: data => {
            if (statePath && element.dataset.reactReactive !== 'false') {
              this.setLivewireState(element, statePath, data);
            }

            element.dispatchEvent(
              new CustomEvent('react-data-changed', {
                detail: { data, statePath, property: statePath, fieldName: statePath, value: data },
                bubbles: true,
              })
            );
          },
          onMounted: () => {
            this.removeLoadingIndicator(element);
            this.setupLivewireBridge(element, statePath);
            this.setupWidgetPolling(element);
            element.dispatchEvent(
              new CustomEvent('react-loaded', {
                detail: { componentName, containerId: element.id },
                bubbles: true,
              })
            );
          },
          onError: error => {
            console.error(`Error in Filament React component "${componentName}":`, error);
            element.removeAttribute('data-react-rendered');
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
        element.removeAttribute('data-react-rendered');
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
  }

  private static setupMutationObserver(): void {
    if (!document.body) return;

    this.mutationObserver?.disconnect();
    this.mutationObserver = new MutationObserver(mutations => {
      let hasNewComponents = false;

      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as HTMLElement;
          const removedContainers = [
            ...(element.matches('[data-react-component]') ? [element] : []),
            ...Array.from(element.querySelectorAll<HTMLElement>('[data-react-component]')),
          ];
          removedContainers.forEach(container => this.cleanupContainer(container));
        });

        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as Element;
          hasNewComponents =
            hasNewComponents ||
            element.hasAttribute('data-react-component') ||
            element.querySelector('[data-react-component]') !== null;
        });
      });

      if (hasNewComponents) {
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        this.scanTimeout = window.setTimeout(() => {
          this.scanAndRenderComponents();
          this.scanTimeout = null;
        }, 50);
      }
    });

    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  private static registerLifecycleListeners(): void {
    if (this.lifecycleListenersRegistered || typeof window === 'undefined') return;
    this.lifecycleListenersRegistered = true;

    document.addEventListener('livewire:navigated', () => this.initializeComponents());
    document.addEventListener('livewire:init', () => this.registerLivewireHooks(), { once: true });
    this.registerLivewireHooks();
    window.addEventListener('widget-refreshed', event => {
      const detail = (event as CustomEvent).detail ?? {};
      const containerId = detail.containerId;
      if (!containerId || !universalReactRenderer.hasActiveComponent(containerId)) return;

      universalReactRenderer.updateProps(containerId, { data: detail.data });
      document
        .getElementById(containerId)
        ?.dispatchEvent(new CustomEvent('widget-data-updated', { detail: detail.data }));
    });
  }

  private static registerLivewireHooks(): void {
    const livewire = window.Livewire;
    if (this.livewireHooksRegistered || !livewire?.hook) return;

    this.livewireHooksRegistered = true;
    livewire.hook('morphed', () => {
      this.scanAndRenderComponents();
    });
  }

  private static getLivewireComponent(element: HTMLElement): LivewireWire | undefined {
    const explicitId = element.dataset.livewireComponentId;
    let current: Element | null = element;
    let ancestorId = explicitId;

    while (!ancestorId && current) {
      ancestorId = current.getAttribute('wire:id') ?? undefined;
      current = current.parentElement;
    }

    return ancestorId ? window.Livewire?.find(ancestorId) : undefined;
  }

  private static getWireProxy(component: LivewireWire): LivewireWire {
    return component.$wire ?? component;
  }

  private static setLivewireState(element: HTMLElement, statePath: string, value: unknown): void {
    const component = this.getLivewireComponent(element);
    const wire = component && this.getWireProxy(component);
    const setter = wire?.$set ?? wire?.set;

    if (setter) {
      void Promise.resolve(setter.call(wire, statePath, value)).catch(error => {
        console.error(`Unable to update Livewire state at "${statePath}":`, error);
      });
    }
  }

  private static setupLivewireBridge(element: HTMLElement, statePath?: string): void {
    this.containerCleanups.get(element.id)?.();
    const cleanups: Cleanup[] = [];
    const component = statePath ? this.getLivewireComponent(element) : undefined;
    const wire = component && this.getWireProxy(component);

    if (wire && statePath && wire.$watch) {
      const cleanup = wire.$watch(statePath, value => {
        universalReactRenderer.updateProps(element.id, { value });
      });
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    }

    this.containerCleanups.set(element.id, () => {
      cleanups.forEach(cleanup => cleanup());
      this.containerCleanups.delete(element.id);
    });
  }

  private static setupWidgetPolling(element: HTMLElement): void {
    if (element.dataset.polling !== 'true') return;

    const rawInterval = element.dataset.pollingInterval ?? '5s';
    const amount = Number.parseInt(rawInterval, 10);
    const interval = Number.isFinite(amount)
      ? rawInterval.endsWith('s')
        ? amount * 1000
        : amount
      : 5000;
    const timer = window.setInterval(
      () => {
        const component = this.getLivewireComponent(element);
        const wire = component && this.getWireProxy(component);
        const call = wire?.$call ?? wire?.call;
        if (call) void Promise.resolve(call.call(wire, 'refresh')).catch(console.error);
        element.dispatchEvent(new CustomEvent('widget-poll', { detail: { interval } }));
      },
      Math.max(interval, 250)
    );

    const previousCleanup = this.containerCleanups.get(element.id);
    this.containerCleanups.set(element.id, () => {
      previousCleanup?.();
      window.clearInterval(timer);
    });
  }

  private static removeLoadingIndicator(element: HTMLElement): void {
    element.querySelector('.react-field-loading, .react-widget-loading')?.remove();
  }

  private static cleanupContainer(element: HTMLElement): void {
    if (!element.id) return;
    this.containerCleanups.get(element.id)?.();
    if (universalReactRenderer.hasActiveComponent(element.id)) {
      universalReactRenderer.unmount(element.id);
    }
    element.dispatchEvent(new CustomEvent('react-unmount', { bubbles: true }));
  }

  static cleanup(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    if (this.scanTimeout) clearTimeout(this.scanTimeout);
    this.scanTimeout = null;
    document.querySelectorAll<HTMLElement>('[data-react-component]').forEach(element => {
      this.cleanupContainer(element);
    });
  }

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
}

FilamentReactAdapter.initializeComponents();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => FilamentReactAdapter.cleanup());
}
