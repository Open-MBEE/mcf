#!/usr/bin/env node
/**
 * Classification: UNCLASSIFIED
 *
 * @module mbee.js
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines the MBEE CLI commands and sets up the
 * global M object.
 */

// Node Modules
const fs = require('fs');     // Access the filesystem
const path = require('path'); // Find directory paths

// Project Metadata
const pkg = require(path.join(__dirname, 'package.json'));

// The global MBEE helper object
global.M = {};

/**
 * Defines the environment based on the MBEE_ENV environment variable.
 * If the MBEE_ENV environment variable is not set, the default environment
 * is set to 'default'.
 */
Object.defineProperty(M, 'env', {
  value: process.env.MBEE_ENV || 'default',
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
 * Defines the 4-digit version number by combining the 3-digit version number
 * and appending the build number. If the build number does not exist, zero
 * is used.
 */
Object.defineProperty(M, 'version4', {
  value: RegExp('[0-9]+').test(M.build) ? `${M.version}.${M.build}` : `${M.version}.0`,
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
const parseJSON = M.require('lib.parse-json');
// Set configuration file path
const configPath = path.join(M.root, 'config', `${M.env}.cfg`);
// Read configuration file
const configContent = fs.readFileSync(configPath).toString();
// Remove comments from configuration string
const stripComments = parseJSON.removeComments(configContent);
// Parse configuration string into JSON object
const config = JSON.parse(stripComments);

// Check if config secret is RANDOM
if (config.server.secret === 'RANDOM') {
  // Config state is RANDOM, generate and set config secret
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  config.server.secret = random1 + random2;
}

/**
 * Define the MBEE configuration
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
  Object.defineProperty(M, 'log', {
    value: M.require('lib.logger'),
    writable: false,
    enumerable: true
  });

  // Initialize the CustomError Class
  Object.defineProperty(M, 'CustomError', {
    value: M.require('lib.errors').CustomError
  });
}

// Make the M object read only and its properties cannot be changed or removed.
Object.freeze(M);

// Invoke main
main();

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
  const tasks = ['clean', 'build', 'lint', 'start', 'test'];
  if (tasks.includes(subcommand)) {
    // eslint-disable-next-line global-require
    const task = require(path.join(M.root, 'scripts', subcommand));
    task(opts);
  }
  else {
    console.log('Unknown command'); // eslint-disable-line no-console
  }
}
