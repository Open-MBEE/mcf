/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.8.2
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 0.8.2. Removes the
 * projectReferences field from every project in the database.
 */

// MBEE modules
const Project = M.require('models.project');
const migrate = M.require('lib.migrate');

/**
 * @description Handles the database migration from 0.8.2 to 0.8.1.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.down = async function() {
  return migrate.shiftVersion('0.8.1');
};

/**
 * @description Handles the database migration from 0.8.1 to 0.8.2. Remove the
 * projectReferences field from every project.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await projectHelper();
  return migrate.shiftVersion('0.8.2');
};

/**
 * @description Helper function for 0.8.1 to 0.8.2 migration. Handles all
 * updates to the project collection.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function projectHelper() {
  return new Promise((resolve, reject) => {
    // Remove the projectReferences field from all projects.
    Project.updateMany({}, { $unset: { projectReferences: '' } })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
