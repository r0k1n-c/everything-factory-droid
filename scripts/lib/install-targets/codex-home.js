const { createInstallTargetAdapter } = require('./helpers');

module.exports = createInstallTargetAdapter({
  id: 'codex-home',
  target: 'codex',
  kind: 'home',
  rootSegments: ['.codex'],
  installStatePathSegments: ['efd-install-state.json'],
  nativeRootRelativePath: '.codex',
});
