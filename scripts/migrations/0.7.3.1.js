/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.migrations.0.7.3.1
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Migration script for version 0.7.3.1. Adds the field
 * 'projectReferences' to all existing projects.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const mongoose = require('mongoose');

/**
 * @description Handles the database migration from 0.7.3.1 to 0.7.3.
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
 * @description Handles the database migration from 0.7.3 to 0.7.3.1.
 * Adds the field 'projectReferences' to each existing project.
 */
module.exports.up = function() {
  return new Promise((resolve, reject) => {
    mongoose.connection.db.collections()
    .then((existingCollections) => {
      const collectionNames = existingCollections.map(c => c.s.name);
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
        return mongoose.connection.db.collection('server_data').insertOne({ version: '0.7.3.1' });
      }

      return mongoose.connection.db.collection('server_data')
      .updateMany({ _id: serverData[0]._id }, { $set: { version: '0.7.3.1' } });
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function for 0.7.3 to 0.7.3.1 migration. Handles all
 * updates to the project collection.
 */
function projectHelper() {
  return new Promise((resolve, reject) => {
    let projects = [];

    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Find all projects
    mongoose.connection.db.collection('projects').find({}).toArray()
    .then((foundProjects) => {
      projects = foundProjects;

      // Write contents to temporary file
      return new Promise(function(res, rej) {
        fs.writeFile(path.join(M.root, 'data', 'project-0731.json'),
          JSON.stringify(projects), function(err) {
            if (err) rej(err);
            else res();
          });
      });
    })
    // Add the projectReferences field to each project
    .then(() => mongoose.connection.db.collection('projects').updateMany({},
      { $set: { projectReferences: [] } }))
    .then(() => {
      if (fs.existsSync(path.join(M.root, 'data', 'projects-0731.json'))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', 'projects-0731.json'), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
