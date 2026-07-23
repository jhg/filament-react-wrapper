# TypeScript API

Import public APIs from the package alias:

```tsx
import {
    registerComponent,
    defineComponents,
    useFilamentState,
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
    EnhancedStateProvider,
    useFilamentState,
} from '@react-wrapper';

function Editor() {
    const [title, setTitle] = useFilamentState('document.title', 'Untitled');
    return <input value={title} onChange={event => setTitle(event.target.value)} />;
}

export function App() {
    return (
        <EnhancedStateProvider config={{ strategy: 'context', persistence: false, devtools: false }}>
            <Editor />
        </EnhancedStateProvider>
    );
}
```

`useFilamentState()` is scoped to the nearest `EnhancedStateProvider` and is
intended for shared client-side state below one React tree. It does not replace
Livewire's server-authoritative state. Reusable components should normally use
React state, props, and callbacks instead. `StateManagerFactory` supports the
current context strategy and an optional Zustand strategy with context fallback.

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

Fields expose a regular controlled React API:

```tsx
import type { ReactFieldProps } from '@react-wrapper';

export function Editor({ value, onChange, errors, disabled }: ReactFieldProps<string>) {
    return <textarea value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} />;
}
```

`useReactField()` is an optional adapter when a shared component wants
functional updates and normalized error helpers.

For example, a Filament field declared as
`ReactField::make('content')->component('RichTextInput')` can be implemented as
a normal controlled input:

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export default function RichTextInput(props: ReactFieldProps<string>) {
    const { value, setValue, errors, disabled } = useReactField(props);

    return (
        <>
            <textarea
                id={props.fieldId}
                value={value ?? ''}
                disabled={disabled}
                onChange={event => setValue(event.target.value)}
            />
            {errors.map(error => <p key={error}>{error}</p>)}
        </>
    );
}
```

`setValue(nextValue)` calls the field's `onChange`; the adapter sends that value
to the full Filament state path, such as `data.content`, through Livewire. The
server value is read with `$wire.get(path)` after Livewire's `morphed` hook, so
the component should render `value` directly instead of maintaining a second
uncontrolled copy.

For client-side validation, dispatch `react-validation-error` from the field
container with `{ detail: { errors: string[] } }`; dispatch
`react-validation-clear` when the value becomes valid. The adapter exposes the
result through `errors` and `useReactField().errors`. This is local React
feedback, not a mutation of Filament's server error bag. Server-side Filament
validation still arrives through the field props after a Livewire render.

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
