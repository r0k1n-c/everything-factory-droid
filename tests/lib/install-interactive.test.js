/**
 * Tests for scripts/lib/install/interactive.js
 */

const assert = require('assert');

const {
  runInteractiveInstall,
  buildProfileChoices,
  buildLanguageChoices,
  buildCapabilityChoices
} = require('../../scripts/lib/install/interactive');

const {
  loadInstallManifests,
  listInstallProfiles
} = require('../../scripts/lib/install-manifests');

const { normalizeInstallRequest } = require('../../scripts/lib/install/request');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing install/interactive.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('exports runInteractiveInstall as a function', () => {
    assert.strictEqual(typeof runInteractiveInstall, 'function');
  })) passed++; else failed++;

  if (test('exports buildProfileChoices as a function', () => {
    assert.strictEqual(typeof buildProfileChoices, 'function');
  })) passed++; else failed++;

  if (test('exports buildLanguageChoices as a function', () => {
    assert.strictEqual(typeof buildLanguageChoices, 'function');
  })) passed++; else failed++;

  if (test('exports buildCapabilityChoices as a function', () => {
    assert.strictEqual(typeof buildCapabilityChoices, 'function');
  })) passed++; else failed++;

  if (test('buildProfileChoices returns all profiles plus custom option', () => {
    const manifests = loadInstallManifests();
    const choices = buildProfileChoices(manifests);
    const profileIds = Object.keys(manifests.profiles);
    assert.strictEqual(choices.length, profileIds.length + 1);
    assert.strictEqual(choices[choices.length - 1].value, 'custom');
    for (const profileId of profileIds) {
      const match = choices.find(c => c.value === profileId);
      assert.ok(match, `Expected profile choice for ${profileId}`);
      assert.ok(match.name.includes(profileId), `Choice name should contain profile id ${profileId}`);
    }
  })) passed++; else failed++;

  if (test('buildProfileChoices preserves expected profile order', () => {
    const manifests = loadInstallManifests();
    const choices = buildProfileChoices(manifests);
    const expectedOrder = ['core', 'developer', 'security', 'research', 'full', 'custom'];
    const actualOrder = choices.map(c => c.value);
    assert.deepStrictEqual(actualOrder, expectedOrder);
  })) passed++; else failed++;

  if (test('buildLanguageChoices returns only language family components', () => {
    const manifests = loadInstallManifests();
    const choices = buildLanguageChoices(manifests.components, []);
    assert.ok(choices.length > 0, 'Should have at least one language choice');
    for (const choice of choices) {
      assert.ok(choice.value.startsWith('lang:'), `Expected lang: prefix, got ${choice.value}`);
      assert.strictEqual(typeof choice.name, 'string');
      assert.strictEqual(typeof choice.checked, 'boolean');
    }
  })) passed++; else failed++;

  if (test('buildLanguageChoices pre-checks based on profile modules', () => {
    const manifests = loadInstallManifests();
    const developerModules = manifests.profiles.developer.modules;
    const choices = buildLanguageChoices(manifests.components, developerModules);
    const typescriptChoice = choices.find(c => c.value === 'lang:typescript');
    assert.ok(typescriptChoice, 'Should have a lang:typescript choice');
    assert.strictEqual(typescriptChoice.checked, true, 'TypeScript should be pre-checked for developer profile');
  })) passed++; else failed++;

  if (test('buildLanguageChoices does not pre-check when profile has no matching modules', () => {
    const manifests = loadInstallManifests();
    const coreModules = manifests.profiles.core.modules;
    const choices = buildLanguageChoices(manifests.components, coreModules);
    const allUnchecked = choices.every(c => c.checked === false);
    assert.ok(allUnchecked, 'Core profile should not pre-check any language');
  })) passed++; else failed++;

  if (test('buildCapabilityChoices returns only capability family components', () => {
    const manifests = loadInstallManifests();
    const choices = buildCapabilityChoices(manifests.components, []);
    assert.ok(choices.length > 0, 'Should have at least one capability choice');
    for (const choice of choices) {
      assert.ok(choice.value.startsWith('capability:'), `Expected capability: prefix, got ${choice.value}`);
      assert.strictEqual(typeof choice.name, 'string');
      assert.strictEqual(typeof choice.checked, 'boolean');
    }
  })) passed++; else failed++;

  if (test('buildCapabilityChoices pre-checks based on profile modules', () => {
    const manifests = loadInstallManifests();
    const securityModules = manifests.profiles.security.modules;
    const choices = buildCapabilityChoices(manifests.components, securityModules);
    const securityChoice = choices.find(c => c.value === 'capability:security');
    assert.ok(securityChoice, 'Should have a capability:security choice');
    assert.strictEqual(securityChoice.checked, true, 'Security should be pre-checked for security profile');
  })) passed++; else failed++;

  if (test('profile-to-modules mapping is consistent with manifests', () => {
    const manifests = loadInstallManifests();
    const profiles = listInstallProfiles();
    for (const profile of profiles) {
      const manifestProfile = manifests.profiles[profile.id];
      assert.ok(manifestProfile, `Profile ${profile.id} should exist in manifests`);
      assert.strictEqual(
        profile.moduleCount,
        manifestProfile.modules.length,
        `Module count mismatch for profile ${profile.id}`
      );
      for (const moduleId of manifestProfile.modules) {
        assert.ok(
          manifests.modulesById.has(moduleId),
          `Module ${moduleId} from profile ${profile.id} should exist in modules manifest`
        );
      }
    }
  })) passed++; else failed++;

  if (test('interactive result format is compatible with normalizeInstallRequest', () => {
    const mockResult = {
      profile: 'developer',
      includeComponents: ['lang:typescript'],
      excludeComponents: [],
      target: 'factory-droid'
    };
    const request = normalizeInstallRequest({
      target: mockResult.target,
      profileId: mockResult.profile,
      moduleIds: [],
      includeComponentIds: mockResult.includeComponents,
      excludeComponentIds: mockResult.excludeComponents,
      languages: []
    });
    assert.strictEqual(request.mode, 'manifest');
    assert.strictEqual(request.target, 'factory-droid');
    assert.strictEqual(request.profileId, 'developer');
    assert.deepStrictEqual(request.includeComponentIds, ['lang:typescript']);
    assert.deepStrictEqual(request.excludeComponentIds, []);
  })) passed++; else failed++;

  if (test('interactive result with only profile is compatible with normalizeInstallRequest', () => {
    const mockResult = {
      profile: 'core',
      includeComponents: [],
      excludeComponents: [],
      target: 'factory-droid'
    };
    const request = normalizeInstallRequest({
      target: mockResult.target,
      profileId: mockResult.profile,
      moduleIds: [],
      includeComponentIds: mockResult.includeComponents,
      excludeComponentIds: mockResult.excludeComponents,
      languages: []
    });
    assert.strictEqual(request.mode, 'manifest');
    assert.strictEqual(request.profileId, 'core');
  })) passed++; else failed++;

  if (test('interactive result with full profile is compatible with normalizeInstallRequest', () => {
    const mockResult = {
      profile: 'full',
      includeComponents: [],
      excludeComponents: [],
      target: 'factory-droid'
    };
    const request = normalizeInstallRequest({
      target: mockResult.target,
      profileId: mockResult.profile,
      moduleIds: [],
      includeComponentIds: mockResult.includeComponents,
      excludeComponentIds: mockResult.excludeComponents,
      languages: []
    });
    assert.strictEqual(request.mode, 'manifest');
    assert.strictEqual(request.profileId, 'full');
    assert.strictEqual(request.target, 'factory-droid');
  })) passed++; else failed++;

  if (test('interactive result with multiple components is compatible', () => {
    const mockResult = {
      profile: 'core',
      includeComponents: ['lang:typescript', 'lang:python', 'capability:database'],
      excludeComponents: [],
      target: 'factory-droid'
    };
    const request = normalizeInstallRequest({
      target: mockResult.target,
      profileId: mockResult.profile,
      moduleIds: [],
      includeComponentIds: mockResult.includeComponents,
      excludeComponentIds: mockResult.excludeComponents,
      languages: []
    });
    assert.strictEqual(request.mode, 'manifest');
    assert.deepStrictEqual(request.includeComponentIds, ['lang:typescript', 'lang:python', 'capability:database']);
  })) passed++; else failed++;

  if (test('all language components from manifests have valid module references', () => {
    const manifests = loadInstallManifests();
    const langComponents = manifests.components.filter(c => c.family === 'language');
    assert.ok(langComponents.length > 0, 'Should have language components');
    for (const component of langComponents) {
      for (const moduleId of component.modules) {
        assert.ok(
          manifests.modulesById.has(moduleId),
          `Language component ${component.id} references unknown module ${moduleId}`
        );
      }
    }
  })) passed++; else failed++;

  if (test('all capability components from manifests have valid module references', () => {
    const manifests = loadInstallManifests();
    const capComponents = manifests.components.filter(c => c.family === 'capability');
    assert.ok(capComponents.length > 0, 'Should have capability components');
    for (const component of capComponents) {
      for (const moduleId of component.modules) {
        assert.ok(
          manifests.modulesById.has(moduleId),
          `Capability component ${component.id} references unknown module ${moduleId}`
        );
      }
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
