#!/usr/bin/env node
/**
 * @classification UNCLASSIFIED
 *
 * @module mbee.js
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Austin Bieber
 * @author Connor Doyle
 *
 * @description This file defines the MBEE CLI commands and sets up the
 * global M object.
 */

// Node modules
const fs = require('fs');                       // Access the filesystem
const path = require('path');                   // Find directory paths
const { execSync } = require('child_process');  // Execute shell commands

// Project Metadata
const pkg = require(path.join(__dirname, 'package.json'));


// The global MBEE helper object
global.M = {};

// Get the environment. By default, the environment is 'default'
let env = 'default';
// If a environment is set, use that
if (process.env.MBEE_ENV) {
  env = process.env.MBEE_ENV;
}
// If a dev config exists, use it over the default
else if (fs.existsSync(path.join(__dirname, 'config', 'dev.cfg'))) {
  env = 'dev';
}

/**
 * Defines the environment based on the MBEE_ENV environment variable.
 * If the MBEE_ENV environment variable is not set, and a dev config does not
 * exist, the default environment is set to 'default'.
 */
Object.defineProperty(M, 'env', {
  value: env,
  writable: false,
  enumerable: true
});

/**
 * Defines the MBEE version by pulling the version field from the package.json.
 */
Object.defineProperty(M, 'version', {
  value: pkg.version,
  writable: false,
  enumerable: true
});

/**
 * Defines the build number by pulling the 'build' field from the package.json.
 * The default value if the build field does not exist is 'NO_BUILD_NUMBER'.
 */
Object.defineProperty(M, 'build', {
  value: (pkg.hasOwnProperty('build')) ? pkg.build : 'NO_BUILD_NUMBER',
  writable: false,
  enumerable: true
});

/**
 * Defines the last commit hash by calling the git command `git rev-parse HEAD`.
 * If the commit cannot be retrieved it is set to an empty string.
 */
let commit = '';
try {
  commit = execSync('git rev-parse HEAD').toString();
}
catch (err) {
  // Do nothing
}
Object.defineProperty(M, 'commit', {
  value: commit,
  writable: false,
  enumerable: true
});

/**
 * This function provides a utility function for requiring other MBEE modules in
 * the app directory. The global-require is explicitly disabled here due to the
 * nature of this function.
 */
Object.defineProperty(M, 'require', {
  value: m => {
    const mod = m.split('.').join(path.sep);
    const p = path.join(__dirname, 'app', mod);
    return require(p); // eslint-disable-line global-require
  },
  writable: false,
  enumerable: true
});

/**
 * Given a filename (typically passed in as module.filename),
 * return the module name.
 */
Object.defineProperty(M, 'getModuleName', {
  value: fname => fname.split(path.sep)[fname.split(path.sep).length - 1],
  writable: false,
  enumerable: true
});

// Set root and other path variables
Object.defineProperty(M, 'root', {
  value: __dirname,
  writable: false,
  enumerable: true
});

// Load the parseJSON library module.
const configUtils = M.require('lib.config-utils');
// Set configuration file path
const configPath = path.join(M.root, 'config', `${M.env}.cfg`);
// Read configuration file
const configContent = fs.readFileSync(configPath).toString();
// Remove comments from configuration string
const stripComments = configUtils.removeComments(configContent);
// Parse configuration string into JSON object
const config = JSON.parse(stripComments);
// Parse custom validator regex
configUtils.parseRegEx(config);

/**
 * Define the MBEE configuration.
 */
Object.defineProperty(M, 'config', {
  value: config,
  writeable: false,
  enumerable: true
});

// Check if the module/build folder exist
const installComplete = fs.existsSync(`${M.root}/node_modules`);
const buildComplete = fs.existsSync(`${M.root}/build`);

// Check if dependencies are installed
if (installComplete) {
  // Initialize the MBEE logger/helper functions
  const opts = process.argv[3] ? process.argv.slice(3) : [];
  const logger = M.require('lib.logger');
  Object.defineProperty(M, 'log', {
    value: logger.makeLogger(process.argv[2], opts),
    writable: false,
    enumerable: true
  });

  // Initialize the custom error classes
  Object.defineProperties(M, {
    DataFormatError: {
      value: M.require('lib.errors').DataFormatError
    },
    OperationError: {
      value: M.require('lib.errors').OperationError
    },
    AuthorizationError: {
      value: M.require('lib.errors').AuthorizationError
    },
    PermissionError: {
      value: M.require('lib.errors').PermissionError
    },
    NotFoundError: {
      value: M.require('lib.errors').NotFoundError
    },
    ServerError: {
      value: M.require('lib.errors').ServerError
    },
    DatabaseError: {
      value: M.require('lib.errors').DatabaseError
    },
    NotImplementedError: {
      value: M.require('lib.errors').NotImplementedError
    }
  });
}

let memoryLimit = 512;
// Loop through the node flags
process.execArgv.forEach((arg) => {
  // If the memory limit was changed, set the new limit
  if (arg.startsWith('--max-old-space-size=')) {
    memoryLimit = Number(arg.split('--max-old-space-size=')[1]);
  }
});

/**
 * Defines the memory limit which the node process is running with. The default
 * limit is 512 MB, although it can be changed by passing in the flag
 * --max-old-space-size={new limit in MB} when starting the process.
 */
Object.defineProperty(M, 'memoryLimit', {
  value: memoryLimit,
  writable: false,
  enumerable: true
});


// Validate the config file
try {
  configUtils.validate(config);
}
catch (error) {
  M.log.critical(error.message);
  process.exit(-1);
}

// Check if config secret is RANDOM
if (config.server.secret === 'RANDOM') {
  // Config state is RANDOM, generate and set config secret
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  config.server.secret = random1 + random2;
}

// Make the M object read only and its properties cannot be changed or removed.
Object.freeze(M);

// Invoke main
main();

/**
 * @description The main function that takes in arguments and either starts the MBEE server
 * or runs one of the custom MBEE scripts.
 */
function main() {
  // Set argument commands for use in configuration lib and main function
  // Example: node mbee.js <subcommand> <opts>
  const subcommand = process.argv[2];
  const opts = process.argv.slice(3);

  // Check for start command and build NOT completed
  if (!installComplete) {
    // eslint-disable-next-line no-console
    console.log('\n  Error: Must install modules before attempting to run other commands.'
      + '\n\n  yarn install or npm install\n\n');
    process.exit(0);
  }

  // Check for start command and build NOT completed
  if (subcommand === 'start' && !buildComplete) {
    // eslint-disable-next-line no-console
    console.log('\n  Error: Must run build command before attempting to run start.'
      + '\n\n  node mbee build\n\n');
    process.exit(0);
  }
  const tasks = ['clean', 'build', 'lint', 'docker', 'start', 'test', 'migrate'];
  if (tasks.includes(subcommand)) {
    // eslint-disable-next-line global-require
    const task = require(path.join(M.root, 'scripts', subcommand));
    task(opts);
  }
  else {
    console.log('Unknown command'); // eslint-disable-line no-console
  }
}

// Define process.exit() listener
process.on('exit', (code) => {
  // If process run was "start", log termination
  if (process.argv[2] === 'start') {
    // Log the termination of process along with exit code
    M.log.info(`Exiting with code: ${code}`);
  }
});

// Define SIGINT listener, fired when using ctrl + c
process.on('SIGINT', () => {
  M.log.verbose('Exiting from SIGINT');
  // Exit with code 0, as this was user specified exit and nothing is wrong
  // and catching this signal stops termination
  process.exit(0);
});
