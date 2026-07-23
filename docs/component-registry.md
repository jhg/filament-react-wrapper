# Component registry

The registry connects names in Filament/Blade containers with React
components. For a normal application entrypoint, use `defineComponents()` as
the single blessed registration path.

## Recommended registration

```tsx
import { defineComponents } from '@react-wrapper';
import UserCard from './components/UserCard';
import SalesChart from './components/SalesChart';

defineComponents({ UserCard, SalesChart });
```

The object key is the name used by PHP and Blade:

```php
ReactField::make('content')->component('RichTextInput');
```

```blade
@react('UserCard', ['name' => $user->name])
```

Keep default values in the component's own props. `defineComponents()` is
safe to call from the application's Vite entrypoint, and registration can
happen after the first DOM scan: the runtime observes the registry and mounts
the component as soon as it becomes available.

## Lazy components

For a component that should be loaded through a dynamic import, use the
explicit lazy helper:

```tsx
import { registerLazyComponent } from '@react-wrapper';

registerLazyComponent('AdvancedChart', () => import('./components/AdvancedChart'));
```

Use `defineComponents()` for eagerly imported components. Do not use the old
decorator pattern for new code.

## Advanced registration

Individual registration is available when metadata, default props, or custom
configuration is genuinely needed:

```tsx
import { registerComponent } from '@react-wrapper';
import UserCard from './components/UserCard';

registerComponent('UserCard', UserCard, {
    defaultProps: { role: 'Member' },
    metadata: { category: 'users', tags: ['profile'] },
});
```

The lower-level registry API is useful for middleware, lifecycle events, and
manual mounting:

```tsx
import { componentRegistry } from '@react-wrapper';

componentRegistry.register({
    name: 'AdvancedChart',
    component: () => import('./components/AdvancedChart'),
    isAsync: true,
    config: { lazy: true, cache: true },
    metadata: { category: 'charts' },
});

componentRegistry.mount('UserCard', 'user-card', { name: 'Ada' });
```

Available inspection and lifecycle methods include `get`, `has`, `getAll`,
`getComponentNames`, `getStats`, `unregister`, `clear`, `mount`, `unmount`,
`on`, and `off`. `subscribe()` is an internal-friendly observable used by the
runtime to handle registration that happens after an island was discovered.

## Manual islands

Most applications should let the MutationObserver discover the container. A
manual island is available for cases where the application controls mounting:

```tsx
import { mountIsland } from '@react-wrapper';

const unmount = mountIsland('#user-card', 'UserCard', { name: 'Ada' });
// Call unmount?.() when the host page removes the island outside Livewire.
```

The runtime also exposes `getComponent`, `listComponents`,
`registerComponents`, `createComponent`, and `autoMountIslands` for advanced
integration code. These APIs are intentionally below `defineComponents()` in
the documentation so the normal frontend path stays obvious.
