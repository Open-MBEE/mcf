/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.lint
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 *
 * @description Runs the linter.
 */

// Error Check - Check if file was run directly or global M object is undefined
if (module.parent == null || typeof M === 'undefined') {
  // File was run directly, print error message and exit process
  // eslint-disable-next-line no-console
  console.log('\nError: please use mbee to run this script by using the '
    + 'following command. \n\nnode mbee lint\n');
  process.exit(-1);
}

// Node modules
const { spawn } = require('child_process');

/**
 * @description Runs ESLint against the primary Javascript directories.
 *
 * @param {string} _args - Additional options to pass into the lint function.
 */
function lint(_args) {
  // Set default lint files and include additional args
  const args = [
    `${M.root}/*.js`,
    `${M.root}/app/**/*.js`,
    `${M.root}/app/**/*.jsx`,
    `${M.root}/plugins/*.js`,
    `${M.root}/scripts/**/*.js`,
    `${M.root}/test/**/*.js`
  ].concat(_args);

  // Run linter with specified args
  spawn(`${M.root}/node_modules/.bin/eslint`, args, { stdio: 'inherit' })
  .on('data', (data) => {
    // eslint-disable-next-line no-console
    console.log(data.toString());
  })
  .on('exit', (code) => {
    if (code !== 0) {
      process.exit(code);
    }
  });
}

module.exports = lint;
