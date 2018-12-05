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

// Error Check - Check if file was run directly or global M object is undefined
if (module.parent == null || typeof M === 'undefined') {
  // File was run directly, print error message and exit process
  // eslint-disable-next-line no-console
  console.log('\nError: please use mbee to run this script by using the '
    + 'following command. \n\nnode mbee clean\n');
  process.exit(-1);
}

// Node.js modules
const { execSync } = require('child_process');


/**
 * @description Cleans project directory of non-persistent items.
 */
function clean(_args) {
  // Assign parameters to args. If no parameters, default to '--all'
  const args = (_args === undefined) ? [] : _args;

  // Clean logs
  if (args.length === 0 || args.includes('--all')) {
    execSync(`rm -rf ${M.root}/build ${M.root}/logs/*`);
  }

  // Clean node_modules
  if (args.includes('--all') || args.includes('--node-modules')) {
    execSync(`rm -rf ${M.root}/node_modules`);
  }
}

module.exports = clean;
