const { createInstallTargetAdapter } = require('./helpers');

module.exports = createInstallTargetAdapter({
  id: 'gemini-project',
  target: 'gemini',
  kind: 'project',
  rootSegments: ['.gemini'],
  installStatePathSegments: ['efd-install-state.json'],
  nativeRootRelativePath: '.gemini',
});
