#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const { listAvailableLanguages } = require('./lib/install-executor');

const COMMANDS = {
  install: {
    script: 'install-apply.js',
    description: 'Install EFD content into a supported target',
  },
  plan: {
    script: 'install-plan.js',
    description: 'Inspect selective-install manifests and resolved plans',
  },
  catalog: {
    script: 'catalog.js',
    description: 'Discover install profiles and component IDs',
  },
  'install-plan': {
    script: 'install-plan.js',
    description: 'Alias for plan',
  },
  'list-installed': {
    script: 'list-installed.js',
    description: 'Inspect install-state files for the current context',
  },
  doctor: {
    script: 'doctor.js',
    description: 'Diagnose missing or drifted EFD-managed files',
  },
  repair: {
    script: 'repair.js',
    description: 'Restore drifted or missing EFD-managed files',
  },
  status: {
    script: 'status.js',
    description: 'Query the EFD SQLite state store status summary',
  },
  sessions: {
    script: 'sessions-cli.js',
    description: 'List or inspect EFD sessions from the SQLite state store',
  },
  'session-inspect': {
    script: 'session-inspect.js',
    description: 'Emit canonical EFD session snapshots from supported history targets',
  },
  uninstall: {
    script: 'uninstall.js',
    description: 'Remove EFD-managed files recorded in install-state',
  },
};

const PRIMARY_COMMANDS = [
  'install',
  'plan',
  'catalog',
  'list-installed',
  'doctor',
  'repair',
  'status',
  'sessions',
  'session-inspect',
  'uninstall',
];

function showHelp(exitCode = 0) {
  console.log(`
EFD selective-install CLI

Usage:
  efd <command> [args...]
  efd [install args...]

Commands:
${PRIMARY_COMMANDS.map(command => `  ${command.padEnd(15)} ${COMMANDS[command].description}`).join('\n')}

Compatibility:
  efd-install        Legacy install entrypoint retained for existing flows
  efd [args...]      Without a command, args are routed to "install"
  efd help <command> Show help for a specific command

Examples:
  efd typescript
  efd install --profile developer --target factory-droid
  efd plan --profile core --target factory-droid
  efd catalog profiles
  efd catalog components --family language
  efd catalog show framework:nextjs
  efd list-installed --json
  efd doctor --target factory-droid
  efd repair --dry-run
  efd status --json
  efd sessions
  efd sessions session-active --json
  efd session-inspect factory:latest
  efd uninstall --target factory-droid --dry-run
`);

  process.exit(exitCode);
}

function resolveCommand(argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    return { mode: 'help' };
  }

  const [firstArg, ...restArgs] = args;

  if (firstArg === '--help' || firstArg === '-h') {
    return { mode: 'help' };
  }

  if (firstArg === 'help') {
    return {
      mode: 'help-command',
      command: restArgs[0] || null,
    };
  }

  if (COMMANDS[firstArg]) {
    return {
      mode: 'command',
      command: firstArg,
      args: restArgs,
    };
  }

  const knownLegacyLanguages = listAvailableLanguages();
  const shouldTreatAsImplicitInstall = (
    firstArg.startsWith('-')
    || knownLegacyLanguages.includes(firstArg)
  );

  if (!shouldTreatAsImplicitInstall) {
    throw new Error(`Unknown command: ${firstArg}`);
  }

  return {
    mode: 'command',
    command: 'install',
    args,
  };
}

function runCommand(commandName, args) {
  const command = COMMANDS[commandName];
  if (!command) {
    throw new Error(`Unknown command: ${commandName}`);
  }

  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, command.script), ...args],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (typeof result.status === 'number') {
    return result.status;
  }

  if (result.signal) {
    throw new Error(`Command "${commandName}" terminated by signal ${result.signal}`);
  }

  return 1;
}

function main() {
  try {
    const resolution = resolveCommand(process.argv);

    if (resolution.mode === 'help') {
      showHelp(0);
    }

    if (resolution.mode === 'help-command') {
      if (!resolution.command) {
        showHelp(0);
      }

      if (!COMMANDS[resolution.command]) {
        throw new Error(`Unknown command: ${resolution.command}`);
      }

      process.exitCode = runCommand(resolution.command, ['--help']);
      return;
    }

    process.exitCode = runCommand(resolution.command, resolution.args);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
