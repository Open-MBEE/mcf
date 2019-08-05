/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.migrations.0.8.2
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Migration script for version 0.8.2. Removes the
 * projectReferences field from every project in the database.
 */

// NPM modules
const mongoose = require('mongoose');

/**
 * @description Handles the database migration from 0.8.2 to 0.8.1.
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
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.8.1' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.8.1' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};

/**
 * @description Handles the database migration from 0.8.1 to 0.8.2. Remove the
 * projectReferences field from every project.
 */
module.exports.up = function() {
  return new Promise((resolve, reject) => {
    let collectionNames = [];
    mongoose.connection.db.collections()
    .then((existingCollections) => {
      collectionNames = existingCollections.map(c => c.s.name);
      // If the projects collection exists, run the helper function
      if (collectionNames.includes('projects')) {
        return projectHelper();
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
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.8.2' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.8.2' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function for 0.8.1 to 0.8.2 migration. Handles all
 * updates to the project collection.
 */
function projectHelper() {
  return new Promise((resolve, reject) => {
    // Remove the projectReferences field from all projects. NOTE: we use mongo
    // directly here because Mongoose uses $set for all updates, which is not desired
    mongoose.connection.db.collection('projects')
    .updateMany({}, { $unset: { projectReferences: '' } })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
