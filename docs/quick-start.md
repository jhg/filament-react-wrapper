# Quick start

This advanced walkthrough assumes the [README installation](../README.md#installation) is complete.

The examples below define application-owned React components, so run `php artisan filament-react:install --dev` first. The default Composer-only installation is sufficient when the application only consumes the package runtime.

## 1. Create and register a component

```tsx
// resources/js/components/UserCard.tsx
interface UserCardProps {
    name: string;
    email: string;
    role?: string;
}

export default function UserCard({ name, email, role = 'User' }: UserCardProps) {
    return (
        <article>
            <h2>{name}</h2>
            <p>{email}</p>
            <small>{role}</small>
        </article>
    );
}
```

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

## 2. Render it in Blade

The directive creates a safe container and JSON props:

```blade
@react('UserCard', [
    'name' => $user->name,
    'email' => $user->email,
    'role' => $user->role,
])
```

For manual containers, use JavaScript escaping for the props:

```blade
<div
    data-react-component="UserCard"
    data-react-props='@js(['name' => $user->name])'
></div>
```

## 3. Use it in Filament

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

ReactField::make('profile')
    ->component('RichTextInput')
    ->required()
    ->reactive();

ReactWidget::component('UserStats')
    ->props(['period' => 'month'])
    ->height(300);
```

`ReactField` is a controlled input. Its component must render the received
`value` and call `onChange` (or `useReactField().setValue`) when the user edits
it:

```tsx
import { useReactField, type ReactFieldProps } from '@react-wrapper';

export function RichTextInput(props: ReactFieldProps<string>) {
    const { value, setValue, errors } = useReactField(props);

    return (
        <>
            <textarea value={value ?? ''} onChange={event => setValue(event.target.value)} />
            {errors.map(error => <p key={error}>{error}</p>)}
        </>
    );
}
```

The adapter sends the edit to the enclosing Livewire component using the
field's complete state path, such as `data.profile`. `UserCard` above is a
display component for `@react`; it is not a substitute for a controlled field
unless it implements this contract.

## 4. Add local state

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

Persist a value in browser storage:

```tsx
import { usePersistedState } from '@react-wrapper';

const [theme, setTheme] = usePersistedState('theme', 'light', {
    storage: 'localStorage',
});
```

## 5. Build and debug (development mode)

```bash
npm run dev
npm run build
```

For browser diagnostics, set `REACT_WRAPPER_DEBUG=true` and inspect `window.ReactWrapper.devTools`. Keep it disabled in production.

Next: read the [component registry guide](component-registry.md), [state guide](state-management.md), or [testing guide](testing.md).
