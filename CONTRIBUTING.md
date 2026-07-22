# Contributing

1. Install dependencies with `npm ci` and `composer install`.
2. Make the smallest focused change that preserves the public API.
3. Add or update tests for behavior changes.
4. Run `npm run typecheck`, `npm run lint:check`, `npm run test:coverage`, `vendor/bin/phpunit -c phpunit.xml.dist`, and `composer validate --strict`.
5. Check `git diff --check` before opening a pull request.

Do not reintroduce a package-specific Vite or Filament plugin. Integration belongs in the published bootstrap, service provider, Blade directives, and the application’s normal build pipeline.
