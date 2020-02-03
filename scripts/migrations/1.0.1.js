/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.1.0.1
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 1.0.1. Adds a field called
 * changePassword to users, which is a boolean denoting whether a user needs to
 * change their password or not. By default, all users created using the local
 * strategy must change their password on first sign in.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// MBEE modules
const User = M.require('models.user');

/**
 * @description Handles the database migration from 1.0.0 to 1.0.1.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await userHelper();
};

/**
 * @description Helper function for 1.0.0 to 1.0.1 migration. Handles all
 * updates to the users collection.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function userHelper() {
  const numUsers = await User.countDocuments({});

  if (numUsers > 0) {
    // Create data directory if it does not exist
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    const batchLimit = 5000;
    let batchSkip = 0;

    // Process batch of 5000 users
    for (let i = 0; i < numUsers / batchLimit; i++) {
      batchSkip = i * 5000;

      // eslint-disable-next-line no-await-in-loop
      const users = await User.find({}, null, { skip: batchSkip, limit: batchLimit });

      // Save all users to a JSON file in the data directory
      fs.writeFileSync(path.join(M.root, 'data', `users-101-${i}.json`), JSON.stringify(users));

      const bulkWrite = [];
      // Add 'changePassword' field to users
      users.forEach((user) => {
        bulkWrite.push({
          updateOne: {
            filter: { _id: user._id },
            update: { changePassword: false }
          }
        });
      });

      // Update all users
      await User.bulkWrite(bulkWrite); // eslint-disable-line no-await-in-loop

      // If the backup file exists, remove it
      if (fs.existsSync(path.join(M.root, 'data', `users-101-${i}.json`))) {
        fs.unlinkSync(path.join(M.root, 'data', `users-101-${i}.json`));
      }
    }
  }
}
