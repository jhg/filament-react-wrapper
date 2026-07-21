# Component Versioning

Advanced component versioning system for managing updates, migrations, and backward compatibility in React Wrapper applications.

## 🎯 Overview

### What is Component Versioning?

Component versioning allows you to:
- **Manage Multiple Versions** - Run different versions of components simultaneously
- **Seamless Migrations** - Automated prop migration between versions
- **Backward Compatibility** - Support legacy components while introducing new features
- **Gradual Rollouts** - Deploy new versions to specific user groups
- **Rollback Safety** - Quickly revert to previous versions if issues arise

### Key Features

- ✅ **Semantic Versioning** - Industry-standard version numbering
- ✅ **Automated Migrations** - Transform props between versions
- ✅ **Compatibility Checking** - Validate version compatibility
- ✅ **Deprecation Management** - Graceful deprecation with warnings
- ✅ **Version Constraints** - Flexible version selection rules
- ✅ **Change Tracking** - Comprehensive changelog system

## 🚀 Quick Start

### Basic Versioning

```typescript
import { componentVersioningService } from '@react-wrapper';

// Register version 1.0.0
componentVersioningService.registerVersion(
  'UserCard',
  '1.0.0',
  UserCardV1,
  {
    description: 'Initial user card implementation',
    changelog: [{
      version: '1.0.0',
      date: '2024-01-15',
      changes: ['Initial release with basic user information display']
    }]
  }
);

// Register version 2.0.0
componentVersioningService.registerVersion(
  'UserCard',
  '2.0.0',
  UserCardV2,
  {
    description: 'Enhanced user card with avatar and role display',
    changelog: [{
      version: '2.0.0',
      date: '2024-03-20',
      changes: [
        'Added avatar support',
        'Added role display',
        'Improved responsive design',
        'BREAKING: Removed deprecated showEmail prop'
      ]
    }]
  }
);
```

### Using Specific Versions

```typescript
// Get specific version
const v1Component = componentVersioningService.getVersion('UserCard', '1.0.0');
const v2Component = componentVersioningService.getVersion('UserCard', '2.0.0');

// Get latest version
const latestComponent = componentVersioningService.getLatestVersion('UserCard');

// Check if version exists
if (componentVersioningService.hasVersion('UserCard', '2.1.0')) {
  console.log('Version 2.1.0 is available');
}
```

## 📈 Version Management

### Semantic Versioning

```typescript
// Major version (breaking changes)
componentVersioningService.registerVersion(
  'DataTable',
  '2.0.0', // Major version bump
  DataTableV2,
  {
    description: 'Complete rewrite with new API',
    breakingChanges: [
      {
        change: 'columns prop structure changed',
        migration: 'Use new column definition format',
        severity: 'high'
      },
      {
        change: 'onRowClick signature changed',
        migration: 'Update callback parameters',
        severity: 'medium'
      }
    ]
  }
);

// Minor version (new features)
componentVersioningService.registerVersion(
  'DataTable',
  '2.1.0', // Minor version bump
  DataTableV21,
  {
    description: 'Added sorting and filtering capabilities',
    newFeatures: [
      'Column sorting',
      'Advanced filtering',
      'Export functionality'
    ]
  }
);

// Patch version (bug fixes)
componentVersioningService.registerVersion(
  'DataTable',
  '2.1.1', // Patch version bump
  DataTableV211,
  {
    description: 'Bug fixes and performance improvements',
    bugFixes: [
      'Fixed memory leak in large datasets',
      'Corrected sorting behavior with null values',
      'Improved accessibility attributes'
    ]
  }
);
```

### Version Aliases

```typescript
// Register aliases for easier version management
componentVersioningService.registerAlias('UserCard', 'stable', '1.2.3');
componentVersioningService.registerAlias('UserCard', 'beta', '2.0.0-beta.1');
componentVersioningService.registerAlias('UserCard', 'latest', '2.0.0');

// Use aliases
const stableVersion = componentVersioningService.getVersion('UserCard', 'stable');
const betaVersion = componentVersioningService.getVersion('UserCard', 'beta');
```

## 🔄 Migration System

### Automatic Migrations

```typescript
// Add migration from v1 to v2
componentVersioningService.addMigration(
  'UserCard',
  '1.0.0',
  '2.0.0',
  async (props, context) => {
    // Transform props for new version
    const migratedProps = {
      ...props,
      // Map old prop to new structure
      user: {
        name: props.userName,
        email: props.userEmail,
        avatar: props.avatarUrl || null
      },
      // Add new required props with defaults
      showRole: props.displayRole ?? true,
      theme: 'light'
    };

    // Remove deprecated props
    delete migratedProps.userName;
    delete migratedProps.userEmail;
    delete migratedProps.avatarUrl;
    delete migratedProps.displayRole;

    return {
      props: migratedProps,
      warnings: [
        'userName, userEmail, avatarUrl props have been consolidated into user object',
        'displayRole prop renamed to showRole'
      ],
      manualStepsRequired: false
    };
  }
);

// Migration with manual steps
componentVersioningService.addMigration(
  'DataGrid',
  '1.0.0',
  '2.0.0',
  async (props, context) => {
    return {
      props: {
        ...props,
        columns: props.columns.map(col => ({
          ...col,
          // Automatic transformation
          width: col.width || 100
        }))
      },
      warnings: [
        'Column configuration format has changed',
        'Please review column definitions'
      ],
      manualStepsRequired: true,
      manualSteps: [
        'Update column click handlers to use new signature',
        'Verify custom cell renderers are compatible',
        'Test sorting functionality with custom data types'
      ]
    };
  }
);
```

### Migration Execution

```typescript
// Migrate props automatically
const migrationResult = await componentVersioningService.migrateProps(
  'UserCard',
  '1.0.0',
  '2.0.0',
  {
    userName: 'John Doe',
    userEmail: 'john@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    displayRole: true
  }
);

if (migrationResult.success) {
  console.log('Migrated props:', migrationResult.migratedProps);
  
  if (migrationResult.warnings.length > 0) {
    console.warn('Migration warnings:', migrationResult.warnings);
  }
  
  if (migrationResult.manualStepsRequired) {
    console.log('Manual steps needed:', migrationResult.manualSteps);
  }
} else {
  console.error('Migration failed:', migrationResult.errors);
}
```

### Complex Migration Scenarios

```typescript
// Multi-step migration (1.0.0 → 1.5.0 → 2.0.0)
componentVersioningService.addMigration('ComplexComponent', '1.0.0', '1.5.0', 
  async (props) => ({
    props: { ...props, newFeature: 'enabled' },
    warnings: ['Added new feature support']
  })
);

componentVersioningService.addMigration('ComplexComponent', '1.5.0', '2.0.0',
  async (props) => ({
    props: { 
      ...props, 
      config: { feature: props.newFeature, theme: 'modern' }
    },
    warnings: ['Consolidated configuration structure']
  })
);

// Automatic chained migration
const result = await componentVersioningService.migrateProps(
  'ComplexComponent',
  '1.0.0',
  '2.0.0', // Will automatically apply 1.0.0→1.5.0→2.0.0
  originalProps
);
```

## 🔒 Compatibility Management

### Compatibility Rules

```typescript
// Add compatibility rule
componentVersioningService.addCompatibilityRule('UserCard', {
  fromVersion: '1.x.x',
  toVersion: '2.x.x',
  compatible: true,
  autoMigration: true,
  warnings: ['Some props have been renamed'],
  breakingChanges: ['showEmail prop removed']
});

// Check compatibility
const compatibility = componentVersioningService.checkCompatibility(
  'UserCard',
  '1.2.0',
  '2.0.0'
);

if (compatibility.compatible) {
  console.log('Versions are compatible');
  
  if (compatibility.autoMigrationAvailable) {
    console.log('Automatic migration available');
  }
  
  compatibility.issues.forEach(issue => {
    console.warn(`Compatibility issue: ${issue.description}`);
  });
} else {
  console.error('Versions are not compatible');
  compatibility.recommendations.forEach(rec => {
    console.log(`Recommendation: ${rec}`);
  });
}
```

### Version Constraints

```typescript
// Define version constraints
interface VersionConstraint {
  min?: string;     // Minimum version
  max?: string;     // Maximum version
  exact?: string;   // Exact version
  exclude?: string[]; // Excluded versions
}

// Find best matching version
const bestVersion = componentVersioningService.findBestVersion('UserCard', {
  min: '1.5.0',
  max: '2.0.0',
  exclude: ['1.9.0'] // Skip problematic version
});

// Check if version satisfies constraint
const satisfies = componentVersioningService.satisfiesConstraint('1.8.0', {
  min: '1.5.0',
  max: '2.0.0'
}); // true
```

## 📱 Deprecation Management

### Deprecating Versions

```typescript
// Deprecate old version
componentVersioningService.deprecateVersion(
  'UserCard',
  '1.0.0',
  'This version is deprecated due to security vulnerabilities. Please upgrade to 2.0.0 or later.',
  'https://docs.example.com/migration-guide-v1-to-v2'
);

// Get version with deprecation info
const version = componentVersioningService.getVersion('UserCard', '1.0.0');
if (version?.deprecated) {
  console.warn(`Version ${version.version} is deprecated: ${version.deprecationMessage}`);
  if (version.migrationPath) {
    console.log(`Migration guide: ${version.migrationPath}`);
  }
}
```

### Deprecation Warnings

```typescript
// Custom deprecation warning component
const DeprecationWarning = ({ version, message, migrationPath }) => (
  <div className="deprecation-warning" style={{ 
    background: '#fff3cd', 
    border: '1px solid #ffeaa7',
    padding: '1rem',
    margin: '1rem 0',
    borderRadius: '4px'
  }}>
    <h4>⚠️ Deprecated Version</h4>
    <p><strong>Version {version}</strong> is deprecated.</p>
    <p>{message}</p>
    {migrationPath && (
      <p>
        <a href={migrationPath} target="_blank" rel="noopener noreferrer">
          View Migration Guide →
        </a>
      </p>
    )}
  </div>
);

// Automatically show warnings for deprecated components
componentRegistry.addMiddleware((component, props, context) => {
  const version = context.metadata?.version;
  if (version) {
    const versionInfo = componentVersioningService.getVersion(context.metadata.name, version);
    if (versionInfo?.deprecated) {
      return (componentProps) => (
        <>
          <DeprecationWarning 
            version={version}
            message={versionInfo.deprecationMessage}
            migrationPath={versionInfo.migrationPath}
          />
          {React.createElement(component, componentProps)}
        </>
      );
    }
  }
  
  return component;
});
```

## 📊 Version Analytics

### Usage Tracking

```typescript
// Track version usage
componentVersioningService.onVersionUsed((componentName, version, context) => {
  analytics.track('component_version_used', {
    component: componentName,
    version: version,
    deprecated: context.deprecated,
    timestamp: Date.now(),
    userAgent: navigator.userAgent
  });
});

// Get version statistics
const stats = componentVersioningService.getVersionStats('UserCard');
console.log('Version Statistics:', {
  totalVersions: stats.totalVersions,
  activeVersions: stats.activeVersions,
  deprecatedVersions: stats.deprecatedVersions,
  mostUsedVersion: stats.mostUsedVersion,
  usageBreakdown: stats.usageBreakdown
});
```

### Migration Analytics

```typescript
// Track migration events
componentVersioningService.onMigrationComplete((result) => {
  analytics.track('component_migration', {
    component: result.componentName,
    fromVersion: result.fromVersion,
    toVersion: result.toVersion,
    success: result.success,
    hasWarnings: result.warnings.length > 0,
    manualStepsRequired: result.manualStepsRequired,
    migrationTime: result.duration
  });
});
```

## 🎛️ Advanced Features

### Conditional Version Loading

```typescript
// Load different versions based on conditions
const loadUserCard = (userRole: string, featureFlags: any) => {
  let version = '1.0.0'; // Default
  
  if (featureFlags.newUserInterface) {
    version = '2.0.0';
  } else if (userRole === 'admin') {
    version = '1.5.0'; // Admin-specific features
  }
  
  return componentVersioningService.getVersion('UserCard', version);
};

// Usage
const UserCardComponent = loadUserCard(currentUser.role, featureFlags);
```

### Version-Based Feature Flags

```typescript
// Define version-based features
const versionFeatures = {
  '1.0.0': ['basicProfile'],
  '1.5.0': ['basicProfile', 'roleDisplay'],
  '2.0.0': ['basicProfile', 'roleDisplay', 'avatarSupport', 'darkMode']
};

// Check if feature is available in version
const hasFeature = (componentName: string, version: string, feature: string) => {
  return versionFeatures[version]?.includes(feature) ?? false;
};

// Conditional rendering based on version features
const ConditionalFeature = ({ version, feature, children }) => {
  if (hasFeature('UserCard', version, feature)) {
    return children;
  }
  return null;
};
```

### Rollout Management

```typescript
// Gradual rollout configuration
const rolloutConfig = {
  'UserCard@2.0.0': {
    rolloutPercentage: 25, // 25% of users
    userSegments: ['beta-testers', 'premium-users'],
    excludeSegments: ['legacy-browsers'],
    startDate: '2024-04-01',
    endDate: '2024-04-30'
  }
};

// Version selection with rollout
const selectVersionWithRollout = (componentName: string, userContext: any) => {
  const rollout = rolloutConfig[`${componentName}@2.0.0`];
  
  if (!rollout) return componentVersioningService.getLatestVersion(componentName);
  
  // Check if user is in rollout
  const isInRollout = (
    Math.random() * 100 < rollout.rolloutPercentage &&
    rollout.userSegments.some(segment => userContext.segments.includes(segment)) &&
    !rollout.excludeSegments.some(segment => userContext.segments.includes(segment))
  );
  
  if (isInRollout) {
    return componentVersioningService.getVersion(componentName, '2.0.0');
  }
  
  return componentVersioningService.getVersion(componentName, '1.0.0');
};
```

## 🛠️ Development Tools

### Version Development Workflow

```typescript
// Development version registration
if (process.env.NODE_ENV === 'development') {
  componentVersioningService.registerVersion(
    'UserCard',
    '2.1.0-dev',
    UserCardDev,
    {
      description: 'Development version with new features',
      isDevelopment: true,
      changelog: [{
        version: '2.1.0-dev',
        changes: ['WIP: New notification system', 'WIP: Enhanced accessibility']
      }]
    }
  );
}
```

### Version Comparison Tool

```typescript
// Compare versions
const compareVersions = (componentName: string, version1: string, version2: string) => {
  const v1 = componentVersioningService.getVersion(componentName, version1);
  const v2 = componentVersioningService.getVersion(componentName, version2);
  
  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }
  
  return {
    breakingChanges: v2.breakingChanges || [],
    newFeatures: v2.metadata?.newFeatures || [],
    deprecations: v2.metadata?.deprecations || [],
    migrationAvailable: componentVersioningService.hasVersion(componentName, version1) &&
                        componentVersioningService.hasVersion(componentName, version2)
  };
};

// Usage
const comparison = compareVersions('UserCard', '1.0.0', '2.0.0');
console.log('Version Comparison:', comparison);
```

## 💡 Best Practices

### 1. Version Naming

```typescript
// Good: Semantic versioning
'1.0.0' // Major.Minor.Patch
'2.1.3' // Clear progression
'3.0.0-beta.1' // Pre-release versions

// Good: Meaningful aliases
'stable' // Current stable version
'beta' // Beta testing version
'lts' // Long-term support version

// Avoid: Arbitrary naming
'new-version'
'fixed-version'
'final'
```

### 2. Migration Strategy

```typescript
// Provide clear upgrade paths
componentVersioningService.addMigration('Component', '1.x.x', '2.0.0', migration);

// Include comprehensive warnings
return {
  props: migratedProps,
  warnings: [
    'Property "oldProp" has been renamed to "newProp"',
    'Default behavior for "feature" has changed',
    'Consider updating your event handlers'
  ],
  manualSteps: [
    'Update unit tests for new prop structure',
    'Verify styling with new component layout'
  ]
};
```

### 3. Backward Compatibility

```typescript
// Maintain compatibility when possible
const UserCardV2 = (props) => {
  // Support both old and new prop formats
  const userName = props.user?.name || props.userName;
  const userEmail = props.user?.email || props.userEmail;
  
  // Warn about deprecated usage
  if (props.userName && process.env.NODE_ENV === 'development') {
    console.warn('userName prop is deprecated. Use user.name instead.');
  }
  
  return (
    <div>
      <h3>{userName}</h3>
      <p>{userEmail}</p>
    </div>
  );
};
```

### 4. Documentation

```typescript
// Comprehensive version documentation
componentVersioningService.registerVersion(
  'DataTable',
  '3.0.0',
  DataTableV3,
  {
    description: 'Major rewrite with improved performance and accessibility',
    changelog: [{
      version: '3.0.0',
      date: '2024-04-15',
      changes: [
        'BREAKING: Removed legacy sort API',
        'FEATURE: Added virtual scrolling for large datasets',
        'FEATURE: Improved keyboard navigation',
        'FIX: Resolved memory leaks in filter system',
        'IMPROVEMENT: 40% faster rendering performance'
      ]
    }],
    migrationGuide: 'https://docs.example.com/migration/v2-to-v3',
    examples: [
      'https://storybook.example.com/datatable-v3',
      'https://codepen.io/example/datatable-migration'
    ]
  }
);
```

---

**Master component versioning for maintainable, scalable applications! 🔄**