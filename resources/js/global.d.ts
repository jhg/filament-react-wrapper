declare global {
  interface LivewireComponent {
    call?: (method: string, ...args: unknown[]) => unknown;
    set?: (path: string, value: unknown) => unknown;
    get?: (path: string) => unknown;
    $call?: (method: string, ...args: unknown[]) => unknown;
    $set?: (path: string, value: unknown) => unknown;
    $get?: (path: string) => unknown;
    $watch?: (path: string, callback: (value: unknown) => void) => (() => void) | void;
  }

  interface LivewireRuntime {
    find(id: string): LivewireComponent | undefined;
    hook?: (name: string, callback: (payload: unknown) => void) => void;
  }
  interface Window {
    FilamentReact?: {
      ReactWrapper?: Record<string, unknown>;
      registerComponent?: unknown;
      defineComponents?: unknown;
      registerLazyComponent?: unknown;
      getComponent?: unknown;
      listComponents?: unknown;
      mountIsland?: unknown;
      autoMountIslands?: unknown;
      createComponent?: unknown;
      registerComponents?: unknown;
      WorkflowCanvas?: unknown;
    };

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
    globalStateManager?: unknown;
    statePersistenceService?: unknown;
  }

  declare const process: {
    env?: {
      NODE_ENV?: string;
      [key: string]: string | undefined;
    };
  };
}

export {};
