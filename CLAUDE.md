# CLAUDE.md

## Project overview

Composer-first Laravel package that mounts React components in Filament
fields, Filament widgets, and ordinary Blade pages. The PHP package owns
installation and runtime delivery. `package.json` is a private build/test
toolchain — never published to NPM.

User-facing entry points:

1. `ReactField` / `ReactWidget` — native Filament integration.
2. `@react` / `@reactComponent` — Blade islands.
3. `defineComponents` from `@react-wrapper` — JS registration.
4. Prebuilt Composer runtime (production) or Vite dev server (`--dev`).

## Architecture

### JavaScript (`resources/js`)

| File | Role |
|---|---|
| `index.tsx` | Public exports and bootstrap. |
| `SimpleRegistration.tsx` | Blessed API: `defineComponents`, `registerComponent`, `mountIsland`. |
| `ReactComponentRegistry.tsx` | Internal registry. Lower-level API, kept for compatibility. |
| `UniversalReactRenderer.tsx` | Renders registry components from DOM metadata. Adapts controlled field props (`value`/`onChange`). |
| `FilamentReactAdapter.tsx` | MutationObserver-based mounting and React ↔ Livewire bridge. Resolves `wire:id`, uses `$set`/`set`, subscribes with `$watch`. Handles `livewire:navigated` and `livewire:init`. |
| `EnhancedStateManager.tsx` | Owns `useFilamentState`. Used by generated stubs. **Do not remove.** |
| `StateManager.tsx` | Older state API. Keep for compatibility; prefer `EnhancedStateManager` for new code. |
| `useReactField.ts` | Hook: controlled `value`/`setValue` contract for shared field components. |

### PHP (`src`)

| File | Role |
|---|---|
| `ReactWrapperServiceProvider.php` | Package registration, Filament asset registration, Blade directives. |
| `Forms/Components/ReactField.php` | Controlled Filament form field. Extends `Field`. |
| `Widgets/ReactWidget.php` | Filament widget with optional polling. Extends `Widget`. |
| `Blade/ReactDirective.php` | `@react`, `@reactComponent`, `@reactProps`, `@reactConfig`. Delegates to `ReactComponentFactory`. |
| `Factories/ReactComponentFactory.php` | HTML/JSON escaping for Blade-created React islands. **Security-sensitive.** |
| `Middleware/ReactWrapperMiddleware.php` | Injects runtime into HTML Blade responses outside Filament panels. |

### Build flow

`npm run build:all` → `scripts/build.js` → `resources/vendor/react-wrapper.js`

This file is the prebuilt runtime consumed by the Composer package. It must
be regenerated after any JS change. The `package.json` is private and does
not produce a publishable NPM artifact.

## Rules

### Do

- Run the full verification suite before committing (see below).
- Regenerate `resources/vendor/react-wrapper.js` with `npm run build:all`
  after any change to files in `resources/js/`.
- Use `Js::from()` for PHP-to-JS string interpolation (e.g. container IDs,
  component names in generated scripts).
- Use `@js()` in Blade `<script>` blocks instead of `{{ }}` for JS context.
- Use `JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT` flags
  when encoding props for HTML attributes.
- Keep `EnhancedStateManager.tsx` — it exports `useFilamentState` used by
  the scaffolding stubs (`InstallCommand`, `ComponentCommand`).
- Keep `ReactComponentFactory` — it is the rendering backend for `@react`
  and handles XSS escaping.
- Keep `ReactWrapperMiddleware` — it is the only mechanism that delivers the
  runtime to non-Filament Blade pages.
- Keep `StateManager.tsx` for backward compatibility, but prefer
  `EnhancedStateManager` in new examples.

### Do not

- Do not reintroduce `livewire:update`. Livewire 3 uses `Livewire.hook('morphed', ...)`
  and `livewire:init`, not synthetic events.
- Do not use `@apply` in `<style>` tags inside Blade templates. It is a
  Tailwind build directive and is invalid CSS in the browser. Use plain CSS.
- Do not use `var(--filament-body-bg)`. The correct Filament variable is
  `var(--fi-body-bg, transparent)`.
- Do not publish to NPM. The package is Composer-first.
- Do not add `innerHTML` with user-controlled data. Use `textContent` or
  `document.createTextNode()`.
- Do not register global `DOMContentLoaded` listeners in Blade templates for
  bridging logic. The `FilamentReactAdapter` handles all mounting via
  MutationObserver and works with dynamic DOM (modals, slideovers, wizards).

## Verification

Run after every change. All must pass:

```bash
# TypeScript
npm run typecheck

# Lint (130 warnings from @typescript-eslint/no-explicit-any are expected)
npm run lint:check

# Format
npm run format:check

# JS tests
npm run test

# PHP tests
vendor/bin/phpunit

# Regenerate runtime (required after any JS change)
npm run build:all
```

If you changed Blade templates or PHP, also verify:

```bash
# Check the generated HTML is valid (no @apply, no unescaped JS context)
grep -rn '@apply' resources/views/ && echo "FAIL: @apply in Blade"
grep -rn 'var(--filament' resources/views/ && echo "FAIL: wrong CSS var"
```

## Conventions

- TypeScript strict mode is enabled. No `any` in new code.
- Do not add comments unless explicitly asked.
- Component names in `->component('Name')` must match the key in
  `defineComponents({ Name })` on the JS side.
- State sync from React → Livewire goes through `Livewire.find(wire:id).$set()`.
- The `@react` Blade directive escapes props via `ReactComponentFactory`
  using `json_encode` with `JSON_HEX_*` flags and `e()` for HTML attributes.

## Laravel Boost

The package ships AI guidelines at `resources/boost/guidelines/core.blade.php`.
When users run `php artisan boost:install`, these are loaded automatically.
Keep the file updated when adding or changing public APIs.
