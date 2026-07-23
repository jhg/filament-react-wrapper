// State persistence service for handling data sync between React and backend
export interface StatePersistenceConfig {
  key: string;
  /** Namespace used for the physical browser-storage key. */
  namespace?: string;
  storage?: 'localStorage' | 'sessionStorage' | 'none';
  syncWithLivewire?: boolean;
  livewirePath?: string;
  debounceMs?: number;
  transformer?: {
    serialize?: (data: unknown) => unknown;
    deserialize?: (data: unknown) => unknown;
  };
}

interface RegisteredPersistence {
  config: StatePersistenceConfig;
  references: number;
}

type PersistenceListener = (value: unknown) => void;

interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface BrowserStorageEvent extends Event {
  key: string | null;
  newValue: string | null;
}

export class StatePersistenceService {
  private configs: Map<string, RegisteredPersistence> = new Map();
  private debounceTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastValues: Map<string, unknown> = new Map();
  private listeners: Map<string, Set<PersistenceListener>> = new Map();
  private maxMapSize = 1000; // Prevent unbounded growth

  /**
   * Register a state path for persistence.
   *
   * Registration is reference counted so multiple components can safely use
   * the same key without one component unmounting the other component's
   * configuration.
   */
  register(config: StatePersistenceConfig): void {
    // Prevent unbounded growth by cleaning up old entries
    if (this.configs.size >= this.maxMapSize) {
      this.cleanupOldEntries();
    }

    const existing = this.configs.get(config.key);
    if (existing) {
      existing.references += 1;

      if (
        existing.config.namespace !== (config.namespace ?? 'react-wrapper') ||
        existing.config.storage !== (config.storage ?? 'localStorage')
      ) {
        console.warn(
          `State persistence key "${config.key}" is already registered with a different storage configuration. The first configuration remains active.`
        );
      }

      return;
    }

    const normalizedConfig: StatePersistenceConfig = {
      namespace: 'react-wrapper',
      storage: 'localStorage',
      syncWithLivewire: false,
      debounceMs: 300,
      ...config,
    };

    this.configs.set(config.key, {
      config: normalizedConfig,
      references: 1,
    });

    // Load initial value from storage
    this.loadFromStorage(config.key);
  }

  /**
   * Save state value with persistence and sync
   */
  async save(key: string, value: unknown): Promise<void> {
    const registration = this.configs.get(key);
    if (!registration) {
      console.warn(`State persistence config not found for key: ${key}`);
      return;
    }
    const config = registration.config;

    // Check if value actually changed
    const lastValue = this.lastValues.get(key);
    if (this.deepEqual(lastValue, value)) {
      return; // No change, skip save
    }

    this.lastValues.set(key, this.deepClone(value));

    // Clear existing timeout
    const existingTimeout = this.debounceTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce the save operation
    const timeout = setTimeout(
      async () => {
        await this.performSave(key, value, config);
        this.debounceTimeouts.delete(key);
      },
      Math.max(0, config.debounceMs ?? 300)
    );

    this.debounceTimeouts.set(key, timeout);
  }

  /**
   * Load state value from storage
   */
  async load(key: string): Promise<unknown> {
    if (!this.configs.has(key)) {
      return null;
    }

    return Promise.resolve(this.loadFromStorage(key));
  }

  /**
   * Clear all timeouts and perform immediate sync
   */
  flush(): void {
    // Execute all pending saves immediately
    this.debounceTimeouts.forEach((timeout, key) => {
      clearTimeout(timeout);
      const config = this.configs.get(key)?.config;
      const value = this.lastValues.get(key);
      if (config && value !== undefined) {
        this.performSave(key, value, config);
      }
    });
    this.debounceTimeouts.clear();
  }

  /**
   * Unregister a state path
   */
  unregister(key: string): void {
    const registration = this.configs.get(key);
    if (registration) {
      registration.references -= 1;
      if (registration.references <= 0) {
        const timeout = this.debounceTimeouts.get(key);
        if (timeout) {
          clearTimeout(timeout);
          this.debounceTimeouts.delete(key);
        }
        this.configs.delete(key);
        this.listeners.delete(key);
        this.lastValues.delete(key);
      }
    }
  }

  /**
   * Get all registered keys
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Remove stored data for a key (alias for clear)
   */
  async remove(key: string): Promise<void> {
    this.clearSync(key);
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    // Remove only keys owned by this service. Never clear the entire origin's
    // localStorage/sessionStorage because unrelated application data may live
    // there.
    this.configs.forEach(({ config }, key) => {
      this.removeFromStorage(config);
      this.lastValues.delete(key);
    });

    this.configs.clear();
    this.listeners.clear();

    // Clear all timeouts
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();
  }

  /**
   * Clear stored data for a specific key
   */
  private clearSync(key: string): void {
    const config = this.configs.get(key)?.config;
    if (!config) {
      return;
    }

    // Clear from storage
    this.removeFromStorage(config);

    // Clear from memory
    this.lastValues.delete(key);

    // Clear pending timeout
    const timeout = this.debounceTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.debounceTimeouts.delete(key);
    }
  }

  /**
   * Perform the actual save operation
   */
  private async performSave(
    key: string,
    value: unknown,
    config: StatePersistenceConfig
  ): Promise<void> {
    try {
      // Transform data if transformer is provided
      const serializedValue = config.transformer?.serialize
        ? config.transformer.serialize(value)
        : value;

      // Save to storage
      if (config.storage !== 'none') this.saveToStorage(config, serializedValue);

      // Sync with Livewire
      if (config.syncWithLivewire && config.livewirePath) {
        this.syncWithLivewire(config.livewirePath, serializedValue);
      }

      this.notify(key, value);
    } catch (error) {
      console.error(`Error persisting state for key: ${key}`, error);
    }
  }

  /**
   * Save to browser storage
   */
  private saveToStorage(config: StatePersistenceConfig, value: unknown): void {
    const storage = this.getStorage(config);
    if (!storage) return;

    try {
      storage.setItem(this.getStorageKey(config), JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to ${config.storage}:`, error);
    }
  }

  /**
   * Load from browser storage
   */
  private loadFromStorage(key: string): unknown {
    const config = this.configs.get(key)?.config;
    if (!config || config.storage === 'none') {
      return null;
    }

    const storage = this.getStorage(config);
    if (!storage) return null;

    try {
      const storageKey = this.getStorageKey(config);
      // Read the old un-namespaced key once for backwards compatibility and
      // migrate it to the namespaced key on the next write.
      const namespacedStored = storage.getItem(storageKey);
      const legacyStored = namespacedStored === null ? storage.getItem(key) : null;
      const stored = namespacedStored ?? legacyStored;
      if (stored) {
        if (namespacedStored === null && legacyStored !== null) {
          storage.setItem(storageKey, legacyStored);
        }
        const parsed = JSON.parse(stored);
        const value = config.transformer?.deserialize
          ? config.transformer.deserialize(parsed)
          : parsed;

        this.lastValues.set(key, this.deepClone(value));
        return value;
      }
    } catch (error) {
      console.error(`Error loading from ${config.storage}:`, error);
    }
    return null;
  }

  /**
   * Sync with Livewire component
   */
  private syncWithLivewire(livewirePath: string, value: unknown): void {
    if (typeof window !== 'undefined' && window.workflowDataSync) {
      window.workflowDataSync(livewirePath, value);
    } else {
      console.warn('workflowDataSync not available for Livewire sync');
    }
  }

  /** Subscribe to changes made by another hook using the same logical key. */
  subscribe(key: string, listener: PersistenceListener): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(listener);

    return () => {
      const listeners = this.listeners.get(key);
      listeners?.delete(listener);
      if (listeners && listeners.size === 0) this.listeners.delete(key);
    };
  }

  private notify(key: string, value: unknown): void {
    this.listeners.get(key)?.forEach(listener => {
      try {
        listener(this.deepClone(value));
      } catch (error) {
        console.error(`Error notifying persisted state listeners for key "${key}":`, error);
      }
    });
  }

  private getStorage(config: StatePersistenceConfig): BrowserStorage | null {
    if (typeof window === 'undefined' || config.storage === 'none') return null;
    return config.storage === 'sessionStorage' ? window.sessionStorage : window.localStorage;
  }

  private getStorageKey(config: StatePersistenceConfig): string {
    return `${config.namespace ?? 'react-wrapper'}:${config.key}`;
  }

  private removeFromStorage(config: StatePersistenceConfig): void {
    const storage = this.getStorage(config);
    if (!storage) return;

    storage.removeItem(this.getStorageKey(config));
  }

  /** Handle updates made by another tab. */
  handleStorageEvent(event: BrowserStorageEvent): void {
    if (!event.key) return;

    this.configs.forEach(({ config }, key) => {
      if (this.getStorageKey(config) === event.key) {
        this.notify(key, event.newValue === null ? undefined : this.loadFromStorage(key));
      }
    });
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (
          !keysB.includes(key) ||
          !this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
        ) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Deep clone object
   */
  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));

    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned;
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanupOldEntries(): void {
    // Clean up entries without active timeouts first
    const keysToRemove: string[] = [];

    this.configs.forEach((_config, key) => {
      if (!this.debounceTimeouts.has(key)) {
        keysToRemove.push(key);
      }
    });

    // Remove up to 100 old entries
    keysToRemove.slice(0, 100).forEach(key => {
      this.configs.delete(key);
      this.lastValues.delete(key);
    });

    // If still too many, remove oldest 100 entries
    if (this.configs.size >= this.maxMapSize) {
      const allKeys = Array.from(this.configs.keys());
      allKeys.slice(0, 100).forEach(key => {
        this.unregister(key);
      });
    }
  }
}

// Global instance
export const statePersistenceService = new StatePersistenceService();

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    statePersistenceService.flush();
  });

  // Make available globally for debugging
  (window as unknown as Record<string, unknown>).statePersistenceService = statePersistenceService;

  window.addEventListener('storage', event => {
    statePersistenceService.handleStorageEvent(event);
  });
}
