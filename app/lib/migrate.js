/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.migrate
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Supports the ability to migrate the database between specific
 * versions.
 */

// Node modules
const fs = require('fs');
const path = require('path');
const process = require('process');

// NPM modules
const mongoose = require('mongoose');

/**
 * @description Handles database migrations from a specific version, to a
 * specific version
 *
 * @params {string[]} args - An array of command line arguments.
 */
module.exports.migrate = function(args) {
  return new Promise((resolve, reject) => {
    let toVersion = null;
    // Set fromVersion to earliest version
    let fromVersion = '0.6.0';
    let sortedMigrations = null;
    let versionComp = null;


    // Prompt the user for input
    prompt(args)
    // Get the server_data collection
    .then(() => mongoose.connection.db.collection('server_data').find({}).toArray())
    .then((serverData) => {
      // Restrict collection to one document
      if (serverData.length > 1) {
        throw new Error('Cannot have more than one document in the server_data collection.');
      }

      // If --to was provided
      if (args.includes('--to')) {
        // Get argument after --to, which should be a version
        toVersion = args[args.indexOf('--to') + 1];
        // Check if toVersion is a valid version
        if (!validateVersion(toVersion)) {
          M.log.warn(`${toVersion} is not a valid version number.`);
          return;
        }
      }
      else {
        // Set the toVersion to the most recent schema version
        toVersion = M.schemaVersion;
      }

      // One document exists, read and compare versions
      if (serverData.length !== 0 && serverData[0].version === toVersion) {
        return 'Database already up to date.';
      }
      // Set fromVersion to the current schema version
      if (serverData.length !== 0 && serverData[0].version) {
        fromVersion = serverData[0].version;
      }

      // Get version comparison value
      versionComp = compareVersions(fromVersion, toVersion);

      // If versions are the same, return
      if (versionComp === 0) {
        return 'Database migration complete.';
      }

      // Get a list of migrations
      let migrations = fs.readdirSync(path.join(M.root, 'scripts', 'migrations'));
      // Remove .js from each file
      migrations = migrations.map(f => {
        const parts = f.split('.js');
        return parts[0];
      });

      // Sort migrations from oldest to newest
      sortedMigrations = sortVersions(migrations, versionComp);

      // If no migration exists for the toVersion
      if (toVersion !== null && !sortedMigrations.includes(toVersion)) {
        M.log.warn(`No migration script exists for version ${toVersion}`);
        return;
      }

      // If no migration exists for the fromVersion
      if (fromVersion !== null && !sortedMigrations.includes(fromVersion)) {
        M.log.warn(`No migration script exists for version ${fromVersion}`);
        return;
      }

      // Remove migrations below fromVersion
      while (sortedMigrations[0] !== fromVersion) {
        sortedMigrations.shift();
      }
      // If upgrading, remove the first migration one more time
      if (versionComp === 1) {
        sortedMigrations.shift();
      }

      // Remove migrations after toVersion
      while (sortedMigrations[sortedMigrations.length - 1] !== toVersion) {
        sortedMigrations.pop();
      }
      // If downgrading, remove the last migration one more time
      if (versionComp === -1) {
        sortedMigrations.pop();
      }
      // Run the migrations
      return runMigrations(fromVersion, sortedMigrations, versionComp);
    })
    .then((statusCode) => {
      if (statusCode) {
        M.log.info(statusCode);
      }
      else {
        M.log.info('Database migration complete.');
      }
      return resolve();
    })
    .catch((error) => {
      M.log.debug(error);
      M.log.warn('Database migration failed. See debug log for more details.');
      return reject(error);
    });
  });
};


/**
 * @description Prompts the user for approval to migrate the database
 *
 * @param {string[]} args - Array of command line arguments
 */
function prompt(args) {
  return new Promise((resolve) => {
    // If arg -y provided, resolve
    if (args.includes('-y')) {
      return resolve();
    }

    // eslint-disable-next-line no-console
    console.log('Are you sure you want to migrate database versions? Press any key to continue. '
      + 'Press ^C to cancel.');

    // Get user input
    const userInput = process.stdin;
    userInput.setEncoding('utf-8');

    // If user hits any key other than ^C, resolve
    userInput.on('data', () => resolve());
  });
}

/**
 * @description A non-exposed helper function that checks if a provided version
 * number is valid.
 *
 * @param {string} version - The version number to check.
 *
 * @return {boolean} Valid version or not.
 */
function validateVersion(version) {
  // Ensure version is a string
  if (typeof version !== 'string') {
    return false;
  }

  // Split version by '.'
  const numbers = version.split('.');

  // Check if every value is a number and return that boolean
  return numbers.every(n => !isNaN(Number(n))); // eslint-disable-line no-restricted-globals
}

/**
 * @description A non-exposed helper function that check two versions and
 * returns an integer dictating whether they are greater than, less than, or
 * equal to each other.
 *
 * @param {string} from - The version the user is migrating from.
 * @param {string} to - The version the user is migrating to.
 *
 * @return {number} An integer which represent comparison of versions. The
 * values are as follows: -1 (from > to), 0 (from = to), 1 (from < to)
 */
function compareVersions(from, to) {
  // If to is null, upgrading to highest version, return 1
  if (to === null) {
    return 1;
  }

  // Split versions by '.'
  const fromNumbers = from.split('.').map(n => Number(n));
  const toNumbers = to.split('.').map(n => Number(n));

  // Loop through each array and remove trailing 0's
  for (let i = fromNumbers.length - 1; i > -1; i--) {
    if (fromNumbers[i] === 0) {
      fromNumbers.pop();
    }
    // No more trailing 0s, break from loop
    else {
      break;
    }
  }
  for (let i = toNumbers.length - 1; i > -1; i--) {
    if (toNumbers[i] === 0) {
      toNumbers.pop();
    }
    // No more trailing 0s, break from loop
    else {
      break;
    }
  }

  // Get the length for the for loop, whichever array is larger
  const loopLength = (fromNumbers.length > toNumbers.length)
    ? fromNumbers.length
    : toNumbers.length;

  // Loop through each number
  for (let i = 0; i < loopLength; i++) {
    // From version is grater, return -1
    if (toNumbers[i] === undefined || fromNumbers[i] > toNumbers[i]) {
      return -1;
    }
    // From version is less, return 1
    if (fromNumbers[i] === undefined || fromNumbers[i] < toNumbers[i]) {
      return 1;
    }
  }

  // Versions are the same, return 0
  return 0;
}

/**
 * @description A non-exposed helper function that sorts a list of versions from
 * oldest to newest.
 *
 * @param {string[]} versions - A list of versions.
 * @param {number} order - The order of the list.
 *
 * @return {string[]} A list of sorted versions.
 */
function sortVersions(versions, order) {
  const sorted = versions.sort((a, b) => compareVersions(b, a));

  return (order === -1) ? sorted.reverse() : sorted;
}

/**
 * @description A non-exposed helper function which recursively runs a list of
 * migrations in order.
 *
 * @param {string} from - The current version migrating from.
 * @param {string[]} migrations - The list of migrations to run.
 * @param {number} move - Either 1 (migrate up) or -1 (migrate down)
 *
 * @return {Promise} Resolved promise.
 */
function runMigrations(from, migrations, move) {
  return new Promise((resolve, reject) => {
    // Remove first migration from array
    const file = `${migrations.shift()}.js`;
    // eslint-disable-next-line global-require
    const migrationScript = require(path.join(M.root, 'scripts', 'migrations', file));

    // If migrating up
    if (move === 1) {
      // Check if migration script has an 'up' function
      if (!Object.keys(migrationScript).includes('up')
        || typeof migrationScript.up !== 'function') {
        throw new `Migration script ${file} does not have an 'up' function.`();
      }

      // Run up migration
      M.log.info(`Upgrading from version ${from} to ${file.split('.js')[0]}.`);
      migrationScript.up()
      .then(() => {
        M.log.info(`Successfully migrated to version ${file.split('.js')[0]}.`);
        // If no more migrations left, resolve
        if (migrations.length === 0) {
          return resolve();
        }

        // Migrations are left, run function again
        return runMigrations(file.split('.js')[0], migrations, move);
      })
      .then(() => resolve())
      .catch((error) => reject(error));
    }
    else {
      // Check if migration script has an 'down' function
      if (!Object.keys(migrationScript).includes('down')
        || typeof migrationScript.down !== 'function') {
        throw new `Migration script ${file} does not have a 'down' function.`();
      }

      // Run down migration
      migrationScript.down()
      .then(() => {
        // If no more migrations left, resolve
        if (migrations.length === 0) {
          return resolve();
        }

        // Migrations are left, run function again
        return runMigrations(file.split('.js')[0], migrations, move);
      })
      .then(() => resolve())
      .catch((error) => reject(error));
    }
  });
}

/**
 * @description Gets the schema version from the database. Runs the migrate
 * function if no schema version exists.
 */
module.exports.getSchemaVersion = function() {
  return new Promise((resolve, reject) => {
    // Get all collections in the DB
    mongoose.connection.db.collections()
    .then((collections) => {
      // Get all collection names
      const existingCollections = collections.map(c => c.s.name);
      // Create the server_data collection if it doesn't exist
      if (!existingCollections.includes('server_data')) {
        return mongoose.connection.db.createCollection('server_data');
      }
    })
    // Get all documents from the server data
    .then(() => mongoose.connection.db.collection('server_data').find({}).toArray())
    .then((serverData) => {
      // Restrict collection to one document
      if (serverData.length > 1) {
        throw new Error('Cannot have more than one document in the server_data collection.');
      }
      // No server data found, automatically upgrade versions
      if (serverData.length === 0) {
        M.log.info('No server data found, automatically migrating.');
        return this.migrate([]);
      }
      // One document exists, read and compare versions
      if (serverData.length === 0 || serverData[0].version !== M.schemaVersion) {
        throw new Error('Please run \'node mbee migrate\' to migrate the '
          + 'database.');
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};
