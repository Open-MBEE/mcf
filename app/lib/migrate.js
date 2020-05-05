/**
 * @classification UNCLASSIFIED
 *
 * @module lib.migrate
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Supports the ability to migrate the database between specific
 * versions.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// MBEE modules
const Artifact = M.require('models.artifact');
const Branch = M.require('models.branch');
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const ServerData = M.require('models.server-data');
const User = M.require('models.user');
const Webhook = M.require('models.webhook');
const db = M.require('db');

/**
 * @description Handles database migrations from a specific version, to a
 * specific version.
 *
 * @param {string[]} args - An array of command line arguments.
 *
 * @returns {Promise} Resolves an empty promise upon completion.
 */
module.exports.migrate = async function(args) {
  try {
    // Set fromVersion to earliest version
    let fromVersion = '0.6.0';

    // Prompt the user for input
    await prompt(args);

    // Initialize models
    await Promise.all([Artifact.init(), Branch.init(), Element.init(),
      Organization.init(), Project.init(), ServerData.init(), User.init(),
      Webhook.init()]);

    // Get the server data documents
    const serverData = await ServerData.find({}, null);

    // Restrict collection to one document
    if (serverData.length > 1) {
      throw new Error('Cannot have more than one server data document.');
    }

    // One document exists, read and compare versions
    if (serverData.length !== 0 && serverData[0].version === M.version) {
      return 'Database already up to date.';
    }
    // Set fromVersion to the current schema version
    if (serverData.length !== 0 && serverData[0].version) {
      fromVersion = serverData[0].version;
    }

    // A list of MCF versions
    const knownVersions = ['0.6.0', '0.6.0.1', '0.7.0', '0.7.1', '0.7.2', '0.7.3',
      '0.7.3.1', '0.8.0', '0.8.1', '0.8.2', '0.8.3', '0.9.0', '0.9.1', '0.9.2',
      '0.9.3', '0.9.4', '0.9.5', '0.10.0', '0.10.1', '0.10.2', '0.10.3',
      '0.10.4', '0.10.5', '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.1.0'];

    // Run the migrations
    await runMigrations(knownVersions.slice(knownVersions.indexOf(fromVersion) + 1));
    M.log.info('DATABASE MIGRATION COMPLETE.');
  }
  catch (error) {
    M.log.debug(error);
    M.log.warn('Database migration failed. See debug log for more details.');
    throw error;
  }
};


/**
 * @description Prompts the user for approval to migrate the database.
 *
 * @param {string[]} args - Array of command line arguments.
 *
 * @returns {Promise} Resolves an empty promise upon completion.
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
 * @description A non-exposed helper function which migrates through a list of
 * versions.
 *
 * @param {string[]} versions - An array of versions to migrate through.
 *
 * @returns {Promise} Resolved promise.
 */
async function runMigrations(versions) {
  try {
    // For each version to migrate
    for (let i = 0; i < versions.length; i++) {
      const migrationPath = path.join(M.root, 'scripts', 'migrations', `${versions[i]}.js`);
      const strategyMigrationPath = path.join(M.root, 'app', 'db',
        M.config.db.strategy, 'migrations', `${versions[i]}.js`);

      // If a base migration exists
      if (fs.existsSync(migrationPath)) {
        const migrationScript = require(migrationPath); // eslint-disable-line global-require

        M.log.info(`Running migration ${versions[i]}`);
        if (migrationScript.hasOwnProperty('up') && typeof migrationScript.up === 'function') {
          await migrationScript.up(); // eslint-disable-line no-await-in-loop
        }
        M.log.info(`Migration ${versions[i]} complete`);
      }

      // If there is a database specific migration to run
      if (fs.existsSync(strategyMigrationPath)) {
        const migrationScript = require(strategyMigrationPath); // eslint-disable-line

        M.log.info(`Running database specific migration ${versions[i]}`);
        if (migrationScript.hasOwnProperty('up') && typeof migrationScript.up === 'function') {
          await migrationScript.up(); // eslint-disable-line no-await-in-loop
        }
        M.log.info(`Database specific migration ${versions[i]} complete`);
      }

      // Upgrade schema version number
      await ServerData.deleteMany({}); // eslint-disable-line no-await-in-loop
      await ServerData.insertMany([{ _id: 'server_data', version: versions[i] }]); // eslint-disable-line
      M.log.info(`Upgraded to version ${versions[i]}.`);
    }
  }
  catch (error) {
    throw error;
  }
}

/**
 * @description Gets the schema version from the database. Runs the migrate
 * function if no schema version exists.
 *
 * @returns {Promise} Resolves an empty promise upon completion.
 */
module.exports.getVersion = async function() {
  try {
    // Get all documents from the server data
    const serverData = await ServerData.find({}, null);

    // Restrict collection to one document
    if (serverData.length > 1) {
      throw new Error('Cannot have more than one server data document.');
    }
    // No server data found
    if (serverData.length === 0) {
      // Get a count of all documents in the database
      let count = 0;

      // Count ALL documents in the database
      count += await Artifact.countDocuments({});
      count += await Branch.countDocuments({});
      count += await Element.countDocuments({});
      count += await Organization.countDocuments({});
      count += await Project.countDocuments({});
      count += await User.countDocuments({});

      // If there are documents in the database, migrate from version 0.6.0
      if (count !== 0) {
        M.log.info('No server data found, automatically migrating.');
        return this.migrate([]);
      }
      // No documents in the database... Assume first time running.
      else {
        // Clear the database to ensure any old indexes are removed
        await db.clear();

        // Re-initialize models
        await Promise.all([Artifact.init(), Branch.init(), Element.init(),
          Organization.init(), Project.init(), ServerData.init(), User.init(),
          Webhook.init()]);

        // Insert server data document, with current schema version
        await ServerData.insertMany({ _id: 'server_data', version: M.version });
      }
    }
    // One document exists, read and compare versions
    else if (serverData[0].version !== M.version) {
      throw new Error('Please run \'node mbee migrate\' to migrate the '
        + 'database.');
    }
  }
  catch (error) {
    throw error;
  }
};
