const { createInstallTargetAdapter } = require('./helpers');

module.exports = createInstallTargetAdapter({
  id: 'factory-droid-home',
  target: 'factory-droid',
  kind: 'home',
  rootSegments: ['.factory'],
  installStatePathSegments: ['install-state.json'],
  nativeRootRelativePath: '.factory',
});
