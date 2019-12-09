/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.8.1
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 0.8.1. Modifies element IDs to
 * include the branch ID. New format is org:proj:branch:element. Adds a
 * field to elements called 'branch' which references the branch it's a part of.
 * Creates a master branch for every project which already exists in the
 * database.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// MBEE modules
const Branch = M.require('models.branch');
const Element = M.require('models.element');
const Project = M.require('models.project');
const utils = M.require('lib.utils');

/**
 * @description Handles the database migration from 0.8.0 to 0.8.1.
 * Modifies element IDs to include the branch ID. New format should look like
 * orgid:projectid:branchid:elementid. Adds a master branch for every project
 * which already exists in the database.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  await elementHelper();
  await branchHelper();
};

/**
 * @description Helper function for 0.8.0 to 0.8.1 migration. Handles all
 * updates to the element collection.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function elementHelper() {
  return new Promise((resolve, reject) => {
    let elementIDs = [];

    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Find all elements, returning only the _id
    Element.find({}, '_id')
    .then((elements) => {
      // Remove any elements which may have already been migrated
      elementIDs = elements.map(e => e._id).filter(e => utils.parseID(e).length === 3);

      // Create array with numElements/25000 indexes
      const tmpArray = [];
      for (let i = 0; i < elementIDs.length / 5000; i++) {
        tmpArray.push(elementIDs.slice(i * 5000, i * 5000 + 5000));
      }

      // Run batches synchronously using the array.reduce() function
      return tmpArray.reduce((accumulatorPromise, nextIndex) => { // eslint-disable-line
        return accumulatorPromise.then(() => { // eslint-disable-line
          return elementHelperRecursive(nextIndex);
        });
      }, Promise.resolve());
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}

/**
 * @description Recursive function for elementHelper().
 *
 * @param {string} ids - The ids of elements to search.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function elementHelperRecursive(ids) {
  return new Promise((resolve, reject) => {
    let elems = [];
    let deleted = false;
    let error = '';
    Element.find({ _id: { $in: ids } }, null)
    .then((foundElements) => {
      elems = foundElements;
      // Write contents to temporary file
      return new Promise(function(res, rej) {
        fs.writeFile(path.join(M.root, 'data', 'elements-081.json'),
          JSON.stringify(foundElements), function(err) {
            if (err) rej(err);
            else res();
          });
      });
    })
    // Delete elements from the database
    .then(() => Element.deleteMany({ _id: { $in: ids } }))
    .then(() => {
      deleted = true;
      // Loop through each element
      elems.forEach((element) => {
        // Grab the id and split up parts
        const tmpID = element._id;
        const idParts = utils.parseID(tmpID);
        // Remove element ID from end of array
        const elementID = idParts.pop();
        // Add branch ID 'master' and then element ID to end of array
        idParts.push('master', elementID);
        // Reset element _id
        element._id = utils.createID(idParts);

        // If the element has a parent reference
        if (element.hasOwnProperty('parent') && element.parent !== null) {
          // Grab the parent and split up parts
          const parentID = element.parent;
          const parentParts = utils.parseID(parentID);
          // Remove element ID from end of array
          const parent = parentParts.pop();
          // Add branch ID 'master' and then element ID to end of array
          parentParts.push('master', parent);
          // Reset element parent
          element.parent = utils.createID(parentParts);
        }

        // If the element has a source reference
        if (element.hasOwnProperty('source') && element.source !== null) {
          // Grab the source and split up parts
          const sourceID = element.source;
          const sourceParts = utils.parseID(sourceID);
          // Remove element ID from end of array
          const source = sourceParts.pop();
          // Add branch ID 'master' and then element ID to end of array
          sourceParts.push('master', source);
          // Reset element source
          element.source = utils.createID(sourceParts);
        }

        // If the element has a target reference
        if (element.hasOwnProperty('target') && element.target !== null) {
          // Grab the target and split up parts
          const targetID = element.target;
          const targetParts = utils.parseID(targetID);
          // Remove element ID from end of array
          const target = targetParts.pop();
          // Add branch ID 'master' and then element ID to end of array
          targetParts.push('master', target);
          // Reset element target
          element.target = utils.createID(targetParts);
        }


        // Add the branch field, and set it to 'master'
        element.branch = utils.createID(element.project, 'master');
      });

      // If there are elements to reinsert, add them
      if (elems.length > 0) {
        return Element.insertMany(elems);
      }
    })
    .catch((err) => {
      error = err;
      // If the elements were deleted from the database, but not recreated,
      // reinsert them
      if (deleted) {
        // Read the file
        const elemsToInsert = JSON.parse(fs.readFileSync(path.join(M.root, 'data',
          'elements-081.json')));

        // Reinsert the elements. Use the collection directly to avoid
        // model validation.
        return Element.insertMany(elemsToInsert, { skipValidation: true });
      }
      else {
        return reject(err);
      }
    })
    .then(() => {
      // Delete the temporary storage file if reinsertion was successful
      if (fs.existsSync(path.join(M.root, 'data', 'elements-081.json'))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', 'elements-081.json'), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => {
      // If an error originally occurred, throw it
      if (error) {
        return reject(error);
      }
      else {
        return resolve();
      }
    });
  });
}

/**
 * @description Helper function for 0.8.0 to 0.8.1 migration. Handles all
 * updates to the branch collection.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function branchHelper() {
  return new Promise((resolve, reject) => {
    let projects = [];

    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Find all projects
    Project.find({}, null)
    .then((foundProjects) => {
      projects = foundProjects;

      // Find all branches, in case one already exists
      return Branch.find({}, null);
    })
    .then((foundBranches) => {
      const projectIDs = [];
      // Loop through each found branch
      foundBranches.forEach((branch) => {
        // If the branch is master, store project ID to be removed
        if (utils.parseID(branch._id).pop() === 'master') {
          projectIDs.push(branch.project);
        }
      });

      // Filter out any projects who already have master branches
      projects = projects.filter(p => !projectIDs.includes(p._id));

      // Define a variable to store branch objects
      const branchesToCreate = [];

      // Loop through each project
      projects.forEach((project) => {
        // Create a branch for each project
        const branchObj = {
          _id: utils.createID(project._id, 'master'),
          name: 'Master',
          project: project._id,
          source: null,
          tag: false,
          custom: {},
          createdBy: project.createdBy,
          createdOn: project.createdOn,
          lastModifiedBy: project.createdBy,
          updatedOn: project.createdOn,
          archived: project.archived,
          archivedBy: project.archivedBy,
          archivedOn: project.archivedOn
        };

        // Add branch object to array to be created
        branchesToCreate.push(branchObj);
      });

      // Create all branches
      return Branch.insertMany(branchesToCreate);
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
