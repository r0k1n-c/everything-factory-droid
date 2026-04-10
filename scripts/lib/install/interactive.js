'use strict';

const inquirer = require('inquirer');
const {
  loadInstallManifests,
  listInstallComponents,
  resolveInstallPlan
} = require('../install-manifests');

const PROFILE_ORDER = ['core', 'developer', 'security', 'research', 'full'];

function buildProfileChoices(manifests) {
  const choices = PROFILE_ORDER
    .filter(id => manifests.profiles[id])
    .map(id => ({
      name: `${id} — ${manifests.profiles[id].description}`,
      value: id
    }));

  choices.push({
    name: 'custom — I want to pick manually',
    value: 'custom'
  });

  return choices;
}

function buildLanguageChoices(components, profileModuleIds) {
  return components
    .filter(c => c.family === 'language')
    .map(c => ({
      name: `${c.id} — ${c.description}`,
      value: c.id,
      checked: (c.modules || []).some(mid => profileModuleIds.includes(mid))
    }));
}

function buildCapabilityChoices(components, profileModuleIds) {
  return components
    .filter(c => c.family === 'capability')
    .map(c => ({
      name: `${c.id} — ${c.description}`,
      value: c.id,
      checked: (c.modules || []).some(mid => profileModuleIds.includes(mid))
    }));
}

function printHeader(version) {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║  Everything Factory Droid — Install Wizard   ║');
  console.log(`  ║  Version: ${String(version || '1.0.0').padEnd(35)}║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
}

function printPreview(plan) {
  console.log('');
  console.log('  Install preview:');
  console.log(`    Profile:    ${plan.profileId || '(custom)'}`);
  console.log(`    Target:     ${plan.target || 'factory-droid'}`);
  console.log(`    Modules:    ${plan.selectedModuleIds.length}`);
  console.log(`    Operations: ${plan.operations.length} files`);
  if (plan.skippedModuleIds.length > 0) {
    console.log(`    Skipped:    ${plan.skippedModuleIds.join(', ')}`);
  }
  console.log('');
}

async function runInteractiveInstall(options = {}) {
  const manifests = loadInstallManifests(options);
  const components = manifests.components;
  const version = manifests.profilesVersion || '1.0.0';

  printHeader(version);

  const { profileChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'profileChoice',
      message: 'Select an install profile:',
      choices: buildProfileChoices(manifests)
    }
  ]);

  let profileId = profileChoice !== 'custom' ? profileChoice : null;
  let includeComponents = [];
  let excludeComponents = [];

  if (profileChoice === 'full') {
    const plan = resolveInstallPlan({
      repoRoot: manifests.repoRoot,
      profileId: 'full',
      moduleIds: [],
      includeComponentIds: [],
      excludeComponentIds: [],
      target: 'factory-droid',
      projectRoot: options.projectRoot,
      homeDir: options.homeDir
    });

    printPreview(plan);

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed with installation?',
        default: true
      }
    ]);

    if (!confirmed) {
      return null;
    }

    return {
      profile: 'full',
      includeComponents: [],
      excludeComponents: [],
      target: 'factory-droid'
    };
  }

  const profileModuleIds = profileId && manifests.profiles[profileId]
    ? manifests.profiles[profileId].modules
    : [];

  const languageChoices = buildLanguageChoices(components, profileModuleIds);
  if (languageChoices.length > 0) {
    const { languages } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'languages',
        message: 'Select language stacks to include:',
        choices: languageChoices
      }
    ]);
    includeComponents.push(...languages);
  }

  const capabilityChoices = buildCapabilityChoices(components, profileModuleIds);
  if (capabilityChoices.length > 0) {
    const { capabilities } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'capabilities',
        message: 'Select capability add-ons:',
        choices: capabilityChoices
      }
    ]);
    includeComponents.push(...capabilities);
  }

  const planOptions = {
    repoRoot: manifests.repoRoot,
    profileId: profileId || undefined,
    moduleIds: [],
    includeComponentIds: includeComponents,
    excludeComponentIds: excludeComponents,
    target: 'factory-droid',
    projectRoot: options.projectRoot,
    homeDir: options.homeDir
  };

  if (!profileId && includeComponents.length === 0) {
    profileId = 'core';
    planOptions.profileId = 'core';
  }

  const plan = resolveInstallPlan(planOptions);
  printPreview(plan);

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Proceed with installation?',
      default: true
    }
  ]);

  if (!confirmed) {
    return null;
  }

  return {
    profile: profileId,
    includeComponents,
    excludeComponents,
    target: 'factory-droid'
  };
}

module.exports = {
  runInteractiveInstall,
  buildProfileChoices,
  buildLanguageChoices,
  buildCapabilityChoices,
  printHeader,
  printPreview
};
