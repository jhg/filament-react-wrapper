import React, { createContext, useContext, ReactNode } from 'react';
import {
  getNestedValue,
  isStateRecord,
  notifySubscribers,
  setNestedValue,
  StateRecord,
  StateSubscribers,
} from '../utils/state';

// Enhanced State Manager with multiple strategy support
export interface StateManagerConfig {
  strategy: 'context' | 'zustand';
  persistence: boolean;
  devtools: boolean;
  namespace?: string;
}

export interface StateManagerContextType {
  state: StateRecord;
  setState: (path: string, value: unknown) => void;
  getState: (path: string) => unknown;
  subscribe: (path: string, callback: (value: unknown) => void) => () => void;
  reset: () => void;
  batchUpdate: (updates: Array<{ path: string; value: unknown }>) => void;
}

// Context-based state manager (existing implementation)
class ContextStateManager {
  private state: StateRecord = {};
  private subscribers: StateSubscribers = new Map();
  private persistence: boolean;
  private namespace: string;

  constructor(config: StateManagerConfig) {
    this.persistence = config.persistence;
    this.namespace = config.namespace || 'filament-react-state';

    if (this.persistence) {
      this.loadPersistedState();
    }
  }

  setState(path: string, value: unknown): void {
    this.state = setNestedValue(this.state, path, value);

    if (this.persistence) {
      this.persistState();
    }

    notifySubscribers(this.subscribers, this.state, path, value);
  }

  getState(path: string): unknown {
    return getNestedValue(this.state, path);
  }

  subscribe(path: string, callback: (value: unknown) => void): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    this.subscribers.get(path)!.add(callback);

    callback(getNestedValue(this.state, path));

    return () => {
      const pathSubscribers = this.subscribers.get(path);
      if (pathSubscribers) {
        pathSubscribers.delete(callback);
        if (pathSubscribers.size === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }

  reset(): void {
    this.state = {};
    if (this.persistence) {
      localStorage.removeItem(this.namespace);
    }
    this.subscribers.clear();
  }

  batchUpdate(updates: Array<{ path: string; value: unknown }>): void {
    updates.forEach(({ path, value }) => {
      this.setState(path, value);
    });
  }

  private loadPersistedState(): void {
    try {
      const persisted = localStorage.getItem(this.namespace);
      if (persisted) {
        const parsed: unknown = JSON.parse(persisted);
        if (isStateRecord(parsed)) this.state = parsed;
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  private persistState(): void {
    try {
      localStorage.setItem(this.namespace, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }
}

// Zustand-based state manager
interface ZustandState {
  state: StateRecord;
  setState: (path: string, value: unknown) => void;
  getState: (path: string) => unknown;
  reset: () => void;
  batchUpdate: (updates: Array<{ path: string; value: unknown }>) => void;
}

interface ZustandStore {
  getState: () => ZustandState;
  subscribe: (listener: (state: ZustandState) => void) => () => void;
}

class ZustandStateManager {
  private store!: ZustandStore;
  private namespace: string;

  constructor(config: StateManagerConfig) {
    this.namespace = config.namespace || 'filament-react-state';

    this.initializeZustandStore(config);
  }

  private initializeZustandStore(config: StateManagerConfig): void {
    try {
      // Dynamic import to avoid breaking if Zustand is not installed
      const runtimeRequire = require as unknown as (moduleName: string) => Record<string, unknown>;
      const zustand = runtimeRequire('zustand');
      const middleware = runtimeRequire('zustand/middleware');
      const create = zustand.create as (
        creator: (set: SetState, get: GetState) => ZustandState
      ) => ZustandStore;
      const devtools = middleware.devtools as (
        creator: unknown,
        options: { name: string }
      ) => unknown;
      const persist = middleware.persist as (
        creator: unknown,
        options: { name: string }
      ) => unknown;

      type SetState = (
        updater: ((state: ZustandState) => ZustandState) | Partial<ZustandState>
      ) => void;
      type GetState = () => ZustandState;

      let storeCreator = (set: SetState, get: GetState): ZustandState => ({
        state: {},
        setState: (path: string, value: unknown) => {
          set((state: ZustandState) => {
            return { ...state, state: setNestedValue(state.state, path, value) };
          });
        },
        getState: (path: string) => {
          return getNestedValue(get().state, path);
        },
        reset: () => set({ state: {} }),
        batchUpdate: (updates: Array<{ path: string; value: unknown }>) => {
          updates.forEach(({ path, value }) => {
            get().setState(path, value);
          });
        },
      });

      if (config.persistence) {
        storeCreator = persist(storeCreator, {
          name: this.namespace,
        }) as (set: SetState, get: GetState) => ZustandState;
      }

      if (config.devtools) {
        storeCreator = devtools(storeCreator, {
          name: 'FilamentReactState',
        }) as (set: SetState, get: GetState) => ZustandState;
      }

      this.store = create(storeCreator);
    } catch (_error) {
      console.error('Failed to initialize Zustand store. Falling back to Context strategy.');
      throw _error;
    }
  }

  setState(path: string, value: unknown): void {
    this.store.getState().setState(path, value);
  }

  getState(path: string): unknown {
    return this.store.getState().getState(path);
  }

  subscribe(path: string, callback: (value: unknown) => void): () => void {
    return this.store.subscribe(() => {
      const value = this.getState(path);
      callback(value);
    });
  }

  reset(): void {
    this.store.getState().reset();
  }

  batchUpdate(updates: Array<{ path: string; value: unknown }>): void {
    this.store.getState().batchUpdate(updates);
  }
}

// State Manager Factory
export class StateManagerFactory {
  static create(config: StateManagerConfig): StateManagerContextType {
    let manager: ContextStateManager | ZustandStateManager;

    try {
      if (config.strategy === 'zustand') {
        manager = new ZustandStateManager(config);
      } else {
        manager = new ContextStateManager(config);
      }
    } catch {
      console.warn(
        'Failed to create state manager with strategy:',
        config.strategy,
        'Falling back to context strategy.'
      );
      manager = new ContextStateManager({ ...config, strategy: 'context' });
    }

    return {
      state: manager.getState('') as StateRecord,
      setState: manager.setState.bind(manager),
      getState: manager.getState.bind(manager),
      subscribe: manager.subscribe.bind(manager),
      reset: manager.reset.bind(manager),
      batchUpdate: manager.batchUpdate.bind(manager),
    };
  }
}

// Enhanced State Manager Context
const EnhancedStateContext = createContext<StateManagerContextType | undefined>(undefined);

export interface EnhancedStateProviderProps {
  children: ReactNode;
  config?: StateManagerConfig;
}

export const EnhancedStateProvider: React.FC<EnhancedStateProviderProps> = ({
  children,
  config = { strategy: 'context', persistence: true, devtools: true },
}) => {
  const stateManager = StateManagerFactory.create(config);

  return (
    <EnhancedStateContext.Provider value={stateManager}>{children}</EnhancedStateContext.Provider>
  );
};

// Enhanced Hooks
export const useEnhancedStateManager = (): StateManagerContextType => {
  const context = useContext(EnhancedStateContext);
  if (!context) {
    throw new Error('useEnhancedStateManager must be used within an EnhancedStateProvider');
  }
  return context;
};

export const useEnhancedStatePath = <T = unknown,>(
  path: string
): [T | undefined, (value: T) => void] => {
  const { getState, setState, subscribe } = useEnhancedStateManager();
  const [value, setValue] = React.useState<T | undefined>(getState(path) as T);

  React.useEffect(() => {
    const unsubscribe = subscribe(path, newValue => {
      setValue(newValue as T);
    });
    return unsubscribe;
  }, [path, subscribe]);

  const setterWithCallback = React.useCallback(
    (newValue: T) => {
      setState(path, newValue);
    },
    [path, setState]
  );

  return [value, setterWithCallback];
};

// Simple hook for Zustand-style usage
export const useFilamentState = <T = unknown,>(
  path: string,
  initialValue?: T
): [T, (value: T) => void] => {
  const [value, setValue] = useEnhancedStatePath<T>(path);

  return [value ?? (initialValue as T), setValue];
};
