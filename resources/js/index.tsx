// React Wrapper - Complete system with enhanced features
import { componentRegistry, registerComponents } from './components/ReactComponentRegistry';
import { universalReactRenderer } from './components/UniversalReactRenderer';
import {
  StateManagerProvider,
  useStateManager,
  useStatePath,
  withStateManager,
  globalStateManager,
} from './components/StateManager';
import { statePersistenceService, usePersistedState } from './services/StatePersistenceService';
import { devTools } from './services/DevTools';
import { codeSplittingService } from './services/CodeSplittingService';
import { componentVersioningService } from './services/ComponentVersioningService';

// Enhanced features (MingleJS-inspired)
import {
  EnhancedStateProvider,
  useEnhancedStateManager,
  useEnhancedStatePath,
  useFilamentState,
  StateManagerFactory,
  type StateManagerConfig,
} from './components/EnhancedStateManager';
import {
  Component,
  registerComponent,
  getComponent,
  listComponents,
  mountIsland,
  autoMountIslands,
  createComponent,
  registerComponents as registerComponentsSimple,
} from './components/SimpleRegistration';
import { useFilamentBridge, use$wire, filamentBridge } from './services/FilamentBridge';

import type { ReactWrapperAPI } from './types';

// Import the Filament adapter to ensure it's loaded
import './components/adapters/FilamentReactAdapter';

// Export all functionality (backward compatibility)
export {
  // Registry
  componentRegistry,
  registerComponents,

  // Renderer
  universalReactRenderer,

  // State Management (original)
  StateManagerProvider,
  useStateManager,
  useStatePath,
  withStateManager,
  globalStateManager,

  // Enhanced State Management
  EnhancedStateProvider,
  useEnhancedStateManager,
  useEnhancedStatePath,
  useFilamentState,
  StateManagerFactory,

  // Persistence
  statePersistenceService,
  usePersistedState,

  // Advanced Services
  devTools,
  codeSplittingService,
  componentVersioningService,

  // Simple Registration (MingleJS-inspired)
  Component,
  registerComponent,
  getComponent,
  listComponents,
  mountIsland,
  autoMountIslands,
  createComponent,
  registerComponentsSimple,

  // Laravel-style Bridge
  useFilamentBridge,
  use$wire,
  filamentBridge,
};

// Export types
export * from './types';
export type { StateManagerConfig };

// Bootstrap function for initialization
export function bootstrap() {
  console.log('React Wrapper initialized for Filament integration');
  return true;
}

// Make functionality globally available with namespacing
if (typeof window !== 'undefined') {
  // Initialize namespace
  const filamentReact = window.FilamentReact || {};

  filamentReact.ReactWrapper = {
    componentRegistry,
    universalReactRenderer,
    globalStateManager,
    statePersistenceService,
    devTools,
    codeSplittingService,
    componentVersioningService,
    bootstrap,
  };

  // Backward compatibility
  window.FilamentReact = filamentReact;
  window.ReactWrapper = filamentReact.ReactWrapper;
  window.ReactComponentRegistry = componentRegistry;

  // Auto-bootstrap
  bootstrap();
}

// Default export with proper typing to avoid exposing private members
const ReactWrapper: ReactWrapperAPI = {
  componentRegistry,
  universalReactRenderer,
  globalStateManager,
  statePersistenceService,
  devTools,
  codeSplittingService,
  componentVersioningService,
  bootstrap,
};

export default ReactWrapper;
