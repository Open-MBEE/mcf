/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.7.2
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 * @author Leah De Laurell
 *
 * @description Migration script for version 0.7.3.
 */

// MBEE modules
const User = M.require('models.user');
const migrate = M.require('lib.migrate');

/**
 * @description Handles the database migration from 0.7.3 to 0.7.2.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.down = async function() {
  return migrate.shiftVersion('0.7.2');
};

/**
 * @description Handles the database migration from 0.7.2 to 0.7.3.
 * If the username index in the users collection exists, the
 * username index is removed.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await twoToThreeUserHelper();
  return migrate.shiftVersion('0.7.3');
};

/**
 * @description Helper function for 0.7.2 to 0.7.3 migration. Handles all
 * updates to the users collection.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function twoToThreeUserHelper() {
  return new Promise((resolve, reject) => {
    // Get all indexes from the users data
    User.getIndexes()
    .then((indexes) => {
      const promises = [];
      // Loop through the found indexes
      indexes.forEach((index) => {
        // If unique ID index exists, delete from users collection
        if (index.name === 'username_1') {
          promises.push(User.deleteIndex('username_1'));
        }
      });

      // Return when all organization indexes have been dropped
      return Promise.all(promises);
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
