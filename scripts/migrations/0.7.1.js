/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.7.1
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 0.7.1.
 */

// MBEE modules
const migrate = M.require('lib.migrate');

/**
 * @description Handles the database migration from 0.7.1 to 0.7.0.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.down = function() {
  return migrate.shiftVersion('0.7.0');
};

/**
 * @description Handles the database migration from 0.7.0 to 0.7.1.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  return migrate.shiftVersion('0.7.1');
};
