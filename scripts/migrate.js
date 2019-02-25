#!/usr/bin/env node
/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.migrate
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Supports the ability to migrate the database between specific
 * versions.
 */

// MBEE modules
const libMigrate = M.require('lib.migrate');
const db = M.require('lib.db');

/**
 * @description Runs the migrate function from lib.migrate and finished the
 * process upon completion.
 *
 * @param {string[]} args - The user provided command line arguments.
 */
function migrate(args) {
  // Connect to the database
  db.connect()
  .then(() => libMigrate.migrate(args))
  .then(() => db.disconnect())
  .then(() => process.exit(0))
  .catch((error) => {
    M.log.critical(error);
    db.disconnect();
    process.exit(1);
  });
}

module.exports = migrate;
