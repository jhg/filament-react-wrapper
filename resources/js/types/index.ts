/**
 * Public type definitions for React Wrapper
 */

// Re-export key interfaces
export type { IComponentDefinition, IComponentRegistry } from '../interfaces/IComponentRegistry';
export type {
  IStateManagerState,
  IStateManager,
  IStatePersistence,
} from '../interfaces/IStateManager';

// Import interfaces
import type { IComponentRegistry } from '../interfaces/IComponentRegistry';
import type { ReactComponent } from '../interfaces/IComponentRegistry';
import type { IStateManager, IStatePersistence } from '../interfaces/IStateManager';

// Main API interface with proper typing
export interface ReactWrapperAPI {
  readonly componentRegistry: IComponentRegistry;
  readonly universalReactRenderer: IUniversalRenderer;
  readonly globalStateManager: IStateManager;
  readonly statePersistenceService: IStatePersistence;
  readonly devTools: IDevTools;
  readonly codeSplittingService: ICodeSplittingService;
  readonly componentVersioningService: IVersioningService;
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

export interface ICodeSplittingService {
  loadComponent(name: string): Promise<ReactComponent>;
  preloadComponent(name: string): Promise<void>;
  isLoaded(name: string): boolean;
}

export interface IVersioningService {
  getVersion(componentName: string): string | undefined;
  setVersion(componentName: string, version: string): void;
  isCompatible(componentName: string, requiredVersion: string): boolean;
}
