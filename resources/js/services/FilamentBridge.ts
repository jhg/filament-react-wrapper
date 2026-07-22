// Laravel-style method calls inspired by MingleJS $wire
import { setWindowGlobal } from '../utils/globals';
import { useMemo } from 'react';

export interface FilamentBridgeConfig {
  baseUrl?: string;
  token?: string;
  timeout?: number;
  livewireComponentId?: string;
}

type LivewireWire = {
  call?: (method: string, ...args: unknown[]) => unknown;
  $call?: (method: string, ...args: unknown[]) => unknown;
};

export class FilamentBridge {
  private config: FilamentBridgeConfig;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config: FilamentBridgeConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/filament',
      token: config.token || this.getCSRFToken(),
      timeout: config.timeout || 5000,
      livewireComponentId: config.livewireComponentId,
    };
  }

  configure(config: FilamentBridgeConfig): this {
    this.config = {
      ...this.config,
      ...Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined)),
    };
    return this;
  }

  // Laravel-style method calls
  async call(method: string, ...args: unknown[]): Promise<unknown> {
    try {
      const livewire = this.getLivewireComponent();
      if (livewire) {
        const call = livewire.$call ?? livewire.call;
        if (call) {
          return await Promise.resolve(call.call(livewire, method, ...args));
        }
      }

      const controller = new window.AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), this.config.timeout);
      try {
        const response = await fetch(`${this.config.baseUrl}/react-bridge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': this.config.token || '',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            method,
            args,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return (await response.json()) as unknown;
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('FilamentBridge call failed:', error);
      throw error;
    }
  }

  // Event emission (Laravel events)
  emit(event: string, data: unknown = null): void {
    // Emit to server
    this.call('emit', event, data).catch(error => {
      console.error('Failed to emit event to server:', error);
    });

    // Emit locally
    this.emitLocal(event, data);
  }

  // Local event emission
  emitLocal(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  // Event listening
  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  // State setting (similar to Livewire)
  set(path: string, value: unknown): Promise<unknown> {
    return this.call('set', path, value);
  }

  // State getting
  get(path: string): Promise<unknown> {
    return this.call('get', path);
  }

  // Form submission
  submit(form: Record<string, unknown>): Promise<unknown> {
    return this.call('submit', form);
  }

  // File upload
  async upload(file: File, path: string = 'uploads'): Promise<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch(`${this.config.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': this.config.token || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return response.json();
  }

  // Validation
  validate(data: Record<string, unknown>, rules: Record<string, string>): Promise<unknown> {
    return this.call('validate', data, rules);
  }

  // Refresh component
  refresh(): Promise<unknown> {
    return this.call('refresh');
  }

  // Private helper methods
  private getCSRFToken(): string {
    if (typeof document === 'undefined') return '';

    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    return token || '';
  }

  private getLivewireComponent(): LivewireWire | undefined {
    const id = this.config.livewireComponentId;
    if (
      !id ||
      typeof window === 'undefined' ||
      !window.Livewire ||
      typeof window.Livewire.find !== 'function'
    ) {
      return undefined;
    }
    return window.Livewire.find(id);
  }
}

// Create singleton instance
export const filamentBridge = new FilamentBridge();

// React hook for using the bridge
export const useFilamentBridge = (config?: FilamentBridgeConfig) => {
  const baseUrl = config?.baseUrl;
  const token = config?.token;
  const timeout = config?.timeout;
  const livewireComponentId = config?.livewireComponentId;
  const bridge = useMemo(() => {
    if (!config) return filamentBridge;

    return new FilamentBridge({ baseUrl, token, timeout, livewireComponentId });
  }, [config, baseUrl, token, timeout, livewireComponentId]);

  return {
    $filament: {
      call: bridge.call.bind(bridge),
      emit: bridge.emit.bind(bridge),
      on: bridge.on.bind(bridge),
      set: bridge.set.bind(bridge),
      get: bridge.get.bind(bridge),
      submit: bridge.submit.bind(bridge),
      upload: bridge.upload.bind(bridge),
      validate: bridge.validate.bind(bridge),
      refresh: bridge.refresh.bind(bridge),
    },
  };
};

// MingleJS-style $wire compatibility
export const use$wire = () => {
  return {
    $wire: {
      call: filamentBridge.call.bind(filamentBridge),
      emit: filamentBridge.emit.bind(filamentBridge),
      set: filamentBridge.set.bind(filamentBridge),
      get: filamentBridge.get.bind(filamentBridge),
      submit: filamentBridge.submit.bind(filamentBridge),
      upload: filamentBridge.upload.bind(filamentBridge),
      refresh: filamentBridge.refresh.bind(filamentBridge),
    },
  };
};

// Global access
if (typeof window !== 'undefined') {
  setWindowGlobal('FilamentBridge', filamentBridge);
  setWindowGlobal('$filament', filamentBridge);
}
