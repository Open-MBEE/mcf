/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.clean
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Removes directories and files created during npm/yarn install,
 * node mbee build, and all log files.
 */

// Node.js modules
const { execSync } = require('child_process');
const path = require('path');

// Error Check - Check if file was run directly or global M object is undefined
if (module.parent == null || typeof M === 'undefined') {
  clean();
}

/**
 * @description Cleans project directory of non-persistent items. Removes the following
 * artifacts of a build:
 * - public directory
 * - docs directory
 * - logs
 * - node_modules
 *
 * The following flags are supported:
 * --logs
 * --docs
 * --public
 * --node-modules
 * --all
 *
 * If NO flags are provided, defaults to `--all`
 */
function clean(_args) {
  const root = path.join(__dirname, '../');

  // eslint-disable-next-line no-console
  console.log('Cleaning MBEE...');

  // Assign parameters to args. If no parameters, default to '--all'
  const args = (_args === undefined) ? [] : _args;

  // Clean logs
  if (args.length === 0 || args.includes('--all')) {
    execSync(`rm -rf ${root}/build ${root}/logs/*`);
  }

  // Clean node_modules
  if (args.includes('--all') || args.includes('--node-modules')) {
    execSync(`rm -rf ${root}/node_modules`);
  }

  // eslint-disable-next-line no-console
  console.log('MBEE Cleaned.');
}

module.exports = clean;
