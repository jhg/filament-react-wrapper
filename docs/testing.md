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

The PHP suite uses Orchestra Testbench and verifies service-provider booting, Filament component configuration, Blade/factory output, and JavaScript-context escaping. The CI workflow resolves framework combinations through a matrix; it includes PHP 8.4 and 8.5 rather than assuming that one local PHP version represents every supported environment.

When adding a feature, test the public behavior first. For Blade or generated scripts, include a regression case for values containing quotes, angle brackets, and closing-script sequences.
