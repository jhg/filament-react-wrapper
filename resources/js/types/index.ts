/**
 * Public type definitions for React Wrapper
 */

// Re-export key interfaces
export type { IComponentDefinition, IComponentRegistry } from '../interfaces/IComponentRegistry';

// Import interfaces
import type { IComponentRegistry } from '../interfaces/IComponentRegistry';
import type { StatePersistenceService } from '../services/StatePersistenceService';

// Main API interface with proper typing
export interface ReactWrapperAPI {
  readonly componentRegistry: IComponentRegistry;
  readonly universalReactRenderer: IUniversalRenderer;
  readonly statePersistenceService: StatePersistenceService;
  readonly devTools: IDevTools;
  readonly bootstrap: () => boolean;
}

// Service interfaces
export interface IUniversalRenderer {
  render(options: {
    component: string;
    props?: Record<string, unknown>;
    statePath?: string;
    containerId: string;
    onDataChange?: (data: unknown) => void;
    onError?: (error: Error) => void;
  }): void;
  unmount(containerId: string): void;
  updateProps(containerId: string, newProps: unknown): void;
  isRendered(containerId: string): boolean;
}

export interface IDevTools {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  log(message: string, data?: unknown): void;
}
