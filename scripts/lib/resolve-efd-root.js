'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolve the EFD source root directory.
 *
 * Tries, in order:
 *   1. FACTORY_PROJECT_DIR env var (set by Factory Droid for hooks, or by user)
 *   2. Standard install location (~/.factory/) — when scripts exist there
 *   3. Exact legacy plugin roots under ~/.factory/plugins/
 *   4. Plugin cache auto-detection — scans ~/.factory/plugins/cache/everything-factory-droid/
 *   5. Fallback to ~/.factory/ (original behaviour)
 *
 * @param {object} [options]
 * @param {string} [options.homeDir]  Override home directory (for testing)
 * @param {string} [options.envRoot]  Override FACTORY_PROJECT_DIR (for testing)
 * @param {string} [options.probe]    Relative path used to verify a candidate root
 *                                    contains EFD scripts. Default: 'scripts/lib/utils.js'
 * @returns {string} Resolved EFD root path
 */
function resolveEfdRoot(options = {}) {
  const envRoot = options.envRoot !== undefined
    ? options.envRoot
    : (process.env.FACTORY_PROJECT_DIR || '');

  if (envRoot && envRoot.trim()) {
    return envRoot.trim();
  }

  const homeDir = options.homeDir || os.homedir();
  const factoryDir = path.join(homeDir, '.factory');
  const probe = options.probe || path.join('scripts', 'lib', 'utils.js');

  // Standard install — files are copied directly into ~/.factory/
  if (fs.existsSync(path.join(factoryDir, probe))) {
    return factoryDir;
  }

  // Exact legacy plugin install locations. These preserve backwards
  // compatibility without scanning arbitrary plugin trees.
  const legacyPluginRoots = [
    path.join(factoryDir, 'plugins', 'everything-factory-droid'),
    path.join(factoryDir, 'plugins', 'everything-factory-droid@everything-factory-droid'),
    path.join(factoryDir, 'plugins', 'marketplace', 'everything-factory-droid')
  ];

  for (const candidate of legacyPluginRoots) {
    if (fs.existsSync(path.join(candidate, probe))) {
      return candidate;
    }
  }

  // Plugin cache — Factory Droid stores marketplace plugins under
  // ~/.factory/plugins/cache/<plugin-name>/<org>/<version>/
  try {
    const cacheBase = path.join(factoryDir, 'plugins', 'cache', 'everything-factory-droid');
    const orgDirs = fs.readdirSync(cacheBase, { withFileTypes: true });

    for (const orgEntry of orgDirs) {
      if (!orgEntry.isDirectory()) continue;
      const orgPath = path.join(cacheBase, orgEntry.name);

      let versionDirs;
      try {
        versionDirs = fs.readdirSync(orgPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const verEntry of versionDirs) {
        if (!verEntry.isDirectory()) continue;
        const candidate = path.join(orgPath, verEntry.name);
        if (fs.existsSync(path.join(candidate, probe))) {
          return candidate;
        }
      }
    }
  } catch {
    // Plugin cache doesn't exist or isn't readable — continue to fallback
  }

  return factoryDir;
}

/**
 * Compact inline version for embedding in command .md code blocks.
 *
 * This is the minified form of resolveEfdRoot() suitable for use in
 * node -e "..." scripts where require() is not available before the
 * root is known.
 *
 * Usage in commands:
 *   const _r = <paste INLINE_RESOLVE>;
 *   const sm = require(_r + '/scripts/lib/session-manager');
 */
const INLINE_RESOLVE = `(()=>{var e=process.env.FACTORY_PROJECT_DIR;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.factory'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;for(var l of [p.join(d,'plugins','everything-factory-droid'),p.join(d,'plugins','everything-factory-droid@everything-factory-droid'),p.join(d,'plugins','marketplace','everything-factory-droid')])if(f.existsSync(p.join(l,q)))return l;try{var b=p.join(d,'plugins','cache','everything-factory-droid');for(var o of f.readdirSync(b,{withFileTypes:true})){if(!o.isDirectory())continue;for(var v of f.readdirSync(p.join(b,o.name),{withFileTypes:true})){if(!v.isDirectory())continue;var c=p.join(b,o.name,v.name);if(f.existsSync(p.join(c,q)))return c}}}catch(x){}return d})()`;

const resolveEccRoot = resolveEfdRoot;

module.exports = {
  resolveEfdRoot,
  resolveEccRoot,
  INLINE_RESOLVE,
};
