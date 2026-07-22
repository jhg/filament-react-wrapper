# PHP API

## Installation model

`HadyFayed\ReactWrapper\ReactWrapperServiceProvider` is registered through
Laravel package discovery. It registers the PHP services, Blade directives,
Filament integration, commands, and the prebuilt JavaScript runtime.

No Filament panel plugin, NPM package, or custom Vite plugin is required for
the default installation:

```bash
composer require hadyfayed/filament-react-wrapper
php artisan filament-react:install
```

The installer publishes the runtime with Filament’s asset conventions and adds
`filament-react:assets --force` to the application’s `post-autoload-dump`
Composer scripts. Refresh it manually with:

```bash
php artisan filament-react:assets --force
```

For application-owned React components, use `php artisan
filament-react:install --dev`. This publishes the TypeScript source and
bootstrap entrypoint and switches the application to `REACT_WRAPPER_ASSET_MODE=vite`.

The prebuilt runtime contains React 18.3.x and React DOM 18.3.x privately. It
does not conflict with another application React version while it is used on
its own. Do not mix components compiled against a different React copy with
the prebuilt runtime. In `--dev` mode, React and React DOM are supplied by the
application; keep their installed major versions equal. React 18 is the
tested baseline.

The package intentionally uses a standalone service provider rather than a
panel plugin. This makes the integration available to all panels without
requiring `->plugins(...)` in each `PanelProvider`.

## ReactField

`ReactField` is a Filament form field that synchronizes its state with a React
component through Livewire.

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

ReactField::make('content')
    ->component('RichEditor')
    ->props(['toolbar' => ['bold']])
    ->height(420)
    ->lazy()
    ->reactive()
    ->resizable()
    ->fullscreen()
    ->toolbar(['bold', 'italic'])
    ->validationRules(['string', 'max:10000'])
    ->dependencies(['editor-core']);
```

Public methods:

- `component(string $componentName): static`
- `props(array $props): static`
- `height(int $height): static`
- `resizable(bool $resizable = true): static`
- `fullscreen(bool $fullscreen = true): static`
- `toolbar(array $toolbar): static`
- `lazy(bool $lazy = true): static`
- `reactive(bool $reactive = true): static`
- `validationRules(array $rules): static`
- `dependencies(array $dependencies): static`
- `getComponentName(): string`
- `getComponentProps(): array`
- `getContainerId(): string`
- `getHeight(): int`
- `getValidationRules(): array`
- `getValidationErrors(): array`
- `getAssetData(): array`
- `generateFieldScript(): string`

Filament’s `required` rule is added automatically to the returned validation
rules when the field is required.

## ReactWidget

`ReactWidget` renders a React component inside a Filament widget. Use the
static factory for an anonymous widget or subclass it when server-side data is
needed.

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('DashboardChart')
    ->props(['period' => 'month'])
    ->height(320)
    ->polling('10s')
    ->reactive()
    ->dependencies(['charts']);
```

For a subclass, configure the component in its constructor:

```php
class SalesWidget extends ReactWidget
{
    public function __construct()
    {
        parent::__construct();
        $this->withComponent('SalesChart');
    }

    public function getData(): array
    {
        return ['period' => 'month'];
    }
}
```

Public methods include:

- `withComponent(string $componentName): static`
- `props(array $props): static`
- `height(int $height): static`
- `polling(bool|int|string $interval = true): static`
- `reactive(bool $reactive = true): static`
- `dependencies(array $dependencies): static`
- `filters(array $filters): static`
- `theme(string $theme): static`
- `getComponentName(): string`
- `getComponentProps(): array`
- `getContainerId(): string`
- `getHeight(): int`
- `getData(): array`
- `getAssetData(): array`
- `generateWidgetScript(): string`
- `refresh(): void`

Override `getData()` to supply server-side widget data. The widget includes
the polling, filters, theme, current user, and column span in its React props.

## Blade directives

```blade
@react('UserCard', ['name' => $user->name])
@reactComponent('UserCard', ['name' => $user->name], ['state_path' => 'profile'])
<div @reactProps(['name' => $user->name])></div>
<div @reactConfig(['lazy' => true])></div>
```

`@react` and `@reactComponent` create a safe container through
`ReactComponentFactory::render()`. `@reactProps` and `@reactConfig` write JSON
data attributes. Use `@js(...)` or `Js::from(...)` for dynamic values inside
JavaScript blocks; do not interpolate raw Blade values into script source.

## ReactComponentFactory

Use `render()` for a JavaScript component name. The browser-side registry will
resolve that name:

```php
use HadyFayed\ReactWrapper\Factories\ReactComponentFactory;

$html = app(ReactComponentFactory::class)->render(
    'UserCard',
    ['name' => 'Ada'],
    ['container_id' => 'user-card', 'state_path' => 'profile'],
);
```

`render()` returns a `<div>` with `id`, `data-react-component`,
`data-react-props`, and optionally `data-react-state-path`. IDs and attributes
are HTML-escaped and props use JSON hex escaping.

The class-based API is separate:

```php
$component = app(ReactComponentFactory::class)->create(
    'ServerComponent',
    ['title' => 'Dashboard'],
);

$many = app(ReactComponentFactory::class)->createMany([
    'ServerComponent' => ['props' => ['title' => 'One']],
]);
```

`create()`, `createMany()`, `createLazy()`, and `createCached()` require a PHP
registry entry whose component class implements `ReactComponentInterface`.
They are not needed for ordinary JavaScript-only components rendered by Blade.

## ReactComponentRegistry

The registry stores PHP-side metadata used by the asset and integration
services. It does not replace the JavaScript registry in the application’s
Vite entrypoint.

```php
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

$registry = app(ReactComponentRegistry::class);

$registry->register('UserCard', 'UserCard', [
    'defaultProps' => ['role' => 'Member'],
    'lazy' => true,
]);

$registry->registerMany([
    'Summary',
    'Chart' => [
        'component' => 'Chart',
        'config' => ['lazy' => false],
    ],
]);
```

Available methods are `register`, `get`, `has`, `all`, `count`, `unregister`,
`registerMany`, `addHook`, `executeHooks`, `registerExtension`, and
`getExtensions`.

## AssetManager

`HadyFayed\ReactWrapper\Services\AssetManager` is available as
`app(AssetManager::class)` or the `react-wrapper.assets` alias. The default
mode is `prebuilt`; the optional development mode uses the application’s Vite
server or manifest.

Important methods include:

- `shouldUseLaravelBundle()` and `isLaravelBundleAvailable()`
- `getMainBundleUrl()` and `generateMainBundleScript()`
- `getViteManifest()`, `getAssetUrl()`, and `getEntryPointCss()`
- `registerComponentAsset()`, `getComponentAssets()`, and `queueComponent()`
- `generateLazyLoadScript()` and `generatePreloadTags()`
- `markAssetLoaded()`, `isAssetLoaded()`, `clearPendingAssets()`, and `clearCache()`

When Filament is available, the prebuilt runtime is registered as a package
asset with ID `react-wrapper` under `hadyfayed/filament-react-wrapper`.

## Artisan commands

```bash
php artisan filament-react:install [--dev] [--demo] [--zustand] [--force] [--no-auto-assets]
php artisan filament-react:assets [--force]
php artisan filament-react:component Name [--category=general] [--lazy] [--widget] [--field] [--force]
php artisan react-wrapper:integration-report [--format=table|json|markdown] [--category=...] [--min-percentage=...] [--output=...]
```

`filament-react:component` creates the TSX component under
`resources/js/components/`. `--widget` and `--field` additionally generate
Filament PHP classes. Use it in `--dev` mode.

`react-wrapper:integration-report` reports the PHP/React mappings and current
Filament integration status; it can print a table, JSON, or Markdown output.
