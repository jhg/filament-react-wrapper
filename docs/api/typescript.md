# TypeScript API

Import public APIs from the package alias:

```tsx
import {
    registerComponent,
    defineComponents,
    useStatePath,
    useGlobalStatePath,
    useFilamentBridge,
} from '@react-wrapper';
```

## Registration

```tsx
import { defineComponents, registerComponent, componentRegistry } from '@react-wrapper';

registerComponent('UserCard', UserCard, {
    props: { role: 'Member' },
    category: 'users',
});

// Recommended for a normal frontend entrypoint:
defineComponents({ UserCard });

componentRegistry.mount('UserCard', 'user-card', { name: 'Ada' });
```

The public registration helpers are `defineComponents`, `registerComponent`,
`registerLazyComponent`, `Component`, `registerComponents`, `getComponent`,
`listComponents`, `createComponent`, `mountIsland`, and `autoMountIslands`.
Normal function components are synchronous by default; dynamic imports must be
registered explicitly with `registerLazyComponent()` or `isAsync: true` on the
advanced registry API. The registry also supports `get`, `has`, `create`,
`getAll`, `getComponentNames`, `getStats`, `on`, `off`, `mount`, `unmount`, and
`unregister`.

`ComponentProps` is `Record<string, unknown>`. Public callbacks use `unknown` instead of an unrestricted value type.

## State

```tsx
import {
    StateManagerProvider,
    useStateManager,
    useStatePath,
    useGlobalStatePath,
    globalStateManager,
} from '@react-wrapper';

function Editor() {
    const [title, setTitle] = useStatePath('document.title', 'Untitled');
    return <input value={title} onChange={event => setTitle(event.target.value)} />;
}
```

`StateManagerProvider` exposes `state`, `setState`, `updateState`, `getState`, `resetState`, `batchUpdate`, and `subscribe`. `useStateManager` must be rendered below a provider. `globalStateManager` provides the same path operations for cross-component communication.

`useStatePath()` is scoped to a provider. Use `useGlobalStatePath()` only when
independent React roots intentionally share a singleton store. Reusable
components should normally use regular React state and props instead.

The lower-level classes are `StandardStateManager`, `ValidatedStateManager`, and `PersistentStateManager` from `services/StateManagerService`. Shared immutable path helpers live in `utils/state`.

For optional enhanced strategies:

```tsx
import { StateManagerFactory, useFilamentState } from '@react-wrapper';

const manager = StateManagerFactory.create({
    strategy: 'context',
    persistence: false,
    devtools: false,
});
const [value, setValue] = useFilamentState('form.value', '');
```

## Persistence

```tsx
import { usePersistedState } from '@react-wrapper';

const [theme, setTheme] = usePersistedState('theme', 'light', {
    storage: 'localStorage',
    namespace: 'my-app:preferences',
    debounceMs: 300,
});
```

`StatePersistenceService` supports local/session storage, `none`, debouncing,
serializers, deserializers, `flush`, `remove`, `clear`, and optional Livewire
sync through `window.workflowDataSync`. Storage keys are namespaced by default,
shared keys are reference-counted, and `clear()` only removes keys owned by the
service.

## Filament field contract

Fields expose a regular controlled React API while keeping the old props
available for compatibility:

```tsx
import type { ReactFieldProps } from '@react-wrapper';

export function Editor({ value, onChange, errors, disabled }: ReactFieldProps<string>) {
    return <textarea value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} />;
}
```

`useReactField()` is an optional adapter when a shared component wants
functional updates and normalized error helpers.

## Livewire bridge

```tsx
import { useFilamentBridge } from '@react-wrapper';

function Actions() {
    const { $filament } = useFilamentBridge({
        livewireComponentId: 'livewire-component-id',
    });
    return <button onClick={() => void $filament.call('refresh')}>Refresh</button>;
}
```

The bridge exposes `call`, `emit`, `on`, `set`, `get`, `submit`, `upload`, `validate`, and `refresh`. When `livewireComponentId` is configured and Livewire can resolve that id, calls use the Livewire handle. Otherwise the bridge posts to the configured HTTP endpoints; secure those application endpoints with normal Laravel authentication, authorization, and CSRF protection. `FilamentBridge.configure()` updates the singleton configuration when that is more convenient.

`use$wire` provides the small `$wire.call`/`$wire.emit` compatibility surface.

## Advanced services

- `codeSplittingService`: load, preload, cache, invalidate, and prefetch component modules.
- `componentVersioningService`: register versions, aliases, compatibility rules, and migrations.
- `devTools`: enable diagnostics, inspect registered components, and collect performance metrics.
- `universalReactRenderer`: render and unmount registry components from DOM containers.

These services are exported as singletons from `@react-wrapper`. Keep debug tooling disabled in production.
