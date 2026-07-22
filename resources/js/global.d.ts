// Global window interface extensions
/// <reference types="node" />

// Forward declarations
interface GlobalStateManagerInterface {
  setState(path: string, value: unknown): void;
  getState<T = unknown>(path: string): T | undefined;
  subscribe(path: string, callback: (value: unknown) => void): () => void;
  reset(): void;
}

declare global {
  interface LivewireComponent {
    call(method: string, ...args: unknown[]): unknown;
    set(path: string, value: unknown): unknown;
    get(path: string): unknown;
  }

  interface LivewireRuntime {
    find(id: string): LivewireComponent | undefined;
  }
  interface Window {
    // Namespaced globals for better organization
    FilamentReact?: {
      ReactWrapper?: Record<string, unknown>;
      registerComponent?: unknown;
      getComponent?: unknown;
      listComponents?: unknown;
      mountIsland?: unknown;
      autoMountIslands?: unknown;
      createComponent?: unknown;
      registerComponents?: unknown;
      WorkflowCanvas?: unknown;
    };

    // Legacy compatibility globals
    ReactComponentRegistry?: unknown;
    ReactWrapper?: Record<string, unknown>;
    ReactWrapperConfig?: unknown;
    universalReactRenderer?: unknown;
    Livewire?: LivewireRuntime;
    FilamentBridge?: unknown;
    $filament?: unknown;
    WorkflowCanvas?: unknown;
    workflowDataSync?: (statePath: string, data: unknown) => void;
    __REACT_WRAPPER_DEV_TOOLS__?: unknown;
    globalStateManager?: GlobalStateManagerInterface;
    statePersistenceService?: unknown;
    requestIdleCallback?: (
      callback: (deadline: IdleDeadline) => void,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  }

  // Performance API
  declare const performance: {
    mark(name: string): void;
    measure(name: string, startMark?: string, endMark?: string): void;
    now(): number;
  };

  // Basic DOM types
  interface Element {
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    remove(): void;
  }

  interface Node {
    nodeType: number;
  }

  type NodeListOf<T> = ArrayLike<T> & {
    forEach(callback: (value: T, index: number, array: NodeListOf<T>) => void): void;
  };

  // DOM Observer APIs
  interface MutationRecord {
    type: string;
    target: Node;
    addedNodes: NodeListOf<Node>;
    removedNodes: NodeListOf<Node>;
  }

  interface MutationObserverInit {
    childList?: boolean;
    attributes?: boolean;
    subtree?: boolean;
  }

  interface MutationCallback {
    (mutations: MutationRecord[], observer: MutationObserver): void;
  }

  declare const MutationObserver: {
    new (callback: MutationCallback): MutationObserver;
  };

  interface MutationObserver {
    observe(target: Node, options?: MutationObserverInit): void;
    disconnect(): void;
    takeRecords(): MutationRecord[];
  }

  // Intersection Observer
  interface IntersectionObserverEntry {
    isIntersecting: boolean;
    target: Element;
  }

  interface IntersectionObserverInit {
    rootMargin?: string;
    threshold?: number | number[];
  }

  interface IntersectionObserverCallback {
    (entries: IntersectionObserverEntry[], observer: IntersectionObserver): void;
  }

  declare const IntersectionObserver: {
    new (
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ): IntersectionObserver;
  };

  interface IntersectionObserver {
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
  }

  // Performance Observer
  interface PerformanceObserverEntryList {
    getEntries(): PerformanceEntry[];
  }

  interface PerformanceEntry {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }

  interface PerformanceObserverInit {
    entryTypes: string[];
  }

  interface PerformanceObserverCallback {
    (list: PerformanceObserverEntryList, observer: PerformanceObserver): void;
  }

  declare const PerformanceObserver: {
    new (callback: PerformanceObserverCallback): PerformanceObserver;
  };

  interface PerformanceObserver {
    observe(options: PerformanceObserverInit): void;
    disconnect(): void;
  }

  // Idle Callback API
  interface IdleDeadline {
    readonly didTimeout: boolean;
    timeRemaining(): number;
  }

  interface IdleRequestOptions {
    timeout?: number;
  }

  // NodeJS types for browser context
  declare const process: {
    env?: {
      NODE_ENV?: string;
      [key: string]: string | undefined;
    };
  };
}

export {};
