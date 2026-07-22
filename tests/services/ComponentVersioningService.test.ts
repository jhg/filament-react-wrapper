import {
  componentVersioningService,
  type CompatibilityRule,
} from '../../resources/js/services/ComponentVersioningService';
import { beforeEach, describe, expect, it } from 'vitest';

const component = () => null;

describe('ComponentVersioningService', () => {
  const name = 'VersionedProbe';

  beforeEach(() => {
    componentVersioningService.registerVersion(name, '1.0.0', component, {
      description: 'Initial version',
      changelog: [
        {
          version: '1.0.0',
          date: '2026-01-01',
          type: 'major',
          changes: ['Initial'],
          author: 'Test',
        },
      ],
    });
    componentVersioningService.registerVersion(name, '1.2.0', component, {
      dependencies: [{ name: 'react', version: '^18.0.0' }],
    });
  });

  it('registers versions, aliases, defaults, and deprecations', () => {
    componentVersioningService.registerAlias(name, 'stable', '1.2.0');
    componentVersioningService.setVersion(name, '1.2.0');
    componentVersioningService.deprecateVersion(name, '1.0.0', 'Use 1.2.0');

    expect(componentVersioningService.getVersion(name)).toBe('1.2.0');
    expect(componentVersioningService.getComponentVersion(name, 'stable')?.version).toBe('1.2.0');
    expect(componentVersioningService.hasVersion(name, '1.0.0')).toBe(true);
    expect(componentVersioningService.getLatestVersion(name)?.version).toBe('1.2.0');
    expect(componentVersioningService.getAllVersions(name).map(version => version.version)).toEqual(
      ['1.2.0', '1.0.0']
    );
    expect(componentVersioningService.getVersionStats(name)).toEqual(
      expect.objectContaining({ totalVersions: 2, deprecatedVersions: 1 })
    );
  });

  it('migrates props and reports compatibility and constraints', async () => {
    componentVersioningService.addMigration(name, '1.0.0', '1.2.0', async props => ({
      props: { ...props, migrated: true },
      warnings: ['Review migrated props'],
      manualStepsRequired: true,
    }));

    const result = await componentVersioningService.migrateProps(name, '1.0.0', '1.2.0', {
      value: 1,
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        migratedProps: { value: 1, migrated: true },
        manualStepsRequired: true,
      })
    );
    await expect(
      componentVersioningService.migrateProps(name, '1.2.0', '9.0.0', {})
    ).resolves.toEqual(expect.objectContaining({ success: false }));

    const rule: CompatibilityRule = () => ({
      issues: [{ severity: 'warning', type: 'review', description: 'Review this upgrade' }],
      recommendations: ['Read the changelog'],
    });
    componentVersioningService.addCompatibilityRule(name, rule);
    expect(componentVersioningService.checkCompatibility(name, '1.0.0', '1.2.0')).toEqual(
      expect.objectContaining({ compatible: true, recommendations: ['Read the changelog'] })
    );
    expect(componentVersioningService.checkCompatibility(name, '1.0.0', '9.0.0').compatible).toBe(
      false
    );
    expect(componentVersioningService.findBestVersion(name, { min: '1.1.0', max: '1.2.0' })).toBe(
      '1.2.0'
    );
    expect(componentVersioningService.satisfiesConstraint('1.2.0', { exact: '1.2.0' })).toBe(true);
    expect(componentVersioningService.satisfiesConstraint('1.2.0', { exclude: ['1.2.0'] })).toBe(
      false
    );
  });

  it('checks semantic compatibility and global statistics', () => {
    componentVersioningService.setVersion(name, '1.2.0');

    expect(componentVersioningService.isCompatible(name, '1.1.0')).toBe(true);
    expect(componentVersioningService.isCompatible(name, '1.2.1')).toBe(false);
    expect(componentVersioningService.isCompatible(name, '2.0.0')).toBe(false);
    expect(componentVersioningService.isCompatible('MissingVersionedProbe', '1.0.0')).toBe(false);
    expect(componentVersioningService.getComponentVersion('MissingVersionedProbe')).toBeNull();
    expect(componentVersioningService.getVersionStats().totalVersions).toBeGreaterThanOrEqual(2);
    expect(componentVersioningService.getChangelog(name)[0]?.version).toBe('1.0.0');
  });
});
