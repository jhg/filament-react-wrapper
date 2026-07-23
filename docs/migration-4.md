# Migrating from 3.x to 4.0

Upgrading from 3.x should be straightforward: update custom fields first,
make server-live fields explicit, and then remove the retired APIs.

Use this order:

1. Search the application for the removed APIs listed below.
2. Update `ReactField` components to the controlled `value`/`onChange` contract.
3. Decide which fields need server updates while editing and add `->reactive()`
   or `->live()` where needed.
4. Update the Composer constraint, refresh the runtime, and run the application
   checks.

## 1. Update the React field contract

For a `ReactField`, replace `initialData` with `value` and
`onDataChange` with `onChange`:

```diff
-export function RichEditor({ initialData, onDataChange }) {
-    return <textarea value={initialData ?? ''}
-        onChange={event => onDataChange(event.target.value)} />;
+export function RichEditor({ value, onChange }) {
+    return <textarea value={value ?? ''}
+        onChange={event => onChange(event.target.value)} />;
+}
```

The preferred shared-component API is still:

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export default function RichEditor(props: ReactFieldProps<string>) {
    const { value, setValue, errors } = useReactField(props);
    return (
        <>
            <textarea value={value ?? ''} onChange={event => setValue(event.target.value)} />
            {errors.map(error => <p key={error}>{error}</p>)}
        </>
    );
}
```

This rename only affects the `ReactField` contract. Generic React islands may
continue using an `onDataChange` prop of their own.

## 2. Opt into live server updates

React field edits are deferred by default. Each edit updates Livewire's
client-side state with `$wire.$set(path, value, false)` without a network
request. The latest value is sent with the next Livewire request, including
form submission. `->reactive()` and `->live()` opt into one debounced server
commit after the last edit; the default is 300 ms.

If a field must trigger server-side reactions while the user edits it, opt in
explicitly:

```php
ReactField::make('content')
    ->component('RichEditor')
    ->reactive()
    ->debounce(300);
```

Use `->debounce(500)` (or another delay) when the server-side reaction should
wait longer. Remove `->reactive()`/`->live()` when the field only needs to
submit its final value. The controlled React `value` stays current in both
modes.

## 3. Replace the legacy StateManager

The old `StateManager` and `StateManagerService` APIs were removed. Replace
these imports and providers:

Prefer `useState()` or `useReducer()` inside one component. Use
`EnhancedStateProvider` and `useFilamentState()` only when several React
components need to share package-managed state.

| 3.x API | 4.0 replacement |
| --- | --- |
| `StateManagerProvider` | ordinary React state, or `EnhancedStateProvider` when sharing is intentional |
| `useStatePath()` | `useState()` for local state, or `useFilamentState()` below an `EnhancedStateProvider` |
| `useGlobalStatePath()` | the application's external store, or props/callbacks between components |
| `useStateManager()` | `useState()` / `useReducer()` or `useEnhancedStateManager()` inside the provider |

`EnhancedStateManager`, `EnhancedStateProvider`, `useFilamentState`,
`useEnhancedStateManager`, `StateManagerFactory`, and `usePersistedState` are
still supported. `usePersistedState` uses `localStorage` by default and can be
configured to use `sessionStorage`; it does not write to the Laravel session
or database. See [state management](state-management.md).

## 4. Replace removed services

The following JavaScript services are no longer exported:

| Removed 3.x API | 4.0 replacement |
| --- | --- |
| `codeSplittingService` | `registerLazyComponent()` with a dynamic import and normal React `lazy`/`Suspense` composition |
| `componentVersioningService` | application-owned component versions, aliases, and migrations |
The unused PHP extension layer was also removed. Replace
`ExtensionManager`, `BaseReactExtension`, and `CacheExtension` with application
services or normal Laravel bootstrapping.

The following JavaScript services are no longer exported:

Remove imports such as:

```diff
-import { codeSplittingService, componentVersioningService } from '@react-wrapper';
+import { registerLazyComponent } from '@react-wrapper';
```

```ts
registerLazyComponent('AdvancedChart', () => import('./components/AdvancedChart'));
```

PHP registry consumers must remove calls to `addHook()`, `executeHooks()`,
`registerExtension()`, and `getExtensions()`; the registry now only registers
and resolves components. Remove `extensions.auto_boot` from published
configuration and review the remaining options.

## 5. Upgrade the Composer package and assets

Update the Composer constraint and refresh the published runtime when the 4.0
tag is available:

```bash
composer require hadyfayed/filament-react-wrapper:^4.0 --update-with-dependencies
php artisan filament-react:assets --force
```

Do not install this package through NPM; Node is only used internally to build
the bundled runtime. The Composer hook normally refreshes the prebuilt runtime
automatically. Run the asset command manually when upgrading an existing
deployment or when the hook is disabled.

## 6. Find old APIs before deploying

Run these searches in the application repository and resolve every match that
belongs to application code:

```bash
rg -n "initialData|onDataChange|StateManagerService|StateManagerProvider|useStatePath|useGlobalStatePath|useStateManager|codeSplittingService|componentVersioningService|ExtensionManager|BaseReactExtension|CacheExtension|ReactExtensionInterface|addHook|executeHooks|registerExtension|getExtensions|extensions\.auto_boot"
```

Review every match rather than replacing all of them blindly: `onDataChange`
may still be a valid prop on a generic React island. Before deploying, submit
each custom React field, verify server-side validation, and test any field that
controls the visibility or state of another Filament field.
