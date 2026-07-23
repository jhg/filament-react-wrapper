# Testing guide

Run the JavaScript and PHP suites independently:

```bash
npm ci
npm run typecheck
npm run lint:check
npm run test:coverage
vendor/bin/phpunit -c phpunit.xml.dist
composer validate --strict
```

The Vitest suite uses JSDOM and React Testing Library. Coverage includes the registry, both state managers, renderer and Filament adapter, persistence, eventing, shared helpers, DevTools, code splitting, and versioning services. The gate enforces at least 60% statements, branches, functions, and lines overall.

The PHP suite uses Orchestra Testbench and verifies service-provider booting, Filament component configuration, Blade/factory output, JavaScript-context escaping, and a real Livewire/Filament form and widget harness. The CI workflow resolves framework combinations through a matrix; it includes PHP 8.4 and 8.5 rather than assuming that one local PHP version represents every supported environment.

The runtime contract suite mounts a real React component in JSDOM and mocks
only the unavoidable `window.Livewire.find()` boundary. It covers controlled
updates, Livewire `morphed` synchronization without per-container watchers,
dynamic insertion/removal, validation events, polling, and
the `react-loaded` lifecycle event. `test:bundle` evaluates the exact
`resources/vendor/react-wrapper.js` artifact in an isolated JSDOM and checks the
same controlled field bridge. It does not claim to replace a browser test:
browser morphing, focus traps, layout, CSS, CSP, and real network round-trips
remain outside this suite.

When adding a feature, test the public behavior first. For Blade or generated scripts, include a regression case for values containing quotes, angle brackets, and closing-script sequences.
