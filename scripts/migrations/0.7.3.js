/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.7.2
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Leah De Laurell
 *
 * @description Migration script for version 0.7.3.
 */

// MBEE modules
const User = M.require('models.user');

/**
 * @description Handles the database migration from 0.7.2 to 0.7.3.
 * If the username index in the users collection exists, the
 * username index is removed.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await twoToThreeUserHelper();
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
