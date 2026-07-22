## filament-react-wrapper

Composer-first package that mounts React components inside Filament form fields, Filament widgets, and ordinary Blade pages.

### ReactField (Filament form field)

Extends `Filament\Forms\Components\Field`. The React component receives `value` and `onChange` as a controlled contract.

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

ReactField::make('content')
    ->component('RichEditor')
    ->props(['toolbar' => ['bold', 'italic']])
    ->height(500)
    ->reactive();
```

### ReactWidget

Extends `Filament\Widgets\Widget`. Polling calls `refresh()` on the Livewire component.

```php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactWidget::component('SalesChart')
    ->polling('10s')
    ->height(350);
```

For server data, subclass the widget and return an array from `getData()`:

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

`SalesChart` receives that array as the normal React `data` prop. Polling
invokes Livewire `refresh()` and the runtime updates `data` after the
`widget-refreshed` event; the React component does not need a Livewire call.

### Custom Filament Pages

Custom Pages are Livewire components and can contain a generic React island.
Use a stable `id`, explicit `data-react-state-path`, `wire:ignore`, and a
controlled `value`/`onDataChange` prop. This is distinct from the
`ReactField` contract; use `use$wire` or `useFilamentBridge` for page actions.
In Vite mode, import `./bootstrap-react` from the application's entrypoint.

### Blade directives

For React islands outside Filament panels (ordinary Blade pages):

```blade
@react('UserCard', ['userId' => $user->id])
@reactComponent('MapViewer', ['lat' => $lat, 'lng' => $lng])
```

Props are escaped via `ReactComponentFactory` using `json_encode` with `JSON_HEX_*` flags and `e()` for HTML attributes.

### JS registration (application entrypoint)

React components must be registered before the runtime can mount them. Use the `@react-wrapper` alias:

```ts
import { defineComponents } from '@react-wrapper';
import UserCard from './components/UserCard';
import SalesChart from './components/SalesChart';

defineComponents({ UserCard, SalesChart });
```

Or register individually:

```ts
import { registerComponent } from '@react-wrapper';
registerComponent('UserCard', UserCard);
```

### useReactField hook

For shared React components that work as Filament fields without knowing about Livewire:

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export function MyField(props: ReactFieldProps<string>) {
  const { value, setValue, errors, disabled, required } = useReactField(props);

  return (
    <>
      <input
        id={props.fieldId}
        value={value ?? ''}
        disabled={disabled}
        required={required}
        onChange={event => setValue(event.target.value)}
      />
      {errors.map(error => <p key={error}>{error}</p>)}
    </>
  );
}
```

Declare it in a Filament form with:

```php
ReactField::make('content')
  ->component('MyField')
  ->required()
  ->reactive();
```

`ReactField::make('content')` supplies the current `value`. When the input
calls `setValue(nextValue)`, the adapter resolves the enclosing Livewire
component and calls `$wire.$set()` with Filament's full state path, usually
`data.content`. Server-side changes and validation return through the
controlled props. The React component should not call Livewire directly or
copy `value` into a second state variable for the normal input case.

### useFilamentState

Reactive state bound to the Livewire component. Used by generated stubs:

```tsx
import { useFilamentState } from '@react-wrapper';

const [data, setData] = useFilamentState('chart.data', {});
```

### useFilamentBridge

Call Livewire methods from React:

```tsx
import { useFilamentBridge } from '@react-wrapper';

const { $filament } = useFilamentBridge();
const result = await $filament.call('handleAction', payload);
```

### Conventions

- Component names passed to `->component()` must match the key used in `defineComponents()`.
- The runtime auto-mounts any element with `data-react-component` attribute via MutationObserver — works with Livewire dynamic DOM.
- State sync from React to Livewire goes through `Livewire.find(wire:id).$set()`, not synthetic events.
- The prebuilt runtime (`resources/vendor/react-wrapper.js`) is loaded by the Composer package in production. In `--dev` mode the application's Vite server is used instead.

### Critical files

- `src/Factories/ReactComponentFactory.php` — XSS escaping backend for `@react`. **Security-sensitive, do not simplify.**
- `src/Middleware/ReactWrapperMiddleware.php` — Only mechanism injecting runtime into non-Filament Blade pages.
- `resources/js/components/EnhancedStateManager.tsx` — Exports `useFilamentState` used by generated stubs. **Do not remove.**

### Rules

**Do:**

- Use `Js::from()` for PHP-to-JS string interpolation (container IDs, component names in generated scripts).
- Use `@js()` in Blade `<script>` blocks instead of `{{ }}` for JS context.
- Use `JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT` flags when encoding props for HTML attributes.
- Run `npm run build:all` after any JS change to regenerate the prebuilt runtime.

**Do not:**

- Do not reintroduce `livewire:update`. Livewire 3 uses `Livewire.hook('morphed', ...)` and `livewire:init`, not synthetic events.
- Do not use `@apply` in `<style>` tags inside Blade templates. It is a Tailwind build directive and is invalid CSS in the browser. Use plain CSS.
- Do not use `var(--filament-body-bg)`. The correct Filament variable is `var(--fi-body-bg, transparent)`.
- Do not add `innerHTML` with user-controlled data. Use `textContent` or `document.createTextNode()`.
- Do not register global `DOMContentLoaded` listeners in Blade templates for bridging logic. The `FilamentReactAdapter` handles all mounting via MutationObserver.
