const path = require('path');
const {
  createInstallTargetAdapter,
  createRemappedOperation,
  normalizeRelativePath,
} = require('./helpers');

function remapFactoryDroidProjectPath(sourceRelativePath, input = {}) {
  const normalizedSourcePath = normalizeRelativePath(sourceRelativePath);
  const projectRoot = input.projectRoot || input.repoRoot;

  if (!projectRoot) {
    throw new Error('projectRoot or repoRoot is required for factory-droid project installs');
  }

  if (normalizedSourcePath === 'AGENTS.md') {
    return path.join(projectRoot, 'AGENTS.md');
  }

  const pathMappings = [
    ['rules', path.join(projectRoot, '.factory', 'rules')],
    ['agents', path.join(projectRoot, '.factory', 'droids')],
    ['commands', path.join(projectRoot, '.factory', 'commands')],
    ['skills', path.join(projectRoot, '.factory', 'skills')],
    ['.factory/settings.json', path.join(projectRoot, '.factory', 'settings.json')],
    ['hooks', path.join(projectRoot, 'hooks')],
    ['scripts/hooks', path.join(projectRoot, 'scripts', 'hooks')],
    ['scripts/lib', path.join(projectRoot, 'scripts', 'lib')],
  ];

  for (const [sourcePrefix, destinationBase] of pathMappings) {
    if (normalizedSourcePath === sourcePrefix) {
      return destinationBase;
    }

    if (normalizedSourcePath.startsWith(`${sourcePrefix}/`)) {
      return path.join(destinationBase, normalizedSourcePath.slice(sourcePrefix.length + 1));
    }
  }

  return path.join(projectRoot, normalizedSourcePath);
}

module.exports = createInstallTargetAdapter({
  id: 'factory-droid-project',
  target: 'factory-droid',
  kind: 'project',
  rootSegments: [],
  installStatePathSegments: ['.factory', 'install-state.json'],
  planOperations(input = {}, adapter) {
    const modules = Array.isArray(input.modules) ? input.modules : [];

    return modules.flatMap(module => {
      const paths = Array.isArray(module.paths) ? module.paths : [];
      return paths.map(sourceRelativePath => createRemappedOperation(
        adapter,
        module.id,
        sourceRelativePath,
        remapFactoryDroidProjectPath(sourceRelativePath, input)
      ));
    });
  },
});
