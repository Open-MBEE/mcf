/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.10.0
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Migration script for version 0.10.0.
 */

// MBEE modules
const migrate = M.require('lib.migrate');

/**
 * @description Handles the database migration from 0.10.0 to 0.9.3.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.down = async function() {
  return migrate.shiftVersion('0.9.3');
};

/**
 * @description Handles the database migration from 0.9.3 to 0.10.0.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  return migrate.shiftVersion('0.10.0');
};
