# Developer Tools

Comprehensive debugging and development tools for React Wrapper applications with real-time monitoring, performance analysis, and interactive debugging.

## 🎯 Overview

### What are React Wrapper DevTools?

The DevTools provide:
- **Real-time Monitoring** - Track component lifecycle and performance
- **Interactive Debugging** - Debug components and state in real-time
- **Performance Analysis** - Identify bottlenecks and optimization opportunities
- **State Inspection** - Visualize and modify global state
- **Component Registry Browser** - Explore registered components
- **Network Analysis** - Monitor chunk loading and caching

### Key Features

- ✅ **Debug Panel** - Interactive debugging interface
- ✅ **Performance Profiler** - Real-time performance metrics
- ✅ **Component Inspector** - Detailed component information
- ✅ **State Visualizer** - Global state tree visualization
- ✅ **Event Logger** - Comprehensive event tracking
- ✅ **Memory Monitor** - Memory usage tracking

## 🚀 Quick Start

### Enable Debug Mode

```env
# .env
REACT_WRAPPER_DEBUG=true
```

```typescript
// Or programmatically
import { devTools } from '@react-wrapper';

devTools.enable();
```

### Open Debug Panel

```typescript
// Programmatically
devTools.showDebugPanel();

// Or use keyboard shortcut
// Ctrl+Shift+W (Windows/Linux)
// Cmd+Shift+W (Mac)
```

### Basic Logging

```typescript
// Enable console logging
devTools.enable();

// Component events will be automatically logged
// State changes will be tracked
// Performance metrics will be collected
```

## 🎛️ Debug Panel

### Panel Overview

The debug panel provides several tabs:
- **Components** - Registry browser and component details
- **State** - Global state inspector and editor
- **Performance** - Performance metrics and profiling
- **Events** - Event log and filtering
- **Network** - Chunk loading and cache status
- **Console** - Debug output and commands

### Component Inspector

```typescript
// Get component information
const componentInfo = devTools.getComponentInfo('UserCard');
console.log('Component Info:', {
  name: componentInfo.name,
  props: componentInfo.props,
  mountTime: componentInfo.mountTime,
  renderCount: componentInfo.renderCount,
  lastRenderTime: componentInfo.lastRenderTime,
  errors: componentInfo.errors,
  warnings: componentInfo.warnings
});

// Get all components
const allComponents = devTools.getComponentInfo();
```

### State Inspector

```typescript
// View current state
devTools.logStateInfo();

// Get state history
const stateHistory = devTools.getStateHistory();
console.log('State Changes:', stateHistory);

// Get specific path history
const userStateHistory = devTools.getStateHistory('user');
```

## 📊 Performance Monitoring

### Performance Metrics

```typescript
// Track component performance
devTools.trackComponentMount('UserCard', { userId: 123 });
devTools.trackComponentRender('UserCard', { userId: 123 });
devTools.trackComponentUnmount('UserCard');

// Manual performance measurement
devTools.startPerformanceMeasure('expensive-operation');
// ... expensive operation
devTools.endPerformanceMeasure('expensive-operation');

// Get performance metrics
const metrics = devTools.getPerformanceMetrics('UserCard');
console.log('Performance Metrics:', metrics);
```

### Memory Monitoring

```typescript
// Get memory usage
const memoryUsage = devTools.getMemoryUsage();
console.log('Memory Usage:', {
  used: memoryUsage?.usedJSHeapSize,
  total: memoryUsage?.totalJSHeapSize,
  limit: memoryUsage?.jsHeapSizeLimit
});

// Track memory over time
devTools.startMemoryTracking();
setTimeout(() => {
  const memoryReport = devTools.getMemoryReport();
  console.log('Memory Report:', memoryReport);
}, 10000);
```

### Performance Profiling

```typescript
// Start profiling
devTools.startProfiling();

// Perform operations to profile
componentRegistry.mount('Dashboard', 'dashboard-container');
globalStateManager.setState('user.name', 'John Doe');
// ... other operations

// Get profiling results
const profile = devTools.getProfile();
console.log('Performance Profile:', {
  componentOperations: profile.componentOperations,
  stateOperations: profile.stateOperations,
  renderTimes: profile.renderTimes,
  memorySnapshots: profile.memorySnapshots
});

// Stop profiling
devTools.stopProfiling();
```

## 🔍 Component Debugging

### Component Lifecycle Tracking

```typescript
// Track lifecycle events automatically
devTools.subscribe((event) => {
  switch (event.type) {
    case 'component:mounted':
      console.log(`Component ${event.data.name} mounted in ${event.data.mountTime}ms`);
      break;
    case 'component:rendered':
      console.log(`Component ${event.data.name} rendered (${event.data.renderCount} times)`);
      break;
    case 'component:unmounted':
      console.log(`Component ${event.data.name} unmounted`);
      break;
    case 'component:error':
      console.error(`Component ${event.data.name} error:`, event.data.error);
      break;
  }
});
```

### Component Props Inspector

```typescript
// Inspect component props
const PropsInspector = ({ componentName }) => {
  const [props, setProps] = React.useState({});
  
  React.useEffect(() => {
    const componentInfo = devTools.getComponentInfo(componentName);
    setProps(componentInfo?.props || {});
    
    // Subscribe to prop changes
    const unsubscribe = devTools.subscribe((event) => {
      if (event.type === 'component:props-changed' && event.data.name === componentName) {
        setProps(event.data.props);
      }
    });
    
    return unsubscribe;
  }, [componentName]);
  
  return (
    <div className="props-inspector">
      <h3>Props for {componentName}</h3>
      <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
};
```

### Error Tracking

```typescript
// Track component errors
devTools.trackComponentError('UserCard', new Error('Failed to load user data'));

// Get error history
const errors = devTools.getComponentInfo('UserCard')?.errors || [];
errors.forEach(error => {
  console.error('Component Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: error.timestamp
  });
});

// Error boundary integration
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    devTools.trackComponentError(this.props.componentName, error, errorInfo);
  }
  
  render() {
    return this.props.children;
  }
}
```

## 🔄 State Debugging

### State Inspector Component

```typescript
const StateInspector = () => {
  const [selectedPath, setSelectedPath] = React.useState('');
  const [stateTree, setStateTree] = React.useState({});
  
  React.useEffect(() => {
    // Get current state
    setStateTree(globalStateManager.getState());
    
    // Subscribe to state changes
    const unsubscribe = globalStateManager.subscribe('*', (newState) => {
      setStateTree(newState);
    });
    
    return unsubscribe;
  }, []);
  
  const handlePathSelect = (path) => {
    setSelectedPath(path);
    const value = globalStateManager.getState(path);
    console.log(`State at ${path}:`, value);
  };
  
  const handleStateEdit = (path, newValue) => {
    try {
      globalStateManager.setState(path, JSON.parse(newValue));
      devTools.log(`State updated: ${path}`, newValue);
    } catch (error) {
      devTools.log(`Failed to update state: ${error.message}`, 'error');
    }
  };
  
  return (
    <div className="state-inspector">
      <div className="state-tree">
        {/* Render state tree */}
        <StateTreeView 
          data={stateTree} 
          onPathSelect={handlePathSelect}
          selectedPath={selectedPath}
        />
      </div>
      
      <div className="state-editor">
        {selectedPath && (
          <StateEditor
            path={selectedPath}
            value={globalStateManager.getState(selectedPath)}
            onChange={(newValue) => handleStateEdit(selectedPath, newValue)}
          />
        )}
      </div>
    </div>
  );
};
```

### State Change Timeline

```typescript
// State timeline component
const StateTimeline = () => {
  const [stateHistory, setStateHistory] = React.useState([]);
  
  React.useEffect(() => {
    setStateHistory(devTools.getStateHistory());
    
    const unsubscribe = devTools.subscribe((event) => {
      if (event.type === 'state:changed') {
        setStateHistory(prev => [...prev, event.data]);
      }
    });
    
    return unsubscribe;
  }, []);
  
  const revertToState = (timestamp) => {
    const stateChange = stateHistory.find(change => change.timestamp === timestamp);
    if (stateChange) {
      globalStateManager.setState(stateChange.path, stateChange.oldValue);
      devTools.log(`Reverted state change: ${stateChange.path}`, 'info');
    }
  };
  
  return (
    <div className="state-timeline">
      <h3>State Change Timeline</h3>
      {stateHistory.map((change, index) => (
        <div key={index} className="state-change">
          <div className="change-header">
            <span className="path">{change.path}</span>
            <span className="timestamp">{new Date(change.timestamp).toLocaleTimeString()}</span>
            <button onClick={() => revertToState(change.timestamp)}>Revert</button>
          </div>
          <div className="change-details">
            <div className="old-value">
              <strong>Old:</strong> {JSON.stringify(change.oldValue)}
            </div>
            <div className="new-value">
              <strong>New:</strong> {JSON.stringify(change.newValue)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## 🎨 Custom Debug Tools

### Custom Debug Commands

```typescript
// Register custom debug commands
devTools.registerCommand('clear-cache', 'Clear all component cache', () => {
  componentRegistry.clearCache();
  devTools.log('Component cache cleared', 'success');
});

devTools.registerCommand('reload-components', 'Reload all components', () => {
  componentRegistry.reload();
  devTools.log('Components reloaded', 'success');
});

devTools.registerCommand('memory-usage', 'Show memory usage', () => {
  const usage = devTools.getMemoryUsage();
  devTools.log('Memory Usage', usage);
});

// Execute commands
devTools.executeCommand('clear-cache');
```

### Custom Inspectors

```typescript
// Register custom inspector
devTools.registerInspector('network', {
  name: 'Network Monitor',
  icon: '🌐',
  component: NetworkInspector,
  enabled: true
});

// Network inspector component
const NetworkInspector = () => {
  const [chunkLoads, setChunkLoads] = React.useState([]);
  
  React.useEffect(() => {
    const unsubscribe = codeSplittingService.onChunkLoad((event) => {
      setChunkLoads(prev => [...prev, {
        chunkName: event.chunkName,
        loadTime: event.loadTime,
        size: event.size,
        cacheHit: event.cacheHit,
        timestamp: Date.now()
      }]);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <div className="network-inspector">
      <h3>Chunk Loading</h3>
      <table>
        <thead>
          <tr>
            <th>Chunk</th>
            <th>Load Time</th>
            <th>Size</th>
            <th>Cache</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {chunkLoads.map((load, index) => (
            <tr key={index}>
              <td>{load.chunkName}</td>
              <td>{load.loadTime}ms</td>
              <td>{(load.size / 1024).toFixed(2)}KB</td>
              <td>{load.cacheHit ? '✅' : '❌'}</td>
              <td>{new Date(load.timestamp).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## 📝 Logging and Monitoring

### Custom Logging

```typescript
// Custom log levels
devTools.log('Info message', 'info');
devTools.log('Warning message', 'warn');
devTools.log('Error message', 'error');
devTools.log('Success message', 'success');

// Structured logging
devTools.log('Component operation', {
  component: 'UserCard',
  operation: 'mount',
  duration: 45,
  props: { userId: 123 }
});

// Group related logs
devTools.group('User Login Process');
devTools.log('Validating credentials');
devTools.log('Checking permissions');
devTools.log('Loading user profile');
devTools.groupEnd();
```

### Event Filtering

```typescript
// Filter events by type
devTools.setEventFilter({
  types: ['component:mounted', 'state:changed'],
  components: ['UserCard', 'Dashboard'],
  minLogLevel: 'warn'
});

// Custom event filter
devTools.setEventFilter((event) => {
  return event.type.startsWith('performance:') && event.data.duration > 100;
});
```

### Remote Monitoring

```typescript
// Send debug data to remote service
devTools.configure({
  remoteLogging: {
    enabled: true,
    endpoint: 'https://api.example.com/debug-logs',
    apiKey: 'your-api-key',
    batchSize: 10,
    flushInterval: 5000
  }
});

// Custom remote logger
devTools.onLog((logEntry) => {
  if (logEntry.level === 'error') {
    fetch('/api/error-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: logEntry.message,
        data: logEntry.data,
        timestamp: logEntry.timestamp,
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });
  }
});
```

## 🎯 Production Debugging

### Safe Production Debugging

```typescript
// Enable debug mode only for specific users
const enableDebugForUser = (userId) => {
  const debugUsers = ['admin-user-1', 'qa-tester-2'];
  return debugUsers.includes(userId);
};

if (enableDebugForUser(currentUser.id)) {
  devTools.enable({
    safeMode: true, // Limit potentially harmful features
    maxLogEntries: 1000,
    maxMemorySnapshots: 10
  });
}
```

### Debug Session Recording

```typescript
// Record debug session
devTools.startRecording({
  includeState: true,
  includeEvents: true,
  includePerformance: true,
  maxDuration: 300000 // 5 minutes
});

// Export recording
const recording = devTools.exportRecording();
const blob = new Blob([JSON.stringify(recording)], { type: 'application/json' });
const url = URL.createObjectURL(blob);

// Download recording
const a = document.createElement('a');
a.href = url;
a.download = `debug-session-${Date.now()}.json`;
a.click();
```

### Performance Budgets

```typescript
// Set performance budgets
devTools.setPerformanceBudgets({
  componentMountTime: 100, // ms
  stateUpdateTime: 50,     // ms
  renderTime: 16,          // ms (60fps)
  memoryUsage: 50 * 1024 * 1024 // 50MB
});

// Monitor budget violations
devTools.onBudgetViolation((violation) => {
  console.warn('Performance budget violation:', violation);
  
  // Send to monitoring service
  analytics.track('performance_budget_violation', violation);
});
```

## 🔌 Browser Extension Integration

### Browser DevTools Extension

```typescript
// Connect to React DevTools extension
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (id, root) => {
    devTools.trackRender(root);
  };
}

// Connect to Redux DevTools extension
if (window.__REDUX_DEVTOOLS_EXTENSION__) {
  const reduxDevTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
    name: 'React Wrapper State'
  });
  
  globalStateManager.subscribe('*', (state) => {
    reduxDevTools.send('STATE_UPDATE', state);
  });
}
```

## 💡 Best Practices

### 1. Development vs Production

```typescript
// Conditional debug features
if (process.env.NODE_ENV === 'development') {
  devTools.enable({
    verboseLogging: true,
    memoryTracking: true,
    performanceProfiling: true
  });
} else if (process.env.NODE_ENV === 'production') {
  // Minimal debugging for production
  devTools.enable({
    safeMode: true,
    maxLogEntries: 100,
    errorTrackingOnly: true
  });
}
```

### 2. Performance Impact

```typescript
// Lazy load debug panel
const DebugPanel = React.lazy(() => import('./DebugPanel'));

// Conditional rendering
const App = () => (
  <div>
    <MainApp />
    {devTools.isEnabled() && (
      <React.Suspense fallback={<div>Loading debug panel...</div>}>
        <DebugPanel />
      </React.Suspense>
    )}
  </div>
);
```

### 3. Security Considerations

```typescript
// Sanitize sensitive data in logs
devTools.addLogSanitizer((logEntry) => {
  if (logEntry.data && typeof logEntry.data === 'object') {
    const sanitized = { ...logEntry.data };
    
    // Remove sensitive fields
    ['password', 'token', 'apiKey', 'ssn'].forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return { ...logEntry, data: sanitized };
  }
  
  return logEntry;
});
```

### 4. Team Collaboration

```typescript
// Share debug sessions
const shareDebugSession = async () => {
  const session = devTools.exportSession();
  
  const response = await fetch('/api/debug-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  });
  
  const { shareUrl } = await response.json();
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl);
  devTools.log(`Debug session shared: ${shareUrl}`, 'success');
};
```

---

**Debug like a pro with comprehensive React Wrapper DevTools! 🛠️**