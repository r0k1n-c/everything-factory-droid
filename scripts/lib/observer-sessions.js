const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { getFactoryDir, ensureDir, sanitizeSessionId } = require('./utils');

function getHomunculusDir() {
  return path.join(getFactoryDir(), 'homunculus');
}

function getProjectsDir() {
  return path.join(getHomunculusDir(), 'projects');
}

function getProjectRegistryPath() {
  return path.join(getHomunculusDir(), 'projects.json');
}

function readProjectRegistry() {
  try {
    return JSON.parse(fs.readFileSync(getProjectRegistryPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeJsonAtomic(filePath, payload) {
  ensureDir(path.dirname(filePath));
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.tmp.${process.pid}.${Date.now()}`
  );
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2) + '\n');
  fs.renameSync(tmpPath, filePath);
}

function runGit(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

function stripRemoteCredentials(remoteUrl) {
  if (!remoteUrl) return '';
  return String(remoteUrl).replace(/:\/\/[^@]+@/, '://');
}

function hashProjectId(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function getLegacyProjectIds(projectRoot, remoteUrl) {
  const candidates = new Set();
  const rawRemote = remoteUrl || '';
  const sanitizedRemote = stripRemoteCredentials(rawRemote);

  if (sanitizedRemote) {
    candidates.add(hashProjectId(sanitizedRemote));
  }

  if (rawRemote) {
    candidates.add(hashProjectId(rawRemote));
  }

  candidates.add(hashProjectId(projectRoot));
  return Array.from(candidates);
}

function getProjectNameFromRoot(projectRoot) {
  return path.basename(projectRoot) || 'project';
}

function getBaseProjectId(projectRoot) {
  return sanitizeSessionId(getProjectNameFromRoot(projectRoot)) || 'project';
}

function readProjectMetadata(projectId) {
  if (!projectId || projectId === 'global') return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(getProjectsDir(), projectId, 'project.json'), 'utf8'));
  } catch {
    return null;
  }
}

function sameResolvedPath(left, right) {
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function sameResolvedParentPath(left, right) {
  if (!left || !right) return false;
  return path.dirname(path.resolve(left)) === path.dirname(path.resolve(right));
}

function getProjectRecord(projectId, registry) {
  const entry = registry[projectId] || {};
  const metadata = readProjectMetadata(projectId) || {};
  return {
    id: projectId,
    name: metadata.name || entry.name || projectId,
    root: metadata.root || entry.root || '',
    remote: metadata.remote || entry.remote || ''
  };
}

function isRenameCandidateProject(record, projectRoot, remoteUrl) {
  if (!record?.root || sameResolvedPath(record.root, projectRoot)) {
    return false;
  }

  if (!sameResolvedParentPath(record.root, projectRoot)) {
    return false;
  }

  if (getProjectNameFromRoot(record.root) === getProjectNameFromRoot(projectRoot)) {
    return false;
  }

  if (fs.existsSync(record.root)) {
    return false;
  }

  const currentRemote = stripRemoteCredentials(remoteUrl);
  const candidateRemote = stripRemoteCredentials(record.remote);
  if (currentRemote && candidateRemote && currentRemote !== candidateRemote) {
    return false;
  }

  return true;
}

function projectIdBelongsToRoot(projectId, projectRoot, registry) {
  const entry = registry[projectId];
  if (entry && sameResolvedPath(entry.root, projectRoot)) {
    return true;
  }

  const metadata = readProjectMetadata(projectId);
  return sameResolvedPath(metadata?.root, projectRoot);
}

function projectIdIsTaken(projectId, projectRoot, registry) {
  const projectDir = path.join(getProjectsDir(), projectId);

  if (projectIdBelongsToRoot(projectId, projectRoot, registry)) {
    return false;
  }

  if (registry[projectId]) {
    return true;
  }

  if (!fs.existsSync(projectDir)) {
    return false;
  }

  const metadata = readProjectMetadata(projectId);
  return !!(metadata && !sameResolvedPath(metadata.root, projectRoot));
}

function movePathIntoCanonical(sourcePath, targetPath) {
  const stats = fs.lstatSync(sourcePath);

  if (stats.isDirectory()) {
    ensureDir(targetPath);
    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      movePathIntoCanonical(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name)
      );
    }
    fs.rmSync(sourcePath, { recursive: true, force: true });
    return;
  }

  if (!fs.existsSync(targetPath)) {
    ensureDir(path.dirname(targetPath));
    try {
      fs.renameSync(sourcePath, targetPath);
    } catch (err) {
      if (err.code === 'EXDEV') {
        fs.copyFileSync(sourcePath, targetPath);
        fs.rmSync(sourcePath, { force: true });
      } else {
        throw err;
      }
    }
    return;
  }

  fs.rmSync(sourcePath, { recursive: true, force: true });
}

function migrateProjectStorage(projectId, previousIds = []) {
  const targetDir = path.join(getProjectsDir(), projectId);
  ensureDir(targetDir);

  for (const previousId of previousIds) {
    if (!previousId || previousId === projectId || previousId === 'global') {
      continue;
    }

    const sourceDir = path.join(getProjectsDir(), previousId);
    if (!fs.existsSync(sourceDir)) {
      continue;
    }

    movePathIntoCanonical(sourceDir, targetDir);
  }
}

function resolveProjectStorage(projectRoot, remoteUrl, registry) {
  const baseProjectId = getBaseProjectId(projectRoot);
  const priorIds = new Set();
  const previousProjects = new Map();

  function remember(projectId) {
    if (!projectId || projectId === 'global') {
      return;
    }
    const record = getProjectRecord(projectId, registry);
    previousProjects.set(projectId, record);
  }

  for (const [projectKey, entry] of Object.entries(registry)) {
    if (entry && sameResolvedPath(entry.root, projectRoot)) {
      const projectId = entry.id || projectKey;
      priorIds.add(projectId);
      remember(projectId);
    }
  }

  for (const projectId of fs.existsSync(getProjectsDir()) ? fs.readdirSync(getProjectsDir()) : []) {
    if (projectIdBelongsToRoot(projectId, projectRoot, registry)) {
      priorIds.add(projectId);
      remember(projectId);
    }
  }

  const renameCandidates = new Map();
  for (const [projectKey, entry] of Object.entries(registry)) {
    const projectId = entry?.id || projectKey;
    const record = getProjectRecord(projectId, registry);
    if (isRenameCandidateProject(record, projectRoot, remoteUrl)) {
      renameCandidates.set(projectId, record);
    }
  }

  for (const projectId of fs.existsSync(getProjectsDir()) ? fs.readdirSync(getProjectsDir()) : []) {
    const record = getProjectRecord(projectId, registry);
    if (isRenameCandidateProject(record, projectRoot, remoteUrl)) {
      renameCandidates.set(projectId, record);
    }
  }

  if (renameCandidates.size === 1) {
    const [projectId, record] = Array.from(renameCandidates.entries())[0];
    priorIds.add(projectId);
    previousProjects.set(projectId, record);
  }

  for (const legacyId of getLegacyProjectIds(projectRoot, remoteUrl)) {
    priorIds.add(legacyId);
    remember(legacyId);
  }

  let projectId = baseProjectId;
  let suffix = 2;
  while (projectIdIsTaken(projectId, projectRoot, registry) && !priorIds.has(projectId)) {
    projectId = `${baseProjectId}-${suffix}`;
    suffix += 1;
  }

  const previousIds = Array.from(priorIds).filter(id => id && id !== projectId);
  migrateProjectStorage(projectId, previousIds);

  return {
    projectId,
    previousIds,
    previousProjects: previousIds
      .map(id => previousProjects.get(id))
      .filter(project => project && (project.name || project.root))
  };
}

function updateProjectRegistry(projectId, projectRoot, remoteUrl, previousIds = []) {
  const registry = readProjectRegistry();
  const now = new Date().toISOString();
  const projectName = getProjectNameFromRoot(projectRoot);
  let createdAt = now;

  for (const [id, entry] of Object.entries(registry)) {
    if (!entry) continue;
    if (id === projectId || previousIds.includes(id) || sameResolvedPath(entry.root, projectRoot)) {
      createdAt = entry.created_at || createdAt;
      if (id !== projectId) {
        delete registry[id];
      }
    }
  }

  const metadata = {
    id: projectId,
    name: projectName,
    root: path.resolve(projectRoot),
    remote: stripRemoteCredentials(remoteUrl),
    created_at: createdAt,
    last_seen: now
  };

  registry[projectId] = metadata;

  const projectDir = path.join(getProjectsDir(), projectId);
  ensureDir(projectDir);
  writeJsonAtomic(getProjectRegistryPath(), registry);
  writeJsonAtomic(path.join(projectDir, 'project.json'), metadata);
}

function resolveProjectRoot(cwd = process.cwd()) {
  const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR;
  if (claudeProjectDir && fs.existsSync(claudeProjectDir)) {
    return path.resolve(claudeProjectDir);
  }

  const gitRoot = runGit(['rev-parse', '--show-toplevel'], cwd);
  if (gitRoot) return path.resolve(gitRoot);

  return '';
}

function resolveProjectContext(cwd = process.cwd()) {
  const projectRoot = resolveProjectRoot(cwd);
  if (!projectRoot) {
    const projectDir = getHomunculusDir();
    ensureDir(projectDir);
    return { projectId: 'global', projectRoot: '', projectDir, isGlobal: true, previousIds: [], previousProjects: [] };
  }

  const registry = readProjectRegistry();
  const remoteUrl = runGit(['remote', 'get-url', 'origin'], projectRoot);
  const { projectId, previousIds, previousProjects } = resolveProjectStorage(projectRoot, remoteUrl, registry);
  const projectDir = path.join(getProjectsDir(), projectId);
  ensureDir(projectDir);
  updateProjectRegistry(projectId, projectRoot, remoteUrl, previousIds);

  return { projectId, projectRoot, projectDir, isGlobal: false, previousIds, previousProjects };
}

function getObserverPidFile(context) {
  return path.join(context.projectDir, '.observer.pid');
}

function getObserverSignalCounterFile(context) {
  return path.join(context.projectDir, '.observer-signal-counter');
}

function getObserverActivityFile(context) {
  return path.join(context.projectDir, '.observer-last-activity');
}

function getSessionLeaseDir(context) {
  return path.join(context.projectDir, '.observer-sessions');
}

function resolveSessionId(rawSessionId = process.env.FACTORY_SESSION_ID || process.env.CLAUDE_SESSION_ID) {
  return sanitizeSessionId(rawSessionId || '') || '';
}

function getSessionLeaseFile(context, rawSessionId = process.env.FACTORY_SESSION_ID || process.env.CLAUDE_SESSION_ID) {
  const sessionId = resolveSessionId(rawSessionId);
  if (!sessionId) return '';
  return path.join(getSessionLeaseDir(context), `${sessionId}.json`);
}

function writeSessionLease(context, rawSessionId = process.env.FACTORY_SESSION_ID || process.env.CLAUDE_SESSION_ID, extra = {}) {
  const leaseFile = getSessionLeaseFile(context, rawSessionId);
  if (!leaseFile) return '';

  ensureDir(getSessionLeaseDir(context));
  const payload = {
    sessionId: resolveSessionId(rawSessionId),
    cwd: process.cwd(),
    pid: process.pid,
    updatedAt: new Date().toISOString(),
    ...extra
  };
  fs.writeFileSync(leaseFile, JSON.stringify(payload, null, 2) + '\n');
  return leaseFile;
}

function removeSessionLease(context, rawSessionId = process.env.FACTORY_SESSION_ID || process.env.CLAUDE_SESSION_ID) {
  const leaseFile = getSessionLeaseFile(context, rawSessionId);
  if (!leaseFile) return false;
  try {
    fs.rmSync(leaseFile, { force: true });
    return true;
  } catch {
    return false;
  }
}

function listSessionLeases(context) {
  const leaseDir = getSessionLeaseDir(context);
  if (!fs.existsSync(leaseDir)) return [];
  return fs.readdirSync(leaseDir)
    .filter(name => name.endsWith('.json'))
    .map(name => path.join(leaseDir, name));
}

function stopObserverForContext(context) {
  const pidFile = getObserverPidFile(context);
  if (!fs.existsSync(pidFile)) return false;

  const pid = (fs.readFileSync(pidFile, 'utf8') || '').trim();
  if (!/^[0-9]+$/.test(pid) || pid === '0' || pid === '1') {
    fs.rmSync(pidFile, { force: true });
    return false;
  }

  try {
    process.kill(Number(pid), 0);
  } catch {
    fs.rmSync(pidFile, { force: true });
    return false;
  }

  try {
    process.kill(Number(pid), 'SIGTERM');
  } catch {
    return false;
  }

  fs.rmSync(pidFile, { force: true });
  fs.rmSync(getObserverSignalCounterFile(context), { force: true });
  return true;
}

module.exports = {
  resolveProjectContext,
  getObserverActivityFile,
  getObserverPidFile,
  getSessionLeaseDir,
  writeSessionLease,
  removeSessionLease,
  listSessionLeases,
  stopObserverForContext,
  resolveSessionId
};
