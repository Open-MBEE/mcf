/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.migrations.0.6.0
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Migration script for version 0.6.0
 */

// Node modules
const mongoose = require('mongoose');

/**
 * @description Handles the database migration from 0.6.0 to 0.5.0. This drop in
 * versions is currently not supported.
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
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.5.0' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.5.0' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};

/**
 * @description Handles the database migration from 0.5.0 to 0.6.0. This upgrade
 * in versions is currently not supported.
 */
module.exports.up = function() {
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
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.6.0' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.6.0' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};
