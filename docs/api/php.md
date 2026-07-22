# PHP API

## Service provider

`HadyFayed\ReactWrapper\ReactWrapperServiceProvider` is auto-discovered by Laravel. It registers the registry, asset manager, variable sharing, Filament integration, factory, middleware, directives, and package commands.

No Filament panel plugin is required.

## ReactField

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

- `component(string $name): static`
- `props(array $props): static`
- `height(int $height): static`
- `resizable(bool $enabled = true): static`
- `fullscreen(bool $enabled = true): static`
- `toolbar(array $toolbar): static`
- `lazy(bool $enabled = true): static`
- `reactive(bool $enabled = true): static`
- `validationRules(array $rules): static`
- `dependencies(array $dependencies): static`
- `getComponentName(): string`, `getComponentProps(): array`, `getContainerId(): string`, and `getHeight(): int`

## ReactWidget

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('DashboardChart')
    ->props(['period' => 'month'])
    ->height(320)
    ->polling('10s')
    ->reactive()
    ->dependencies(['charts']);
```

Public methods include `component`, `withComponent`, `props`, `height`, `polling`, `reactive`, `dependencies`, `filters`, and `theme`. Subclasses can override `getData(): array`. `generateWidgetScript()` is available for view integration and emits JSON-safe identifiers and props.

## Blade directives

```blade
@react('UserCard', ['name' => $user->name])
@reactComponent('UserCard', ['name' => $user->name], ['state_path' => 'profile'])
<div @reactProps(['name' => $user->name])></div>
<div @reactConfig(['lazy' => true])></div>
```

`@react` and `@reactComponent` render a container through `ReactComponentFactory::render()`. Dynamic values in custom scripts must use `@js(...)` or `Js::from(...)`, not raw Blade interpolation.

## ReactComponentFactory

```php
use HadyFayed\ReactWrapper\Factories\ReactComponentFactory;

$factory = app(ReactComponentFactory::class);

$html = $factory->render('UserCard', ['name' => 'Ada'], [
    'container_id' => 'user-card',
    'state_path' => 'profile',
]);
```

`render()` returns a `<div>` with `id`, `data-react-component`, `data-react-props`, and an optional `data-react-state-path`. Attributes are HTML escaped and props use JSON hex escaping.

`create()` and its `createMany()`, `createLazy()`, and `createCached()` helpers are a separate class-based API. They require a PHP registry entry whose component class implements `ReactComponentInterface`.

## ReactComponentRegistry

```php
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

$registry = app(ReactComponentRegistry::class);
$registry->register('UserCard', 'UserCard', [
    'defaultProps' => ['role' => 'Member'],
    'lazy' => true,
]);

$registry->registerMany([
    'Summary',
    'Chart' => ['component' => 'Chart', 'config' => ['lazy' => false]],
]);
```

Methods are `register`, `get`, `has`, `all`, `count`, `unregister`, `registerMany`, `addHook`, `executeHooks`, `registerExtension`, and `getExtensions`.

## Artisan commands

```bash
php artisan filament-react:install [--demo] [--zustand] [--force]
php artisan filament-react:component Name [--type=field|widget] [--force]
php artisan react-wrapper:integration-report [--format=table|json|markdown]
```

The installer publishes source and configuration but does not require a package-specific Vite or Filament plugin.
