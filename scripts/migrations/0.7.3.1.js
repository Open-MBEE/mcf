/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.7.3.1
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 0.7.3.1. Adds the field
 * 'projectReferences' to all existing projects.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// MBEE modules
const Project = M.require('models.project');

/**
 * @description Handles the database migration from 0.7.3 to 0.7.3.1.
 * Adds the field 'projectReferences' to each existing project.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await projectHelper();
};

/**
 * @description Helper function for 0.7.3 to 0.7.3.1 migration. Handles all
 * updates to the project collection.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function projectHelper() {
  return new Promise((resolve, reject) => {
    let projects = [];

    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Find all projects
    Project.find({})
    .then((foundProjects) => {
      projects = foundProjects;

      // Write contents to temporary file
      fs.writeFileSync(path.join(M.root, 'data', 'projects-0731.json'), JSON.stringify(projects));
    })
    // Add the projectReferences field to each project
    .then(() => Project.updateMany({}, { projectReferences: [] }))
    .then(() => {
      if (fs.existsSync(path.join(M.root, 'data', 'projects-0731.json'))) {
        fs.unlinkSync(path.join(M.root, 'data', 'projects-0731.json'));
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
