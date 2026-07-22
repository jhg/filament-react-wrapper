# State management

React owns component-local state by default. Use the package helpers only at
explicit integration boundaries: Filament-aware shared React state and browser
persistence.

## Filament-aware shared state

`EnhancedStateProvider` and `useFilamentState` share state below one React
tree. This is still client-side React state; Livewire remains the authority for
the form's server state.

```tsx
import { EnhancedStateProvider, useFilamentState } from '@react-wrapper';

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

The provider keeps the manager stable across parent renders, and setters accept
functional updates. `useEnhancedStatePath()` is the lower-level hook when an
undefined initial value is meaningful.

`StateManagerFactory.create()` supports the current `context` strategy and an
optional `zustand` strategy. If Zustand is unavailable, it falls back to
context. Generated component stubs use `useFilamentState`; keep that API in
shared components that use the generated contract.

## Persistence

```tsx
import { usePersistedState } from '@react-wrapper';

const [theme, setTheme] = usePersistedState('theme', 'light', {
  storage: 'localStorage',
  namespace: 'my-app:preferences',
  debounceMs: 300,
});
```

`usePersistedState` stores serialized values in browser storage. The default
physical key is namespaced (`react-wrapper:theme`); this is `localStorage`
owned by the browser, not Laravel session state, a database, or a secure store.
Use `sessionStorage` for tab/session lifetime or `none` for memory-only state.
`syncWithLivewire` optionally mirrors changes through
`window.workflowDataSync`; it does not move primary persistence to Livewire.

`StatePersistenceService` also supports custom serializers/deserializers,
debouncing, `flush()`, `remove()`, and `clear()`. Multiple consumers can share
a logical key safely. Do not persist secrets or untrusted HTML.

## Choosing the boundary

- local UI state: normal React `useState`/`useReducer`;
- state shared below one React tree: `EnhancedStateProvider` and `useFilamentState`;
- user preferences: `usePersistedState` with an explicit stable namespace;
- server-authoritative data and Filament form state: Livewire and the field bridge;
- state shared by independent React roots: use the application's external store.

Reusable components should prefer props and callbacks so they remain portable.
The package does not expose the removed singleton/global state manager.

## Shared helpers

The immutable nested-path helpers in `resources/js/utils/state.ts` are internal
building blocks used by the current enhanced state manager and covered by the
JavaScript test suite.
