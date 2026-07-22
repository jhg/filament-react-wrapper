# Component versioning

`componentVersioningService` keeps named React component versions, aliases, migrations, compatibility rules, and changelogs. Components are stored as opaque React component values; version metadata is application-defined.

```tsx
import { componentVersioningService } from '@react-wrapper';

componentVersioningService.registerVersion('UserCard', '1.0.0', UserCardV1, {
  description: 'Initial card',
  author: 'Application team',
  tags: ['users'],
  category: 'profile',
  apiVersion: '1.0.0',
  changelog: [],
});
componentVersioningService.registerVersion('UserCard', '2.0.0', UserCardV2);
```

The first registered version becomes the default. Use `setVersion()` to select a different default, `getVersion()` to read it, and these lookups for component definitions:

```tsx
componentVersioningService.setVersion('UserCard', '2.0.0');
componentVersioningService.getComponentVersion('UserCard', '1.0.0');
componentVersioningService.getLatestVersion('UserCard');
componentVersioningService.getAllVersions('UserCard');
componentVersioningService.hasVersion('UserCard', '2.0.0');
```

Aliases resolve to concrete versions:

```tsx
componentVersioningService.registerAlias('UserCard', 'stable', '2.0.0');
componentVersioningService.getComponentVersion('UserCard', 'stable');
```

Migrations are direct steps from one version to another. A migration returns the new props and may add warnings or require manual work:

```tsx
componentVersioningService.addMigration('UserCard', '1.0.0', '2.0.0', async props => ({
  props: { ...props, displayName: props.name },
  warnings: ['Review the new displayName prop'],
  manualStepsRequired: false,
}));

const result = await componentVersioningService.migrateProps(
  'UserCard', '1.0.0', '2.0.0', { name: 'Ada' }
);
```

Use `checkCompatibility()` and `addCompatibilityRule()` for application-specific checks. Constraints support `min`, `max`, `exact`, and `exclude`; `findBestVersion()` returns the newest matching version.

```tsx
const check = componentVersioningService.checkCompatibility('UserCard', '1.0.0', '2.0.0');
const selected = componentVersioningService.findBestVersion('UserCard', {
  min: '1.0.0', max: '2.0.0', exclude: ['1.5.0'],
});
```

`deprecateVersion()` records a message and optional migration path. `getChangelog()`, `getVersionStats(name)`, and `getVersionStats()` support release and migration reporting. `isCompatible()` performs a simple same-major semantic-version check. Missing versions return `null`/`undefined` or a failed migration result; callers should handle those cases explicitly.
