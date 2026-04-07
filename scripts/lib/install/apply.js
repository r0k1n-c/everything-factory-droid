'use strict';

const fs = require('fs');
const path = require('path');

const { writeInstallState } = require('../install-state');

function readJsonObject(filePath, label) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse ${label} at ${filePath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid ${label} at ${filePath}: expected a JSON object`);
  }

  return parsed;
}

function replacePluginRootPlaceholders(value, pluginRoot) {
  if (!pluginRoot) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split('${FACTORY_PROJECT_DIR}').join(pluginRoot);
  }

  if (Array.isArray(value)) {
    return value.map(item => replacePluginRootPlaceholders(item, pluginRoot));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        replacePluginRootPlaceholders(nestedValue, pluginRoot),
      ])
    );
  }

  return value;
}

function buildLegacyHookSignature(entry, pluginRoot) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const normalizedEntry = replacePluginRootPlaceholders(entry, pluginRoot);

  if (typeof normalizedEntry.matcher !== 'string' || !Array.isArray(normalizedEntry.hooks)) {
    return null;
  }

  const hookSignature = normalizedEntry.hooks.map(hook => JSON.stringify({
    type: hook && typeof hook === 'object' ? hook.type : undefined,
    command: hook && typeof hook === 'object' ? hook.command : undefined,
    timeout: hook && typeof hook === 'object' ? hook.timeout : undefined,
    async: hook && typeof hook === 'object' ? hook.async : undefined,
  }));

  return JSON.stringify({
    matcher: normalizedEntry.matcher,
    hooks: hookSignature,
  });
}

function getHookEntryAliases(entry, pluginRoot) {
  const aliases = [];

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return aliases;
  }

  const normalizedEntry = replacePluginRootPlaceholders(entry, pluginRoot);

  if (typeof normalizedEntry.id === 'string' && normalizedEntry.id.trim().length > 0) {
    aliases.push(`id:${normalizedEntry.id.trim()}`);
  }

  const legacySignature = buildLegacyHookSignature(normalizedEntry, pluginRoot);
  if (legacySignature) {
    aliases.push(`legacy:${legacySignature}`);
  }

  aliases.push(`json:${JSON.stringify(normalizedEntry)}`);

  return aliases;
}

function mergeHookEntries(existingEntries, incomingEntries, pluginRoot) {
  const mergedEntries = [];

  for (const entry of existingEntries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    if ('id' in entry && typeof entry.id !== 'string') {
      continue;
    }

    mergedEntries.push(replacePluginRootPlaceholders(entry, pluginRoot));
  }

  for (const entry of incomingEntries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    if ('id' in entry && typeof entry.id !== 'string') {
      continue;
    }

    const normalizedEntry = replacePluginRootPlaceholders(entry, pluginRoot);
    const incomingAliases = getHookEntryAliases(normalizedEntry, pluginRoot);
    const incomingIdAlias = incomingAliases.find(alias => alias.startsWith('id:')) || null;
    const matchedIndex = mergedEntries.findIndex(existingEntry => {
      const existingAliases = getHookEntryAliases(existingEntry, pluginRoot);
      return incomingAliases.some(alias => existingAliases.includes(alias));
    });

    if (matchedIndex === -1) {
      mergedEntries.push(normalizedEntry);
      continue;
    }

    const existingAliases = getHookEntryAliases(mergedEntries[matchedIndex], pluginRoot);
    if (incomingIdAlias && existingAliases.includes(incomingIdAlias)) {
      mergedEntries[matchedIndex] = normalizedEntry;
    }
  }

  return mergedEntries;
}

function findPlannedSourcePath(plan, destinationPath) {
  const operation = plan.operations.find(item => item.destinationPath === destinationPath);
  return operation ? operation.sourcePath : null;
}

function isJsonObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildMergedSettings(plan) {
  if (!plan.adapter || plan.adapter.target !== 'factory-droid' || !plan.targetRoot) {
    return null;
  }

  const pluginRoot = plan.targetRoot;
  const hooksDestinationPath = path.join(plan.targetRoot, 'hooks', 'hooks.json');
  const hooksSourcePath = findPlannedSourcePath(plan, hooksDestinationPath) || hooksDestinationPath;
  const settingsPath = path.join(plan.targetRoot, '.factory', 'settings.json');
  const settingsSourcePath = findPlannedSourcePath(plan, settingsPath);
  const sourceSettings = settingsSourcePath && fs.existsSync(settingsSourcePath)
    ? readJsonObject(settingsSourcePath, 'settings config')
    : {};
  const existingSettings = fs.existsSync(settingsPath)
    ? readJsonObject(settingsPath, 'existing settings')
    : {};

  let hooksConfig = null;
  let incomingHooks = {};
  if (fs.existsSync(hooksSourcePath)) {
    hooksConfig = readJsonObject(hooksSourcePath, 'hooks config');
    if (hooksConfig.hooks !== undefined) {
      incomingHooks = replacePluginRootPlaceholders(hooksConfig.hooks, pluginRoot);
      if (!isJsonObject(incomingHooks)) {
        throw new Error(`Invalid hooks config at ${hooksSourcePath}: expected "hooks" to be a JSON object`);
      }
    }
  }

  if (
    !settingsSourcePath
    && !fs.existsSync(settingsPath)
    && Object.keys(incomingHooks).length === 0
  ) {
    return null;
  }

  const sourceHooks = isJsonObject(sourceSettings.hooks) ? sourceSettings.hooks : {};
  const managedHooks = { ...sourceHooks };
  for (const [eventName, incomingEntries] of Object.entries(incomingHooks)) {
    const currentEntries = Array.isArray(sourceHooks[eventName]) ? sourceHooks[eventName] : [];
    const nextEntries = Array.isArray(incomingEntries) ? incomingEntries : [];
    managedHooks[eventName] = mergeHookEntries(currentEntries, nextEntries, pluginRoot);
  }

  const managedSettings = { ...sourceSettings };
  if (Object.keys(managedHooks).length > 0) {
    managedSettings.hooks = managedHooks;
  } else {
    delete managedSettings.hooks;
  }

  const existingHooks = isJsonObject(existingSettings.hooks) ? existingSettings.hooks : {};
  const appliedHooks = { ...existingHooks };
  for (const [eventName, managedEntries] of Object.entries(managedHooks)) {
    const currentEntries = Array.isArray(existingHooks[eventName]) ? existingHooks[eventName] : [];
    const nextEntries = Array.isArray(managedEntries) ? managedEntries : [];
    appliedHooks[eventName] = mergeHookEntries(currentEntries, nextEntries, pluginRoot);
  }

  const mergedSettings = {
    ...managedSettings,
    ...existingSettings,
  };
  if (Object.keys(appliedHooks).length > 0) {
    mergedSettings.hooks = appliedHooks;
  }

  return {
    settingsPath,
    mergedSettings,
    managedSettings,
    previousSettingsContent: fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : null,
    settingsSourceRelativePath: settingsSourcePath ? '.factory/settings.json' : 'hooks/hooks.json',
    settingsModuleId: settingsSourcePath ? 'platform-configs' : 'hooks-runtime',
    hooksDestinationPath,
    previousHooksContent: fs.existsSync(hooksDestinationPath) ? fs.readFileSync(hooksDestinationPath, 'utf8') : null,
    resolvedHooksConfig: hooksConfig ? {
      ...hooksConfig,
      hooks: incomingHooks,
    } : null,
  };
}

function applyInstallPlan(plan) {
  const mergedSettingsPlan = buildMergedSettings(plan);
  const copiedOperations = mergedSettingsPlan
    ? plan.operations.filter(operation => (
      operation.destinationPath !== mergedSettingsPlan.settingsPath
      && (
        !mergedSettingsPlan.resolvedHooksConfig
        || operation.destinationPath !== mergedSettingsPlan.hooksDestinationPath
      )
    ))
    : plan.operations;

  for (const operation of copiedOperations) {
    fs.mkdirSync(path.dirname(operation.destinationPath), { recursive: true });
    fs.copyFileSync(operation.sourcePath, operation.destinationPath);
  }

  if (mergedSettingsPlan) {
    if (mergedSettingsPlan.resolvedHooksConfig) {
      fs.mkdirSync(path.dirname(mergedSettingsPlan.hooksDestinationPath), { recursive: true });
      fs.writeFileSync(
        mergedSettingsPlan.hooksDestinationPath,
        JSON.stringify(mergedSettingsPlan.resolvedHooksConfig, null, 2) + '\n',
        'utf8'
      );
    }
    fs.mkdirSync(path.dirname(mergedSettingsPlan.settingsPath), { recursive: true });
    fs.writeFileSync(
      mergedSettingsPlan.settingsPath,
      JSON.stringify(mergedSettingsPlan.mergedSettings, null, 2) + '\n',
      'utf8'
    );
  }

  const managedOperations = mergedSettingsPlan
    ? [
      ...copiedOperations,
      ...(mergedSettingsPlan.resolvedHooksConfig
        ? [{
          kind: 'render-template',
          moduleId: 'hooks-runtime',
          sourceRelativePath: 'hooks/hooks.json',
          destinationPath: mergedSettingsPlan.hooksDestinationPath,
          strategy: 'render-template',
          ownership: 'managed',
          scaffoldOnly: false,
          templateOutput: `${JSON.stringify(mergedSettingsPlan.resolvedHooksConfig, null, 2)}\n`,
          ...(mergedSettingsPlan.previousHooksContent !== null
            ? { previousContent: mergedSettingsPlan.previousHooksContent }
            : {}),
        }]
        : []),
      {
        kind: 'merge-json',
        moduleId: mergedSettingsPlan.settingsModuleId,
        sourceRelativePath: mergedSettingsPlan.settingsSourceRelativePath,
        destinationPath: mergedSettingsPlan.settingsPath,
        strategy: 'merge-json',
        ownership: 'managed',
        scaffoldOnly: false,
        payload: mergedSettingsPlan.managedSettings,
        ...(mergedSettingsPlan.previousSettingsContent !== null
          ? { previousContent: mergedSettingsPlan.previousSettingsContent }
          : {}),
      },
    ]
    : copiedOperations;
  const statePreview = {
    ...plan.statePreview,
    operations: managedOperations,
  };

  writeInstallState(plan.installStatePath, statePreview);

  return {
    ...plan,
    operations: managedOperations,
    statePreview,
    applied: true,
  };
}

module.exports = {
  applyInstallPlan,
};
