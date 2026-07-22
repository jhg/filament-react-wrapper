# Filament React Wrapper

React components inside Laravel and Filament. The Composer package includes a self-contained, prebuilt runtime managed by Filament’s asset system, so a separate NPM package is not required. The package does not register a Filament panel plugin and does not ship a custom Vite plugin.

## Requirements

- PHP 8.2+
- Laravel 11, 12, or 13
- Filament 3, 4, or 5
- Livewire 3 or 4, according to the Filament version
- Node.js 20+ only for the optional `--dev` workflow
- React and React DOM 18+ only for application-owned components

The supported combinations are tested explicitly in [CI](.github/workflows/ci.yml); the matrix includes PHP 8.4 and PHP 8.5.

## Installation

```bash
composer require hadyfayed/filament-react-wrapper
php artisan filament-react:install
```

The default installer is Composer-first. It publishes:

- `config/react-wrapper.php`
- the prebuilt React runtime through Filament’s asset manager
- a root Composer hook that refreshes the runtime after dependency updates

It does not require `package.json`, Node.js, NPM, Vite, or a package-specific build.

The prebuilt runtime is enough for the package integration itself. If the application defines React components such as `UserCard`, opt into the development workflow:

```bash
php artisan filament-react:install --dev
npm run dev
```

This publishes the TypeScript source and bootstrap entrypoint, installs the application build dependencies, and configures Vite/TypeScript without replacing existing files unless `--force` is supplied. It also sets `REACT_WRAPPER_ASSET_MODE=vite` so the prebuilt runtime is not loaded twice.

The installer accepts `--demo`, `--zustand`, `--force`, and `--no-auto-assets`. The generated component command is:

```bash
php artisan filament-react:component UserCard
```

The runtime can be refreshed manually with `php artisan filament-react:assets --force`. The installer adds this command to the application’s `post-autoload-dump` Composer scripts by default, so `composer install` and `composer update` refresh the published asset automatically. Use `--no-auto-assets` if the application manages Composer scripts itself.

### React version behavior

The Composer prebuilt runtime bundles React 18.3.x and React DOM 18.3.x privately. If the application has React 17, 18, or 19 installed, that does not cause a conflict as long as the application only consumes the prebuilt runtime and does not pass application-built React components into it.

When developing application-owned components with `--dev`, the package source uses the application’s own `react` and `react-dom`. The installer preserves versions already declared in `package.json`; if they are missing, it installs the tested React 18.3.x baseline. Keep `react` and `react-dom` on the same major version. React 18 and React 19 are tested in CI.

Do not load the prebuilt runtime and the Vite runtime at the same time. `--dev` sets `REACT_WRAPPER_ASSET_MODE=vite` to prevent duplicate React copies and invalid-hook-call errors.

## Quick start

After running `filament-react:install --dev`, register a component in the application entrypoint:

```tsx
// resources/js/app.tsx
import { defineComponents } from '@react-wrapper';
import UserCard from './components/UserCard';

defineComponents({ UserCard });
```

If the application already has `vite.config.js`, keep its existing plugins and add the package alias:

```js
// Merge this resolve block into the existing defineConfig() object.
import { resolve } from 'node:path';

export default defineConfig({
    // Keep the application's existing plugins and build inputs.
    resolve: {
        alias: {
            // Keep any existing aliases here.
            '@react-wrapper': resolve(__dirname, 'resources/js/react-wrapper'),
        },
    },
});
```

Make sure this entrypoint is one of the inputs compiled by Laravel Vite. The
package import starts the adapter; the published `bootstrap-react.tsx` remains
available for older applications that already import it.

Render it in Blade with the package directive:

```blade
@react('UserCard', [
    'name' => $user->name,
    'email' => $user->email,
])
```

For an explicit container, the runtime also discovers `data-react-component` elements:

```blade
<div
    data-react-component="UserCard"
    data-react-props="{{ Js::from(['name' => $user->name]) }}"
></div>
```

When using `--dev`, build the normal application assets:

```bash
npm run dev       # development
npm run build     # production
```

The application needs `@vitejs/plugin-react` for JSX/TSX compilation and `laravel-vite-plugin` if it uses Laravel’s standard Vite integration. Those are application build dependencies, not a package-specific Vite integration.

For a manual DOM mount instead of `@react`, use `data-react-component` and `data-react-props` as shown above. Always use `Js::from()` or `@js()` when placing dynamic values in JavaScript.

## Filament fields and widgets

The package is a standalone Filament integration, so no `PanelProvider`
`->plugins(...)` registration is needed. A panel plugin would add an extra
manual step and would not improve the shared runtime/asset installation.

### React field

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

ReactField::make('content')
    ->component('RichEditor')
    ->props(['toolbar' => ['bold', 'italic']])
    ->height(420)
    ->lazy()
    ->reactive();
```

### React widget

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('DashboardChart')
    ->props(['period' => 'month'])
    ->height(320)
    ->polling('10s');
```

For a subclass, call `$this->withComponent('DashboardChart')` in its constructor or configure it through `ReactWidget::component()`. Widget data is supplied by overriding `getData()`.

Both integrations keep the React DOM under `wire:ignore`. For a field, the
runtime reads Filament’s full state path (for example `data.content`), finds
the nearest Livewire `wire:id`, calls `$wire.$set(path, value)`, and watches
`$wire.$watch(path, ...)` for server-to-React updates. This also applies to
fields inserted later into modals, repeaters, wizards, and slideovers. Widget
polling uses `$wire.$call('refresh')` and updates the React `data` prop.

The separate `useFilamentBridge()` helper retains its HTTP fallback for
applications without a Livewire handle; review CSRF/authentication policy
before enabling that fallback in production.

## State management

React components do not need a package state provider. Use normal React state
for state owned by one component:

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(value => value + 1)}>{count}</button>;
}
```

Use the package state helpers only when state is intentionally shared by
several mounted components:

```tsx
import { StateManagerProvider, useStatePath } from '@react-wrapper';

function Counter() {
  const [count, setCount] = useStatePath('counter', 0);
  return <button onClick={() => setCount(value => value + 1)}>{count}</button>;
}

export function App() {
  return (
    <StateManagerProvider initialState={{ counter: 0 }}>
      <Counter />
    </StateManagerProvider>
  );
}
```

`useStatePath()` shares values between all components rendered below the same
`StateManagerProvider`; it stays entirely in React and does not go through
Livewire. It is not required by reusable components. For React roots that do
not share a provider, use `useGlobalStatePath()` or the lower-level exported
`globalStateManager` explicitly.

To persist a value between page loads:

```tsx
import { usePersistedState } from '@react-wrapper';

function Preferences() {
  const [prefs, setPrefs] = usePersistedState('user-prefs', {
    theme: 'light',
    compact: false,
  });

  return <button onClick={() => setPrefs(current => ({ ...current, compact: !current.compact }))}>
    {prefs.compact ? 'Compact' : 'Comfortable'}
  </button>;
}
```

By default, `usePersistedState()` serializes the value as JSON and stores it in
the browser's `localStorage` under a namespaced key (`react-wrapper:user-prefs`).
Pass `namespace` to isolate tenants, users, or applications. It is client-side
persistence: it survives reloads and browser restarts for the same origin, but
it is not Laravel session state, database state, or a secure store. Use
`storage: 'sessionStorage'` for tab/session lifetime or `storage: 'none'` to
disable browser storage. The optional `syncWithLivewire` configuration can
also mirror changes through the application's `window.workflowDataSync`
callback; it does not change where the primary browser persistence happens.

For a Filament form field, the preferred React contract is controlled and does
not expose Livewire concepts:

```tsx
import type { ReactFieldProps } from '@react-wrapper';

export function RichEditor({ value, onChange, errors, disabled }: ReactFieldProps<string>) {
  return (
    <>
      <textarea value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} />
      {errors?.map(error => <p key={error}>{error}</p>)}
    </>
  );
}
```

`useReactField()` is available when a shared component wants a setter with the
same functional-update ergonomics as React. Existing `initialData` and
`onDataChange` components continue to work.

For new code, use normal React state for local data, `useFilamentState` for
Filament-aware state, and `usePersistedState` for explicitly browser-persisted
preferences. `useStateManager`, `useStatePath`, and `useGlobalStatePath` remain
available for compatibility and deliberate cross-root state. See [state
management](docs/state-management.md) for provider scope, storage options,
debouncing, and persistence ownership.

## Component registry and advanced services

The public entrypoint exports:

- `defineComponents`, `registerComponent`, `registerLazyComponent`, `registerComponents`, `getComponent`, `listComponents`, and `componentRegistry`
- `mountIsland`, `autoMountIslands`, and `createComponent`
- `universalReactRenderer`
- state and persistence services
- `codeSplittingService`, `componentVersioningService`, and `devTools`
- `useFilamentBridge` and `use$wire`

The registry accepts synchronous React components and async imports. The code-splitting service resolves lazy components and can preload or invalidate them. Versioning supports aliases and migrations. These features are documented in [the component registry guide](docs/component-registry.md), [code splitting](docs/code-splitting.md), [versioning](docs/versioning.md), and [developer tools](docs/dev-tools.md).

## Configuration

Publish the configuration when needed:

```bash
php artisan vendor:publish --tag=react-wrapper-config
```

The main sections are `debug`, `registry`, `assets`, `vite`, `integrations.filament`, `state`, `extensions`, and `security`. Keep `REACT_WRAPPER_DEBUG=false` in production. The `vite` section describes the application’s dev server/manifest discovery; it is not a package plugin.

The relevant asset settings are:

```dotenv
# Default: package-owned prebuilt runtime.
REACT_WRAPPER_ASSET_MODE=prebuilt

# Set to vite when using filament-react:install --dev.
# REACT_WRAPPER_ASSET_MODE=vite
```

To customize package markup, publish only the views you need:

```bash
php artisan vendor:publish --tag=react-wrapper-views
```

Published views are loaded from `resources/views/vendor/react-wrapper/` and take precedence over the package views.

## Updating and troubleshooting

The default installer adds this root Composer script:

```json
{
    "scripts": {
        "post-autoload-dump": [
            "@php artisan filament-react:assets --force"
        ]
    }
}
```

Consequently, the prebuilt runtime is refreshed after `composer install` and `composer update`. To refresh it manually:

```bash
php artisan filament-react:assets --force
php artisan optimize:clear
```

Common checks:

- A custom component requires `--dev`, an app entrypoint import, and a matching `registerComponent()` name.
- An alias error means `@react-wrapper` is missing or points to the wrong published source directory.
- A stale prebuilt asset is fixed with `php artisan filament-react:assets --force`.
- A reactive field must use `->reactive()` and the rendered page should receive `react-data-changed` events.
- The bridge uses Livewire when available and falls back to HTTP only when configured; review CSRF/authentication policy before enabling that fallback in production.

## Testing and quality

```bash
npm ci
npm run typecheck
npm run lint:check
npm run test:coverage
vendor/bin/phpunit -c phpunit.xml.dist
composer validate --strict
```

The Vitest coverage gate includes the registry, both state managers, the renderer/Filament adapter, persistence, eventing, shared helpers, DevTools, code splitting, and versioning services. It enforces at least 60% statements, branches, functions, and lines overall. GitHub Actions tests real Node and PHP/framework combinations, including PHP 8.4 and 8.5.

## Documentation

- [Documentation index](docs/README.md) (advanced reference)
- [PHP API](docs/api/php.md)
- [TypeScript API](docs/api/typescript.md)
- [Configuration reference](docs/api/config.md)
- [Testing guide](docs/testing.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT. See [LICENSE.md](LICENSE.md).
