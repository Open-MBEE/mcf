/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.test
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file executes the MBEE test suite with Mocha.
 */

// Node modules
const fs = require('fs');
const path = require('path');
const Mocha = require('mocha');

// If the application is run directly from node, notify the user and fail
if (module.parent == null) {
  // eslint-disable-next-line no-console
  console.log('\nError: please use mbee to run this script by using the '
    + 'following command. \n\nnode mbee test\n');
  process.exit(-1);
}

/**
 * @description Runs the collection of test suites script with Mocha.
 * Any command line accepted by Mocha is valid.
 */
function test(_args) {
  printHeader();
  M.log.verbose('Running tests on mongo instance...');
  M.log.verbose(`Mongo IP: ${M.config.db.url}:${M.config.db.port}`);
  M.log.verbose(`Mongo DB: ${M.config.db.name}`);

  // Remove --force from args
  if (_args.includes('--force')) {
    const removeInd = _args.indexOf('--force');
    _args.splice(removeInd, 1);
  }

  // Add default timeout if not provided
  if (!_args.includes('--timeout')) {
    _args.push('--timeout');
    _args.push('5000');
  }

  // Add default slow speed if not provided
  if (!_args.includes('--slow')) {
    _args.push('--slow');
    _args.push('19');
  }

  // Add default grep command to define which tests to run
  if (!_args.includes('--grep')) {
    _args.push('--grep');
    _args.push('^[1-5]');
  }

  // Allocate options variable for mocha
  const opts = {};

  // Loop through _args array and load the opts object
  for (let i = 0; i < _args.length; i += 2) {
    // Check the arg starts with '--'
    if (RegExp(/^(--)/).test(_args[i])) {
      // The arg started with '--', remove '--' and load the arg in to the opts
      // object as a key with the following arg as the value
      opts[_args[i].replace('--', '')] = _args[i + 1];
    }
    else {
      // The arg did NOT start with '--', log the error and exit the process
      M.log.error(`invalid argument (${_args[i]})`);
      process.exit(-1);
    }
  }

  // Create mocha object with options
  const mocha = new Mocha(opts);
  // Set the test directory
  const testDir = `${M.root}/test`;

  // Call the mochaWalk function to load in all of the test files
  mochaWalk(testDir, mocha);

  // Run the tests.
  mocha.run((error) => {
    // Check for failures
    if (error) {
      // mocha did not pass all test, exit with error code -1
      process.exit(-1);
    }
    else {
      // mocha passed all tests, exit with error code 0
      process.exit(0);
    } // if (failures) {}
  });
}


/**
 * Prints the MBEE test framework header.
 */
function printHeader() {
  const Y = '\u001b[33m';
  const W = '\u001b[39m';
  const G = '\u001b[37m';
  const date = new Date(Date.now()).toUTCString();
  const title = '\u001b[1mModel-Based Engineering Environment Test Framework\u001b[0m';

  console.log('_'.repeat(65)); // eslint-disable-line no-console
  console.log(` ${G},-.${W} `); // eslint-disable-line no-console
  console.log(` ${G}\\_/${W} \t ${title}`); // eslint-disable-line no-console
  console.log(`${Y}{|||)${W}${G}<${W} `); // eslint-disable-line no-console
  console.log(` ${G}/ \\${W} \t Version: ${M.version}`); // eslint-disable-line no-console
  console.log(` ${G}\`-'${W} \t Date: ${date}`); // eslint-disable-line no-console
  console.log('_'.repeat(65)); // eslint-disable-line no-console
  console.log(''); // eslint-disable-line no-console
}

/**
 * @description The mocha walk function is responsible for loading .js files into mocha
 * for use during tests
 */
function mochaWalk(dir, mochaObj) {
  // Read the current directory and use a callback to filter the results
  fs.readdirSync(dir).filter((file) => {
    // Check if the file is actually a directory
    if (fs.lstatSync(path.join(dir, file)).isDirectory()) {
      // The file is actually a directory, call mochaWalk recursively with the
      // full path of the directory
      mochaWalk(path.join(dir, file), mochaObj);
    }
    // Return true to the filter if the file is a javascript file
    return file.substr(-3) === '.js';
  })
  // Loop through the resulting array of files
  .forEach(function(file) {
    // Add the full path and filename to mocha
    mochaObj.addFile(path.join(dir, file));
  });
}

module.exports = test;
