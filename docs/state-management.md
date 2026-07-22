# State management

React owns component-local state by default. The package adds opt-in helpers
for state that deliberately crosses component boundaries, plus browser
persistence. Reusable components should prefer props, `useState`, and their
own context unless they explicitly need one of these integration boundaries.

## React provider

```tsx
import { StateManagerProvider, useStatePath } from '@react-wrapper';

function Editor() {
  const [title, setTitle] = useStatePath('document.title', 'Untitled');
  return <input value={title} onChange={event => setTitle(event.target.value)} />;
}

export function App() {
  return (
    <StateManagerProvider initialState={{ document: { title: 'Welcome' } }}>
      <Editor />
    </StateManagerProvider>
  );
}
```

`useStateManager()` exposes `state`, `setState`, `updateState`, `getState`, `resetState`, `batchUpdate`, and `subscribe`. Hooks must be rendered below `StateManagerProvider`. Paths use dot notation and updates are immutable.

`useStatePath()` is scoped to the nearest `StateManagerProvider`; it does not
create a package-global store and it does not communicate with Livewire.
Defaults are added to the shared path, so sibling consumers of the same path
observe the same initial value.

```tsx
const { setState, updateState, batchUpdate } = useStateManager();
setState('user.name', 'Ada');
updateState('user.loginCount', current => (Number(current) || 0) + 1);
batchUpdate([
  { path: 'user.role', value: 'admin' },
  { path: 'settings.theme', value: 'dark' },
]);
```

## Global state

`globalStateManager` has the same path operations for integrations outside React
and for React roots that intentionally need a shared singleton:

```tsx
import { globalStateManager } from '@react-wrapper';

globalStateManager.setState('profile.name', 'Ada');
const name = globalStateManager.getState<string>('profile.name');
const unsubscribe = globalStateManager.subscribe('profile.name', value => {
  console.log(value);
});
unsubscribe();
globalStateManager.resetState();
```

`updateState()` accepts an updater function. `batchUpdate()` applies multiple path/value pairs. `window.globalStateManager` is provided as a debugging compatibility global.

For React consumers, prefer the hook when possible:

```tsx
import { useGlobalStatePath } from '@react-wrapper';

const [filters, setFilters] = useGlobalStatePath('dashboard.filters', {});
```

This singleton is an explicit application-wide boundary. Give each application
or tenant its own state paths and reset it when an SPA session changes.

## Enhanced provider

`EnhancedStateProvider` and `useFilamentState` remain available for older
applications and advanced integrations. They are not required for ordinary
React components. The provider keeps its manager stable across parent renders,
and its setter accepts functional updates like React's setter:

```tsx
import { EnhancedStateProvider, useFilamentState } from '@react-wrapper';

function Form() {
  const [email, setEmail] = useFilamentState('form.email', '');
  return <input value={email} onChange={event => setEmail(event.target.value)} />;
}

const config = { strategy: 'context', persistence: true, devtools: true } as const;
<EnhancedStateProvider config={config}><Form /></EnhancedStateProvider>;
```

`StateManagerFactory.create()` supports `context` and optional `zustand` strategies. If Zustand is unavailable, the factory falls back to context. `useEnhancedStatePath()` is the lower-level hook when an undefined initial value is meaningful.

## Persistence

```tsx
import { usePersistedState } from '@react-wrapper';

const [theme, setTheme] = usePersistedState('theme', 'light', {
  storage: 'localStorage',
  namespace: 'my-app:preferences',
  debounceMs: 300,
});
```

`StatePersistenceService` supports local/session storage, memory mode (`none`),
debouncing, custom serializers/deserializers, `flush()`, `remove()`, `clear()`,
and optional `window.workflowDataSync` integration. Physical keys are
namespaced by default. Multiple components may share a logical key safely;
updates are propagated to registered consumers and unregistration is reference
counted. `clear()` removes only keys registered with that service and never
clears the whole origin's storage. Do not persist secrets or untrusted HTML.

The practical ownership rule is:

- local UI state: normal React state;
- state shared below one tree: `StateManagerProvider`;
- state shared by independent roots: `useGlobalStatePath` or the application's own external store;
- user preferences: explicit `usePersistedState` with a stable namespace;
- server-authoritative data: Livewire or the application's API.

## Shared helpers

The package centralizes immutable nested-path operations in `resources/js/utils/state.ts`: `getNestedValue`, `setNestedValue`, `notifySubscribers`, and `isStateRecord`. They are internal building blocks and are covered by the JavaScript test suite.
