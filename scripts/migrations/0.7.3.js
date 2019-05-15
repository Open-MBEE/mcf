/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.migrations.0.7.2
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Migration script for version 0.7.3
 */

// Node modules
const mongoose = require('mongoose');

/**
 * @description Handles the database migration from 0.7.3 to 0.7.2.
 */
module.exports.down = function() {
  return new Promise((resolve, reject) => {
    // Get all documents from the server data
    mongoose.connection.db.collection('server_data').find({}).toArray()
    .then((serverData) => {
      // Restrict collection to one document
      if (serverData.length > 1) {
        throw new Error('Cannot have more than one document in the server_data collection.');
      }
      // If no server data currently exists, create the document
      if (serverData.length === 0) {
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.7.2' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.7.2' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};

/**
 * @description Handles the database migration from 0.7.2 to 0.7.3.
 * If the username index in the users collection exists, the
 * username index is removed.
 */
module.exports.up = function() {
  return new Promise((resolve, reject) => {
    mongoose.connection.db.collections()
    .then((existingCollections) => {
      // If the users collection exists, run the helper function
      if (existingCollections.includes('users')) {
        return twoToThreeUserHelper();
      }
    })
    // Get all documents from the server data
    .then(() => mongoose.connection.db.collection('server_data').find({}).toArray())
    .then((serverData) => {
      // Restrict collection to one document
      if (serverData.length > 1) {
        throw new Error('Cannot have more than one document in the server_data collection.');
      }
      // If no server data currently exists, create the document
      if (serverData.length === 0) {
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.7.3' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.7.3' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function for 0.7.2 to 0.7.3 migration. Handles all
 * updates to the users collection.
 */
function twoToThreeUserHelper() {
  return new Promise((resolve, reject) => {
    // Get all indexes from the users data
    mongoose.connection.db.collection('users').indexes()
    .then((indexes) => {
      const promises = [];
      // Loop through the found indexes
      indexes.forEach((index) => {
        // If unique ID index exists, delete from users collection
        if (index.name === 'username_1') {
          promises.push(mongoose.connection.db.collection('users').dropIndex('username_1'));
        }
      });

      // Return when all organization indexes have been dropped
      return Promise.all(promises);
    })
    .catch((error) => reject(error));
  });
}
