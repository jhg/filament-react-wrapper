// React Wrapper - Complete system with enhanced features
import { componentRegistry, registerComponents } from './components/ReactComponentRegistry';
import { universalReactRenderer } from './components/UniversalReactRenderer';
import {
  statePersistenceService,
  usePersistedState,
  type StatePersistenceConfig,
} from './services/StatePersistenceService';
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
  defineComponents,
  getComponent,
  listComponents,
  mountIsland,
  registerLazyComponent,
  autoMountIslands,
  createComponent,
  registerComponents as registerComponentsSimple,
} from './components/SimpleRegistration';
import { useFilamentBridge, use$wire, filamentBridge } from './services/FilamentBridge';
import { useReactField } from './hooks/useReactField';

import type { ReactWrapperAPI } from './types';
import { registerFilamentReactGlobals, setWindowGlobal } from './utils/globals';

// Import the Filament adapter to ensure it's loaded
import './components/adapters/FilamentReactAdapter';

// Export the public runtime API
export {
  // Registry
  componentRegistry,
  registerComponents,

  // Renderer
  universalReactRenderer,

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
  defineComponents,
  getComponent,
  listComponents,
  mountIsland,
  registerLazyComponent,
  autoMountIslands,
  createComponent,
  registerComponentsSimple,

  // Laravel-style Bridge
  useFilamentBridge,
  use$wire,
  filamentBridge,
  useReactField,
};

// Export types
export * from './types';
export type { ReactFieldProps } from './hooks/useReactField';
export type { StatePersistenceConfig };
export type { StateManagerConfig };

// Bootstrap function for initialization
export function bootstrap() {
  console.log('React Wrapper initialized for Filament integration');
  return true;
}

// Make functionality globally available with namespacing
if (typeof window !== 'undefined') {
  const filamentReact = registerFilamentReactGlobals({
    ReactWrapper: {
      componentRegistry,
      universalReactRenderer,
      statePersistenceService,
      devTools,
      codeSplittingService,
      componentVersioningService,
      bootstrap,
    },
  });

  setWindowGlobal('ReactWrapper', filamentReact.ReactWrapper);
  setWindowGlobal('ReactComponentRegistry', componentRegistry);

  // Auto-bootstrap
  bootstrap();
}

// Default export with proper typing to avoid exposing private members
const ReactWrapper: ReactWrapperAPI = {
  componentRegistry,
  universalReactRenderer,
  statePersistenceService,
  devTools,
  codeSplittingService,
  componentVersioningService,
  bootstrap,
};

export default ReactWrapper;
