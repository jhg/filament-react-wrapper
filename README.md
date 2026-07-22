# Filament React Wrapper

React components inside Laravel and Filament, with a small Composer package and a published TypeScript source tree. The package does not register a Filament panel plugin and does not ship a custom Vite plugin: it uses the application’s normal Laravel/Vite pipeline.

## Requirements

- PHP 8.2+
- Laravel 11, 12, or 13
- Filament 3, 4, or 5
- Livewire 3 or 4, according to the Filament version
- Node.js 20+ for the Vite 7 toolchain
- React and React DOM 18+

The supported combinations are tested explicitly in [CI](.github/workflows/ci.yml); the matrix includes PHP 8.4 and PHP 8.5.

## Installation

```bash
composer require hadyfayed/filament-react-wrapper
php artisan filament-react:install
npm run dev
```

The installer publishes:

- `config/react-wrapper.php`
- `resources/js/react-wrapper/` with the package source
- `resources/js/bootstrap-react.tsx`
- optional published Blade view overrides

It never overwrites an existing `vite.config.js` or `tsconfig.json` unless `--force` is supplied. If an application already has a Vite setup, add the `@react-wrapper` alias shown in [the installation guide](docs/installation.md).

The installer accepts `--demo`, `--zustand`, and `--force`. The generated component command is:

```bash
php artisan filament-react:component UserCard
```

## Quick start

Register a component in the application entrypoint:

```tsx
// resources/js/app.tsx
import '@react-wrapper';
import { registerComponent } from '@react-wrapper';
import UserCard from './components/UserCard';

registerComponent('UserCard', UserCard, {
  defaultProps: { role: 'Member' },
  metadata: { category: 'users', tags: ['profile'] },
});
```

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

Build the normal application assets:

```bash
npm run dev       # development
npm run build     # production
```

The application needs `@vitejs/plugin-react` for JSX/TSX compilation and `laravel-vite-plugin` if it uses Laravel’s standard Vite integration. Those are application build dependencies, not a package-specific Vite integration.

## Filament fields and widgets

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

Both integrations keep the React DOM under `wire:ignore`, dispatch `react-data-changed` for reactive updates, and use Livewire’s current component when a component id is configured. The bridge falls back to HTTP only when no Livewire handle is available; configure the endpoint and CSRF policy before using that fallback in a production application.

## State management

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

Available state APIs include `useStateManager`, `useStatePath`, `globalStateManager`, `usePersistedState`, `StateManagerFactory`, and the lower-level `StateManagerService` classes. See [state management](docs/state-management.md).

## Component registry and advanced services

The public entrypoint exports:

- `registerComponent`, `registerComponents`, `getComponent`, `listComponents`, and `componentRegistry`
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

- [Documentation index](docs/README.md)
- [Installation](docs/installation.md)
- [Quick start](docs/quick-start.md)
- [PHP API](docs/api/php.md)
- [TypeScript API](docs/api/typescript.md)
- [Configuration reference](docs/api/config.md)
- [Testing guide](docs/testing.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT. See [LICENSE.md](LICENSE.md).
