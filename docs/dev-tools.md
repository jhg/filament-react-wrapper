# Developer tools

`devTools` is a browser-only diagnostic singleton. It is enabled on localhost, in development mode, or when `?react-wrapper-debug=true` / `localStorage.react-wrapper-debug` is present. Keep it disabled in production.

```tsx
import { devTools } from '@react-wrapper';

devTools.enable();
devTools.showDebugPanel();
devTools.logComponentInfo();
devTools.logStateInfo();
devTools.logPerformanceInfo();
```

The service records component mounts, renders, unmounts, warnings, errors, state changes, and performance metrics. It also exposes read-only snapshots:

```tsx
const component = devTools.getComponentInfo('UserCard');
const components = devTools.getComponentInfo();
const stateChanges = devTools.getStateHistory('user');
const metrics = devTools.getPerformanceMetrics('UserCard');
const memory = devTools.getMemoryUsage();
```

External diagnostics can subscribe to typed events and unsubscribe when the integration is disposed:

```tsx
const unsubscribe = devTools.subscribe(event => {
  if (event.type === 'state:changed') console.debug(event.data);
});
unsubscribe();
```

Performance marks use the browser Performance API:

```tsx
devTools.startPerformanceMeasure('load-user-card');
// work being measured
devTools.endPerformanceMeasure('load-user-card');
```

`clear()` removes collected component, state, and performance history. `disable()` also removes the debug panel and the persisted debug flag. The service logs diagnostics to the browser console; do not send its collected props or state to a remote service without applying the application’s own privacy rules.
