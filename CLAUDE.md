# CLAUDE.md

## Project overview

This repository is a Composer-first Laravel package that mounts React
components in Filament fields, Filament widgets, and ordinary Blade pages.
The PHP package owns installation and runtime delivery; `package.json` is a
private JavaScript build/test toolchain and is never published to NPM.

The supported user-facing path is:

1. `ReactField` and `ReactWidget` for native Filament integration.
2. `@react` or `@reactComponent` for Blade islands.
3. `defineComponents` from the application alias `@react-wrapper`.
4. The prebuilt Composer runtime in production, or the application’s Vite
   server in `--dev` mode.

## Important architecture

### JavaScript (`resources/js`)

- `index.tsx`: public exports and bootstrap.
- `components/SimpleRegistration.tsx`: convenient blessed registration API,
  including `defineComponents`.
- `components/ReactComponentRegistry.tsx`: registry used internally by the
  renderer and retained as the lower-level compatibility API.
- `components/UniversalReactRenderer.tsx`: renders registry components from
  DOM metadata and adapts controlled field props.
- `components/adapters/FilamentReactAdapter.tsx`: MutationObserver-based
  mounting and the React ↔ Livewire bridge. It resolves the nearest `wire:id`,
  uses `$wire.$set`/`set`, and subscribes with `$wire.$watch`.
- `components/EnhancedStateManager.tsx`: owns `useFilamentState` and is used
  by generated stubs. Do not remove it.
- `components/StateManager.tsx`: older general-purpose state API. Keep for
  compatibility, but document new examples with the React-native state APIs or
  `EnhancedStateManager` where Filament synchronization is needed.
- `Middleware/ReactWrapperMiddleware.php` (PHP): injects the runtime into HTML
  Blade responses outside Filament panels. It remains necessary until runtime
  delivery is replaced by a dedicated Blade directive.

### PHP (`src`)

- `ReactWrapperServiceProvider.php`: package registration and Filament asset
  registration.
- `Forms/Components/ReactField.php`: controlled Filament form field.
- `Widgets/ReactWidget.php`: Filament widget with optional polling.
- `Blade/ReactDirective.php`: `@react`, `@reactComponent`, `@reactProps`, and
  `@reactConfig`; it delegates rendering to `ReactComponentFactory`.
- `Factories/ReactComponentFactory.php`: performs the HTML/JSON escaping for
  Blade-created React islands. Treat it as security-sensitive code.
- `Middleware/ReactWrapperMiddleware.php`: runtime injection for non-Filament
  Blade pages.

## Local commands

```bash
npm ci
npm run typecheck
npm run lint:check
npm run format:check
npm run test
npm run build:all

composer install
vendor/bin/phpunit
```

The build is internal. `build:all` generates the runtime consumed by the
Composer package; it does not create a publishable NPM package.

## Publishing and aliases

The package is Composer-first. The application alias used by generated Vite
projects is:

```ts
import { defineComponents } from '@react-wrapper';

defineComponents({ UserCard });
```

Valid vendor tags are:

```bash
php artisan vendor:publish --tag=react-wrapper-config
php artisan vendor:publish --tag=react-wrapper-assets
php artisan vendor:publish --tag=react-wrapper-views
php artisan vendor:publish --tag=react-wrapper-bootstrap
php artisan vendor:publish --tag=react-wrapper-prebuilt
php artisan vendor:publish --tag=react-wrapper
```

The `react-wrapper` tag is retained for legacy applications. New installs
normally only need `php artisan filament-react:install` and
`php artisan filament-react:assets --force`.

## Registration examples

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

ReactField::make('content')
    ->component('RichEditor')
    ->reactive();
```

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('SalesChart')->polling('10s');
```

```blade
@react('UserCard', ['userId' => $user->id])
```

## Testing and changes

The CI tests frontend tooling and PHP framework combinations independently.
When changing the field/widget bridge, update both the adapter tests and the
Blade/PHP assertions. Do not reintroduce `livewire:update`; Livewire 3 uses
component `$watch` and lifecycle hooks rather than that synthetic event.

Keep the generated `resources/vendor/react-wrapper.js` synchronized with the
source whenever the runtime changes. It is a deliberate Composer-first asset.
