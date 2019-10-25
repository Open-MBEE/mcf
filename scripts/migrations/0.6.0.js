/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.6.0
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 0.6.0.
 */

// MBEE modules
const migrate = M.require('lib.migrate');

/**
 * @description Handles the database migration from 0.6.0 to 0.5.0. This drop in
 * versions is currently not supported.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.down = async function() {
  return migrate.shiftVersion('0.5.0');
};

/**
 * @description Handles the database migration from 0.5.0 to 0.6.0. This upgrade
 * in versions is currently not supported.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  return migrate.shiftVersion('0.6.0');
};
