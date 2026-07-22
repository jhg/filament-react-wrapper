# Documentation

Use the guides in this order if you are new to the package:

1. [README installation and quick start](../README.md)
2. [Component registry](component-registry.md)
3. [Filament fields and widgets](../README.md#filament-fields-and-widgets)

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

The Composer package owns the Laravel, Blade, Filament, Livewire, registry, asset, and state-integration pieces. Its default installation includes a self-contained prebuilt JavaScript runtime and registers it with Filament’s asset manager. The application does not need Node or NPM unless it develops application-owned React components.

There is no package-specific Filament panel plugin and no custom Vite plugin. The optional `--dev` workflow publishes the TypeScript source and uses the application’s standard `laravel-vite-plugin` and `@vitejs/plugin-react`.

## Compatibility

GitHub Actions resolves explicit valid combinations rather than a Cartesian product. The current matrix covers Filament 3/4 with Livewire 3, Filament 5 with Livewire 4, Laravel 11/12/13, Node 20/22/24, and PHP 8.2–8.5. See [.github/workflows/ci.yml](../.github/workflows/ci.yml).

## External references

- [Laravel](https://laravel.com/docs)
- [Filament](https://filamentphp.com/docs)
- [Livewire](https://livewire.laravel.com/docs)
- [React](https://react.dev/)
