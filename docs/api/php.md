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
application; keep their installed major versions equal. React 18 and 19 are
tested in CI.

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

The registered React field receives a controlled contract: `value`,
`onChange`, `errors`, `required`, `disabled`, and the field metadata. Calling
`onChange(nextValue)` updates the Filament field state. Generic `@react` islands
may instead define an explicit
`onDataChange` callback when they need to report custom data to Livewire.
The TypeScript helpers are `ReactFieldProps<T>` and the optional
`useReactField()` hook.

The bridge uses Filament’s complete `getStatePath()` value, not only the field
name. It resolves the nearest Livewire `wire:id` and calls `$wire.$set()` on
React changes. After Livewire's `morphed` hook it reads the current value with
`$wire.get()` and updates React, so it does not retain one `$watch()`
subscription per container. Because this logic lives in the runtime
MutationObserver, fields added after initial page load are supported too.

### Complete field example

The PHP field only declares the Filament state name and the registered React
component. The React component remains a normal controlled input:

```php
ReactField::make('content')
    ->component('RichTextInput')
    ->required()
    ->reactive();
```

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export default function RichTextInput(props: ReactFieldProps<string>) {
    const { value, setValue, errors, disabled, required } = useReactField(props);

    return (
        <label>
            Content
            <textarea
                id={props.fieldId}
                value={value ?? ''}
                disabled={disabled}
                required={required}
                onChange={event => setValue(event.target.value)}
            />
            {errors.map(error => <span key={error}>{error}</span>)}
        </label>
    );
}
```

For a form whose schema state path is `data`, `ReactField::make('content')`
renders `data-react-state-path="data.content"`. The adapter finds the nearest
Livewire `wire:id` and calls `$wire.$set('data.content', nextValue)` when the
React input changes. Livewire watchers then update the controlled `value` when
Filament changes or validates the field. The component does not need to know
that Livewire exists.

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
Polling calls the widget's Livewire `refresh()` method; the runtime listens for
the resulting `widget-refreshed` event and merges the returned data into the
React component's `data` prop.

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
        return ['labels' => ['Jan', 'Feb'], 'values' => [120, 180]];
    }
}
```

The React component only consumes props:

```tsx
type SalesChartProps = {
    data?: { labels?: string[]; values?: number[] };
    period?: string;
};

export default function SalesChart({ data = {}, period }: SalesChartProps) {
    return <pre>{JSON.stringify({ period, values: data.values ?? [] })}</pre>;
}
```

## React in a custom Filament Page

A custom Filament Page is already a Livewire component. In its Blade view, add
an ordinary React island and give it an explicit Livewire state path when the
React component should control a Page property.

Use a stable container ID. The generic island receives value and onDataChange;
it does not use the ReactField contract. The adapter resolves the Page's
nearest Livewire component and synchronizes the explicit state path with
$wire.$set() and the Livewire `morphed` hook. In --dev mode, the application's Vite
entrypoint must import ./bootstrap-react; the prebuilt runtime does not contain
application-owned components.

```php
final class ReactDashboard extends \Filament\Pages\Page
{
    protected static string $view = 'filament.pages.react-dashboard';

    public array $filters = ['period' => 'month'];
}
```

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
```

`filament-react:component` creates the TSX component under
`resources/js/components/`. `--widget` and `--field` additionally generate
Filament PHP classes. Use it in `--dev` mode.

```blade
<x-filament-panels::page>
    <div
        id="react-dashboard-page"
        data-react-component="DashboardPage"
        data-react-props='@js(["value" => $filters])'
        data-react-state-path="filters"
        data-react-reactive="true"
        wire:ignore
    ></div>
</x-filament-panels::page>
```
</x-filament-panels::page>
```

```tsx
type Filters = { period: string };

export default function DashboardPage({
    value = { period: 'month' },
    onDataChange,
}: {
    value?: Filters;
    onDataChange?: (next: Filters) => void;
}) {
    return (
        <select
            value={value.period}
            onChange={event => onDataChange?.({ period: event.target.value })}
        >
            <option value="month">This month</option>
            <option value="year">This year</option>
        </select>
    );
}
```
