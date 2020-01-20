/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.10.2
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author James Eckstein
 *
 * @description Migration script for version 0.10.2. Adds a field to artifacts called
 * 'size' which records blob file size on upload (POST). Updates the 'name' field for
 * artifacts to 'description'. Adds 'artifact' field to elements.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// MBEE modules
const Artifact = M.require('models.artifact');
const Element = M.require('models.element');

/**
 * @description Handles the database migration from 0.10.1 to 0.10.2.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await artifactHelper();
  await elementHelper();
};

/**
 * @description Helper function for 0.10.1 to 0.10.2 migration. Handles all
 * updates to the artifacts collection.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function artifactHelper() {
  // Find all artifacts in the database
  const artifacts = await Artifact.find({});

  if (artifacts.length > 0) {
    // Create data directory if it does not exist
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Save all artifacts to a JSON file in the data directory
    fs.writeFileSync(path.join(M.root, 'data', 'artifacts-0102.json'), JSON.stringify(artifacts));

    const bulkWrite = [];
    // Add 'size' and change 'name' to 'description' for all artifacts
    artifacts.forEach((artifact) => {
      artifact.size = 0;
      artifact.description = artifact.name;
      delete artifact.name;

      bulkWrite.push({
        replaceOne: {
          filter: { _id: artifact._id },
          replacement: artifact
        }
      });
    });

    // Replace all artifacts
    await Artifact.bulkWrite(bulkWrite);

    // If the backup file exists, remove it
    if (fs.existsSync(path.join(M.root, 'data', 'artifacts-0102.json'))) {
      fs.unlinkSync(path.join(M.root, 'data', 'artifacts-0102.json'));
    }
  }
}

/**
 * @description Helper function for 0.10.1 to 0.10.2 migration. Handles all
 * updates to the elements collection.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function elementHelper() {
  const numElements = await Element.countDocuments({});

  if (numElements > 0) {
    // Create data directory if it does not exist
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    const batchLimit = 5000;
    let batchSkip = 0;

    // Process batch of 5000 elements
    for (let i = 0; i < numElements / batchLimit; i++) {
      batchSkip = i * 5000;

      // eslint-disable-next-line no-await-in-loop
      const elements = await Element.find({}, null, { skip: batchSkip, limit: batchLimit });

      // Save all elements to a JSON file in the data directory
      fs.writeFileSync(path.join(M.root, 'data', `elements-0102-${i}.json`), JSON.stringify(elements));

      const bulkWrite = [];
      // Add 'artifact' field to elements
      elements.forEach((element) => {
        bulkWrite.push({
          updateOne: {
            filter: { _id: element._id },
            update: { artifact: null }
          }
        });
      });

      // Update all elements
      await Element.bulkWrite(bulkWrite); // eslint-disable-line no-await-in-loop

      // If the backup file exists, remove it
      if (fs.existsSync(path.join(M.root, 'data', `elements-0102-${i}.json`))) {
        fs.unlinkSync(path.join(M.root, 'data', `elements-0102-${i}.json`));
      }
    }
  }
}
