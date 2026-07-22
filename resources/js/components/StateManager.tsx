import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  getNestedValue,
  isStateRecord,
  notifySubscribers as notifyStateSubscribers,
  setNestedValue,
  type StateSubscribers,
} from '../utils/state';

// Forward declaration of GlobalStateManager interface for use in Window interface
interface GlobalStateManagerInterface {
  setState(path: string, value: unknown): void;
  getState<T = unknown>(path: string): T | undefined;
  subscribe(path: string, callback: (value: unknown) => void): () => void;
  reset(): void;
}

// Extend Window interface for global properties
declare global {
  interface Window {
    workflowDataSync?: (statePath: string, data: unknown) => void;
    globalStateManager?: GlobalStateManagerInterface;
  }
}

// State management types
export interface StateManagerState {
  [key: string]: unknown;
}

export interface StateAction {
  type: 'SET_STATE' | 'UPDATE_STATE' | 'RESET_STATE' | 'BATCH_UPDATE';
  payload: unknown;
  path?: string;
}

export interface StateManagerContextType {
  state: StateManagerState;
  setState: (path: string, value: unknown) => void;
  updateState: (path: string, updater: (current: unknown) => unknown) => void;
  getState: (path: string) => unknown;
  resetState: () => void;
  batchUpdate: (updates: Array<{ path: string; value: unknown }>) => void;
  subscribe: (path: string, callback: (value: unknown) => void) => () => void;
}

// State reducer function
function stateReducer(state: StateManagerState, action: StateAction): StateManagerState {
  switch (action.type) {
    case 'SET_STATE': {
      if (!action.path) return state;
      return setNestedValue(state, action.path, action.payload);
    }
    case 'UPDATE_STATE': {
      if (!action.path) return state;
      const currentValue = getNestedValue(state, action.path);
      const newValue =
        typeof action.payload === 'function' ? action.payload(currentValue) : currentValue;
      return setNestedValue(state, action.path, newValue);
    }
    case 'BATCH_UPDATE': {
      if (!Array.isArray(action.payload) || action.payload.length === 0) return state;

      let newState = { ...state };
      action.payload.forEach(({ path, value }) => {
        if (path) {
          newState = setNestedValue(newState, path, value);
        }
      });
      return newState;
    }
    case 'RESET_STATE':
      return isStateRecord(action.payload) ? action.payload : {};
    default:
      return state;
  }
}

// Create context for state manager
export const StateManagerContext = createContext<StateManagerContextType | null>(null);

// Default context value for testing environments
StateManagerContext.displayName = 'StateManagerContext';

// State Manager Provider
export interface StateManagerProviderProps {
  children: ReactNode;
  initialState?: StateManagerState;
  onStateChange?: (state: StateManagerState) => void;
  syncPath?: string;
}

const StateManagerProviderComponent: React.FC<StateManagerProviderProps> = React.memo(
  ({ children, initialState = {}, onStateChange, syncPath }) => {
    const [state, dispatch] = useReducer(stateReducer, initialState);
    const subscribersRef = React.useRef<StateSubscribers>(new Map());

    // Memoize state to prevent unnecessary re-renders
    const memoizedState = React.useMemo(() => state, [state]);

    // Notify external systems of state changes - FIXED WITH DEBOUNCING
    const onStateChangeRef = React.useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (onStateChangeRef.current && typeof onStateChangeRef.current === 'function') {
          try {
            onStateChangeRef.current(memoizedState);
          } catch (error) {
            console.error('Error in onStateChange callback:', error);
          }
        }

        if (syncPath && typeof window !== 'undefined' && window.workflowDataSync) {
          try {
            window.workflowDataSync(syncPath, memoizedState);
          } catch (error) {
            console.error('Error in workflowDataSync:', error);
          }
        }
      }, 100); // Debounce to prevent rapid fire updates

      return () => clearTimeout(timeoutId);
    }, [memoizedState, syncPath]); // Removed onStateChange dependency

    // Notify subscribers with memoized callback - FIXED WITH ERROR HANDLING
    const notifySubscribers = React.useCallback(() => {
      subscribersRef.current.forEach((callbacks, path) => {
        if (path && callbacks.size > 0) {
          notifyStateSubscribers(
            subscribersRef.current,
            memoizedState,
            path,
            getNestedValue(memoizedState, path),
            (error, subscriberPath) => {
              console.error(`Error in subscriber callback for path ${subscriberPath}:`, error);
            },
            false
          );
        }
      });
    }, [memoizedState]);

    // Use effect to trigger the memoized notification callback - FIXED WITH DEBOUNCING
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        notifySubscribers();
      }, 50); // Small debounce for subscriber notifications

      return () => clearTimeout(timeoutId);
    }, [notifySubscribers]);

    const setState = useCallback((path: string, value: unknown) => {
      dispatch({ type: 'SET_STATE', path, payload: value });
    }, []);

    const updateState = useCallback((path: string, updater: (current: unknown) => unknown) => {
      dispatch({ type: 'UPDATE_STATE', path, payload: updater });
    }, []);

    const getState = useCallback(
      (path: string) => {
        return getNestedValue(memoizedState, path);
      },
      [memoizedState]
    );

    const resetState = useCallback((newState?: StateManagerState) => {
      dispatch({ type: 'RESET_STATE', payload: newState || {} });
    }, []);

    const batchUpdate = useCallback((updates: Array<{ path: string; value: unknown }>) => {
      dispatch({ type: 'BATCH_UPDATE', payload: updates });
    }, []);

    const subscribe = useCallback(
      (path: string, callback: (value: unknown) => void) => {
        if (!path || typeof callback !== 'function') {
          return () => {}; // Return no-op for invalid params
        }

        if (!subscribersRef.current.has(path)) {
          subscribersRef.current.set(path, new Set());
        }

        const subscribers = subscribersRef.current.get(path);
        if (subscribers) {
          subscribers.add(callback);

          // Immediately notify with current value
          try {
            const currentValue = getNestedValue(memoizedState, path);
            callback(currentValue);
          } catch (error) {
            console.error(`Error in immediate callback for path ${path}:`, error);
          }
        }

        // Return unsubscribe function
        return () => {
          const pathSubscribers = subscribersRef.current.get(path);
          if (pathSubscribers) {
            pathSubscribers.delete(callback);
            if (pathSubscribers.size === 0) {
              subscribersRef.current.delete(path);
            }
          }
        };
      },
      [memoizedState]
    );

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = React.useMemo(
      (): StateManagerContextType => ({
        state: memoizedState,
        setState,
        updateState,
        getState,
        resetState,
        batchUpdate,
        subscribe,
      }),
      [memoizedState, setState, updateState, getState, resetState, batchUpdate, subscribe]
    );

    return (
      <StateManagerContext.Provider value={contextValue}>{children}</StateManagerContext.Provider>
    );
  }
);

StateManagerProviderComponent.displayName = 'StateManagerProvider';

export const StateManagerProvider = StateManagerProviderComponent;

// Hook to use state manager
export const useStateManager = (): StateManagerContextType => {
  const context = useContext(StateManagerContext);
  if (!context) {
    throw new Error('useStateManager must be used within a StateManagerProvider');
  }
  return context;
};

// Hook for specific state path - FIXED WITH PROPER SUBSCRIPTIONS
export const useStatePath = <T = unknown,>(
  path: string,
  defaultValue?: T
): [T, (value: T | ((prev: T) => T)) => void] => {
  const { getState, setState, subscribe } = useStateManager();

  // Initialize local state with value from state manager or default
  const [localState, setLocalState] = React.useState<T>(() => {
    const stateValue = getState(path) as T;
    return stateValue !== undefined ? stateValue : (defaultValue ?? ({} as T));
  });

  // Subscribe to changes in the state path with error handling
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribe(path, (value: unknown) => {
      if (isMounted) {
        const newValue = value !== undefined ? (value as T) : (defaultValue ?? ({} as T));
        setLocalState(newValue);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [path, defaultValue, subscribe]);

  // Create a memoized setter function
  const setter = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        if (typeof value === 'function') {
          const updater = value as (prev: T) => T;
          const currentValue = getState(path);
          const newValue = updater(
            currentValue !== undefined ? (currentValue as T) : (defaultValue ?? ({} as T))
          );
          setState(path, newValue);
        } else {
          setState(path, value);
        }
      } catch (error) {
        console.error(`Error setting state for path ${path}:`, error);
      }
    },
    [path, setState, getState, defaultValue]
  );

  return [localState, setter];
};

// HOC for components that need state management
export function withStateManager<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    initialState?: StateManagerState;
    syncPath?: string;
    onStateChange?: (state: StateManagerState) => void;
  }
): React.FC<P> {
  // Use displayName from the wrapped component or fallback
  const displayName = Component.displayName || Component.name || 'Component';

  // Create the wrapped component
  const WrappedComponent: React.FC<P> = (props: P) => {
    return (
      <StateManagerProvider
        initialState={options?.initialState}
        syncPath={options?.syncPath}
        onStateChange={options?.onStateChange}
      >
        <Component {...props} />
      </StateManagerProvider>
    );
  };

  // Set displayName for better debugging
  WrappedComponent.displayName = `withStateManager(${displayName})`;

  return WrappedComponent;
}

// Global state manager for cross-component communication
export class GlobalStateManager implements GlobalStateManagerInterface {
  private _state: StateManagerState = {};
  public readonly subscribers: Map<string, Set<(value: unknown) => void>> = new Map();
  private _notifyingPaths?: Set<string>; // Track paths currently being notified to prevent cycles

  public get state(): StateManagerState {
    return this._state;
  }

  /**
   * Sets a value at the specified path in the state
   * @param path Dot-notation path to set value at
   * @param value Value to set
   */
  setState(path: string, value: unknown): void {
    if (!path) return;

    const newState = setNestedValue(this._state, path, value);
    this._state = newState;
    this.notifySubscribers(path, value);
  }

  /**
   * Gets a value from the specified path in the state
   * @param path Dot-notation path to get value from
   * @returns The value at the specified path or undefined
   */
  getState<T = unknown>(path: string): T | undefined {
    return getNestedValue<T>(this._state, path);
  }

  /**
   * Subscribes to changes at the specified path
   * @param path Dot-notation path to subscribe to
   * @param callback Callback invoked when the value changes
   * @returns Unsubscribe function
   */
  subscribe(path: string, callback: (value: unknown) => void): () => void {
    if (!path || typeof callback !== 'function') {
      return () => {}; // Return no-op if invalid params
    }

    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    const subscribers = this.subscribers.get(path);
    if (subscribers) {
      subscribers.add(callback);

      // Immediately notify with current value
      const currentValue = this.getState(path);
      callback(currentValue);
    }

    // Return unsubscribe function
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

  /**
   * Notifies subscribers of changes at a specific path and its parent paths
   * @param path Path that was changed
   * @param value New value at the path
   */
  public notifySubscribers(path: string, value: unknown): void {
    if (!path) return;

    // Prevent circular notifications by tracking currently notifying paths
    if (!this._notifyingPaths) {
      this._notifyingPaths = new Set();
    }

    if (this._notifyingPaths.has(path)) {
      console.warn(`Circular notification detected for path: ${path}`);
      return;
    }

    this._notifyingPaths.add(path);

    try {
      notifyStateSubscribers(
        this.subscribers,
        this._state,
        path,
        value,
        (error, subscriberPath) => {
          console.error(`Error in subscriber callback for path ${subscriberPath}:`, error);
        }
      );
    } finally {
      this._notifyingPaths.delete(path);
    }
  }

  /**
   * Update state with a function
   */
  updateState(path: string, updater: (current: unknown) => unknown): void {
    const currentValue = this.getState(path);
    const newValue = updater(currentValue);
    this.setState(path, newValue);
  }

  /**
   * Reset state with optional new state
   */
  resetState(newState?: StateManagerState): void {
    this._state = newState || {};
    // Notify all subscribers of the reset
    this.subscribers.forEach((_, path) => {
      const value = this.getState(path);
      notifyStateSubscribers(
        this.subscribers,
        this._state,
        path,
        value,
        (error, subscriberPath) => {
          console.error(`Error in reset callback for path ${subscriberPath}:`, error);
        },
        false
      );
    });
  }

  /**
   * Batch update multiple paths
   */
  batchUpdate(updates: Array<{ path: string; value: unknown }>): void {
    // Update all values first
    updates.forEach(({ path, value }) => {
      if (path) {
        const newState = setNestedValue(this._state, path, value);
        this._state = newState;
      }
    });

    // Then notify subscribers for all affected paths
    const affectedPaths = new Set<string>();
    updates.forEach(({ path }) => {
      if (path) {
        affectedPaths.add(path);
        // Also add parent paths
        const pathParts = path.split('.');
        for (let i = 1; i < pathParts.length; i++) {
          affectedPaths.add(pathParts.slice(0, i).join('.'));
        }
      }
    });

    // Notify all affected paths
    affectedPaths.forEach(path => {
      const value = this.getState(path);
      this.notifySubscribers(path, value);
    });
  }

  /**
   * Resets the state and clears all subscribers (legacy method)
   */
  reset(): void {
    this.resetState();
    this.subscribers.clear();
  }
}

export const globalStateManager = new GlobalStateManager();

// Make global state manager available on window for debugging
if (typeof window !== 'undefined') {
  window.globalStateManager = globalStateManager;
}
