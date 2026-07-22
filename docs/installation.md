# Installation

## Requirements

- PHP 8.2+
- Laravel 11, 12, or 13
- Filament 3, 4, or 5
- Livewire 3 or 4, matching the Filament release
- Node.js 20+ and npm
- React and React DOM 18+

The tested combinations are listed in [.github/workflows/ci.yml](../.github/workflows/ci.yml). The matrix includes PHP 8.4 and PHP 8.5.

## Install

```bash
composer require hadyfayed/filament-react-wrapper
php artisan filament-react:install
```

The installer installs React runtime dependencies, publishes the package source and bootstrap entrypoint, publishes configuration/views, and adds the `@react-wrapper` alias when it creates Vite configuration. Existing `vite.config.js` and `tsconfig.json` files are preserved unless `--force` is used.

Useful options:

```bash
php artisan filament-react:install --demo
php artisan filament-react:install --zustand
php artisan filament-react:install --force
```

You can publish pieces separately:

```bash
php artisan vendor:publish --tag=react-wrapper-config
php artisan vendor:publish --tag=react-wrapper-assets
php artisan vendor:publish --tag=react-wrapper-bootstrap
php artisan vendor:publish --tag=react-wrapper-views
```

## Vite setup

The package has no custom Vite plugin. Your application uses its normal Laravel Vite setup and the standard React plugin. The generated bootstrap imports the published package through an alias:

```tsx
// resources/js/bootstrap-react.tsx
import '@react-wrapper';
```

If you already have `vite.config.js`, add the alias without replacing your existing plugins:

```js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [laravel({ input: ['resources/js/app.tsx'] }), react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
            '@react-wrapper': resolve(__dirname, 'resources/js/react-wrapper'),
        },
    },
});
```

Load the bootstrap from the application entrypoint:

```tsx
// resources/js/app.tsx
import './bootstrap-react';
```

Then run:

```bash
npm run dev
# or
npm run build
```

`@vitejs/plugin-react` and `laravel-vite-plugin` are application build dependencies. They are not a Filament panel plugin or a package-specific integration.

## Filament integration

Laravel package discovery registers the service provider automatically. No panel plugin, manual render hook, or extra Filament provider registration is required.

Create a field:

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

ReactField::make('content')
    ->component('RichEditor')
    ->props(['placeholder' => 'Write here'])
    ->height(420)
    ->reactive();
```

Create a widget:

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('SalesChart')
    ->props(['period' => 'month'])
    ->height(320)
    ->polling('10s');
```

## Configuration and views

Publish configuration and edit `config/react-wrapper.php` only when defaults are not enough:

```bash
php artisan vendor:publish --tag=react-wrapper-config
```

To customize markup, publish the views:

```bash
php artisan vendor:publish --tag=react-wrapper-views
```

Published files live under `resources/views/vendor/react-wrapper/` and take precedence over package views.

## Verify

Register a component:

```tsx
// resources/js/components/Hello.tsx
export default function Hello({ name = 'Laravel' }: { name?: string }) {
    return <p>Hello, {name}!</p>;
}
```

```tsx
// resources/js/app.tsx
import '@react-wrapper';
import { registerComponent } from '@react-wrapper';
import Hello from './components/Hello';

registerComponent('Hello', Hello);
```

Render it:

```blade
@react('Hello', ['name' => 'Filament'])
```

Build the assets and load the page. For an explicit DOM mount, use a `data-react-component` container and a `data-react-props` value produced with `Js::from()`.

## Troubleshooting

- Component missing: confirm the app entrypoint imports `@react-wrapper` and registers the exact component name.
- Alias error: confirm `@react-wrapper` points to `resources/js/react-wrapper` and the published source exists.
- Stale assets: run `php artisan optimize:clear` and rebuild with `npm run build`.
- Filament markup override not applied: confirm it is under `resources/views/vendor/react-wrapper/`.
- Reactive field not updating: confirm the field is `->reactive()` and inspect the browser event `react-data-changed`.
- Bridge fallback failing: configure Livewire component binding when available; otherwise configure the HTTP endpoint and CSRF/authentication policy explicitly.
