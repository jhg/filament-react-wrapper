# Configuration reference

The published file is `config/react-wrapper.php`:

```bash
php artisan vendor:publish --tag=react-wrapper-config
```

The important sections are:

- `debug`: browser/runtime diagnostics.
- `registry`: auto-discovery paths, patterns, caching, and registration behavior.
- `assets`: prebuilt-vs-Vite mode, Filament asset publication, and lazy-loading behavior.
- `vite`: dev-server URL and manifest paths used by Laravel asset detection.
- `integrations.filament`: enable or disable the package’s Filament integration.
- `state`: defaults for state sharing and persistence.
- `extensions`: extension auto-boot behavior.
- `security`: allowed origins/tokens and bridge-related safeguards.

Prefer environment variables for deployment-specific values. Keep debug output disabled in production and do not expose sensitive server data as React props.

The default `assets.mode` is `prebuilt`. Set `REACT_WRAPPER_ASSET_MODE=vite` only when the application has published the TypeScript source and owns the Vite build, normally through `php artisan filament-react:install --dev`.

The package does not require a panel plugin. If the application publishes view overrides, Laravel loads them from `resources/views/vendor/react-wrapper/`; otherwise the package views are used.
