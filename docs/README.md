# Documentation

Use the guides in this order if you are new to the package:

1. [Installation](installation.md)
2. [Quick start](quick-start.md)
3. [Component registry](component-registry.md)
4. [Filament fields and widgets](../README.md#filament-fields-and-widgets)

Reference and feature guides:

- [PHP API](api/php.md)
- [TypeScript API](api/typescript.md)
- [Configuration](api/config.md)
- [State management](state-management.md)
- [Code splitting](code-splitting.md)
- [Component versioning](versioning.md)
- [Developer tools](dev-tools.md)
- [Testing](testing.md)

## Runtime model

The Composer package owns the Laravel, Blade, Filament, Livewire, registry, asset, and state-integration pieces. The package JavaScript is published into `resources/js/react-wrapper/` and loaded by the application’s normal Vite entrypoint through `resources/js/bootstrap-react.tsx`.

There is no package-specific Filament panel plugin and no custom Vite plugin. The application still uses its own standard `laravel-vite-plugin` and `@vitejs/plugin-react` when it needs Laravel asset compilation.

## Compatibility

GitHub Actions resolves explicit valid combinations rather than a Cartesian product. The current matrix covers Filament 3/4 with Livewire 3, Filament 5 with Livewire 4, Laravel 11/12/13, Node 20/22/24, and PHP 8.2–8.5. See [.github/workflows/ci.yml](../.github/workflows/ci.yml).

## External references

- [Laravel](https://laravel.com/docs)
- [Filament](https://filamentphp.com/docs)
- [Livewire](https://livewire.laravel.com/docs)
- [React](https://react.dev/)
