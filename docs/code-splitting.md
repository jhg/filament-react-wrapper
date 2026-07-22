# Code splitting

`codeSplittingService` loads React modules from `resources/js/components/` on demand. The component name passed to `loadComponent()` must match a `.tsx` module in that directory.

```tsx
import { codeSplittingService } from '@react-wrapper';

const Component = await codeSplittingService.loadComponent('StateManager');
```

The service chooses the first matching built-in strategy: `route-based`, `feature-based`, `vendor-based`, `size-based`, `critical-path`, and finally `default`. Metadata can select a strategy:

```tsx
await codeSplittingService.loadComponent('AdminDashboard', { category: 'page' });
await codeSplittingService.loadComponent('Editor', { external: true });
await codeSplittingService.loadComponent('AppHeader', { critical: true });
```

Register a custom strategy when the application has a more specific grouping:

```tsx
import { ChunkPriority, codeSplittingService } from '@react-wrapper';

codeSplittingService.registerStrategy({
  name: 'reports',
  condition: name => name.startsWith('Report'),
  chunkName: name => `reports-${name.toLowerCase()}`,
  priority: ChunkPriority.HIGH,
});
```

Prefetch rules are triggered after a component starts loading. The rule condition is optional and `delay` is in milliseconds:

```tsx
codeSplittingService.addPrefetchRule({
  trigger: 'Dashboard',
  prefetch: ['ReportTable'],
  delay: 250,
  condition: () => Boolean(window.matchMedia('(min-width: 1024px)').matches),
});
```

Use `preloadComponents()` for an explicit queue. Priorities are exported as `ChunkPriority` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, and `BACKGROUND`). `preloadComponent()` is a safe convenience wrapper that logs failures instead of throwing.

```tsx
codeSplittingService.preloadComponents(['AdminDashboard'], ChunkPriority.HIGH);
await codeSplittingService.preloadComponent('ReportTable');
```

Operational helpers are available for diagnostics:

```tsx
codeSplittingService.isLoaded('ReportTable');
codeSplittingService.getChunkInfo('ReportTable');
codeSplittingService.analyzeBundles();
codeSplittingService.clearCache();
```

The service caches in-flight and completed loads. Failed loads are removed from the cache so a later call can retry. Keep component names controlled by application code; do not pass untrusted input directly to the dynamic loader.
