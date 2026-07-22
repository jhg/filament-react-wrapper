# State management

The package offers a path-based React state manager, a global manager for non-React code, persistence, and an optional enhanced provider.

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

`globalStateManager` has the same path operations for integrations outside React:

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

## Enhanced provider

For persistence-aware state managers, use `EnhancedStateProvider` and `useFilamentState`:

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
  debounceMs: 300,
});
```

`StatePersistenceService` supports local/session storage, memory mode (`none`), debouncing, custom serializers/deserializers, `flush()`, `remove()`, `clear()`, and optional `window.workflowDataSync` integration. Do not persist secrets or untrusted HTML in browser storage.

## Shared helpers

The package centralizes immutable nested-path operations in `resources/js/utils/state.ts`: `getNestedValue`, `setNestedValue`, `notifySubscribers`, and `isStateRecord`. They are internal building blocks and are covered by the JavaScript test suite.
