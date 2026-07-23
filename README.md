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

## Core field contract

React fields are ordinary controlled React inputs. Filament supplies `value`
and `errors`; the component calls `onChange(nextValue)` (or
`useReactField().setValue(nextValue)`). It never needs to know about Livewire:

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export default function RichTextInput(props: ReactFieldProps<string>) {
    const { value, setValue, errors } = useReactField(props);

    return (
        <>
            <textarea value={value ?? ''} onChange={event => setValue(event.target.value)} />
            {errors.map(error => <p key={error}>{error}</p>)}
        </>
    );
}
```

`ReactField::make('content')->component('RichTextInput')` is deferred by
default: every edit updates Livewire's client state without a request, so the
next submit cannot lose the value. Add `->reactive()` or `->live()` for a
debounced server commit, and `->debounce(500)` to choose the delay.

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

The Composer prebuilt runtime bundles React 18.3.x and React DOM 18.3.x privately. If the application has React 17, 18, or 19 installed, that does not cause a conflict as long as the application only consumes the prebuilt runtime and does not pass application-built React components into it. The runtime marks its mode and React version on `window`; if both runtime modes are loaded, the second one refuses to initialize and logs the conflict.

When developing application-owned components with `--dev`, the package source uses the application’s own `react` and `react-dom`. The installer preserves versions already declared in `package.json`; if they are missing, it installs the tested React 18.3.x baseline. Keep `react` and `react-dom` on the same major version. React 18 and React 19 are tested in CI.

Do not load the prebuilt runtime and the Vite runtime at the same time. `--dev` sets `REACT_WRAPPER_ASSET_MODE=vite` to prevent duplicate React copies and invalid-hook-call errors. The adapter synchronizes server state after Livewire's `morphed` hook, so it does not retain one `$watch()` subscription per container.

## Quick start

After running `filament-react:install --dev`, register a component in the
application's Laravel Vite entrypoint (normally `resources/js/app.js`; use the
existing `.ts`/`.tsx` entrypoint if the application already has one):

```js
// resources/js/app.js
import './bootstrap-react';
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
    data-react-props='@js(['name' => $user->name])'
></div>
```

When using `--dev`, build the normal application assets:

```bash
npm run dev       # development
npm run build     # production
```

The application needs `@vitejs/plugin-react` for JSX/TSX compilation and `laravel-vite-plugin` if it uses Laravel’s standard Vite integration. Those are application build dependencies, not a package-specific Vite integration.

For a manual DOM mount instead of `@react`, use `data-react-component` and `data-react-props` as shown above. Use `@js()` for a JSON data attribute and `Js::from()` inside a JavaScript block; do not interpolate raw Blade values into script source.

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
    ->lazy();

// Optional live server updates, debounced by 500 ms:
ReactField::make('live_content')
    ->component('RichEditor')
    ->reactive()
    ->debounce(500);
```

### React widget

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('DashboardChart')
    ->props(['period' => 'month'])
    ->height(320)
    ->polling('10s');
```

For server-side data, subclass `ReactWidget` and return the data from
`getData()`. Polling calls the Livewire `refresh()` method; the adapter then
updates the React component's `data` prop after the server response:

```php
final class SalesChartWidget extends ReactWidget
{
    public function __construct()
    {
        parent::__construct();
        $this->withComponent('SalesChart')->polling('10s');
    }

    public function getData(): array
    {
        return [
            'labels' => ['Jan', 'Feb', 'Mar'],
            'values' => [120, 180, 145],
        ];
    }
}
```

The corresponding React component receives ordinary props and does not need
to call Livewire:

```tsx
type SalesChartProps = {
    data?: { labels?: string[]; values?: number[] };
    period?: string;
};

export default function SalesChart({ data = {}, period }: SalesChartProps) {
    return (
        <div>
            <strong>{period ?? 'all time'}</strong>
            <pre>{JSON.stringify(data.values ?? [], null, 2)}</pre>
        </div>
    );
}
```

### React in a custom Filament Page

Custom Filament Pages are Livewire components, so the runtime can mount a
React island in their Blade view. Use a stable container ID and an explicit
state path when the island controls a Page property. The generic island
receives value and onDataChange; ReactField is not required. In development
mode, import ./bootstrap-react from the application Vite entrypoint.

See the complete Page PHP, Blade, and TSX example in docs/api/php.md.

```blade
<x-filament-panels::page>
    <div
        id="react-dashboard-page"
        data-react-component="DashboardPage"
        data-react-props='@js(["value" => $filters])'
        data-react-state-path="filters"
        data-react-reactive="true"
        data-react-debounce="300"
        wire:ignore
    ></div>
</x-filament-panels::page>
```

The generic component receives value and onDataChange. The adapter synchronizes
the explicit state path with the Page's nearest Livewire component; use
use$wire or useFilamentBridge for page actions.

### A real React input connected to Filament

Create the field in the Filament form schema and give it the name of the
Livewire state property. The package derives the complete state path from the
schema (for example, `data.content`), so you do not need to call Livewire from
the React component:

```php
ReactField::make('content')
    ->label('Content')
    ->component('RichTextInput')
    ->required();
```

Register `RichTextInput` in the application entrypoint and implement it as a
normal controlled React input:

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export default function RichTextInput(props: ReactFieldProps<string>) {
    const { value, setValue, errors, disabled, required } = useReactField(props);

    return (
        <div>
            <textarea
                id={props.fieldId}
                value={value ?? ''}
                disabled={disabled}
                required={required}
                onChange={event => setValue(event.target.value)}
            />

            {errors.map(error => <p key={error}>{error}</p>)}
        </div>
    );
}
```

The value flow is:

```text
ReactField::make('content')
  -> data-react-state-path="data.content"
  -> React calls setValue(nextValue)
  -> adapter resolves the nearest wire:id
  -> $wire.$set('data.content', nextValue, false)
  -> Filament/Livewire can validate and rerender
  -> Livewire's morphed hook reads the server value with $wire.get()
```

`->reactive()` does not change the deferred client update; it schedules one
debounced `$wire.$commit()` after the last edit. This keeps Filament's default
deferred behavior while making live fields predictable and avoiding a request
per keystroke.

Keep the input controlled: render the current `value` and call `setValue` (or
`onChange`) for every user edit. Do not copy the initial value into separate
React state unless the component intentionally implements a separate draft.
`errors` contains Filament/PHP validation errors after a server render; a
component may also send local messages with the documented validation events.

For a subclass, call `$this->withComponent('DashboardChart')` in its constructor or configure it through `ReactWidget::component()`. Widget data is supplied by overriding `getData()`.

Both integrations keep the React DOM under `wire:ignore`. For a field, the
runtime reads Filament’s full state path (for example `data.content`), finds
the nearest Livewire `wire:id`, calls `$wire.$set(path, value, false)`, and uses
Livewire's `morphed` hook to read server-to-React updates with `$wire.get(path)`.
This also applies to
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

Use the package state helpers only when the state intentionally crosses a
React integration boundary. For ordinary UI state, use React's own hooks:

```tsx
import { EnhancedStateProvider, useFilamentState } from '@react-wrapper';

function Counter() {
  const [count, setCount] = useFilamentState('counter', 0);
  return <button onClick={() => setCount(value => value + 1)}>{count}</button>;
}

export function App() {
  return (
    <EnhancedStateProvider config={{ strategy: 'context', persistence: false, devtools: false }}>
      <Counter />
    </EnhancedStateProvider>
  );
}
```

`useFilamentState()` shares values below the nearest
`EnhancedStateProvider`; it stays in React and does not replace Livewire's
server-authoritative form state. Reusable components should normally receive
state through props and callbacks instead of depending on this provider.

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
same functional-update ergonomics as React. Generic `@react` islands can use
`onDataChange` when they intentionally expose their own callback contract;
Filament fields use the controlled `value`/`onChange` contract above.

React components can report client-side validation without knowing about
Livewire:

```tsx
container.dispatchEvent(new CustomEvent('react-validation-error', {
  detail: { errors: ['The value is invalid'] },
  bubbles: true,
}));

container.dispatchEvent(new CustomEvent('react-validation-clear', { bubbles: true }));
```

The adapter feeds those messages back through the controlled `errors` prop and
`useReactField().errors`. They are client-side React errors; they are not
inserted into Filament's server error bag because Livewire 3 and 4 do not
provide one stable public client API for mutating that bag. Filament/PHP
validation remains the source of truth when the form is validated or saved,
and server-provided errors replace the React-local errors on the next render.

Use normal React state for local data, `useFilamentState` for deliberately
shared React state below an `EnhancedStateProvider`, and `usePersistedState`
for explicitly browser-persisted preferences. See [state management](docs/state-management.md)
for provider scope, storage options, debouncing, and persistence ownership.

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

The main sections are `registry`, `assets`, `vite`, `integrations.filament`, `extensions`, and `share_routes`. Browser diagnostics are controlled by the `devTools` API or the `?react-wrapper-debug=true` query parameter; they are not a package configuration section. The `vite` section describes the application’s dev server/manifest discovery; it is not a package plugin.

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

- A custom component requires `--dev`, an app entrypoint import, and a matching `defineComponents({ ComponentName })` entry.
- An alias error means `@react-wrapper` is missing or points to the wrong published source directory.
- A stale prebuilt asset is fixed with `php artisan filament-react:assets --force`.
- Fields are deferred by default; use `->reactive()`/`->live()` plus `->debounce()` only when server-side updates are needed while editing.
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
