/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.0.9.3
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Migration script for version 0.9.3.
 */

// MBEE modules
const utils = M.require('lib.utils');
const Branch = M.require('models.branch');
const Element = M.require('models.element');

/**
 * @description Handles the database migration from 0.9.0 to 0.9.3.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  // Ensure there are no branches without an __mbee__, holding_bin, or undefined element
  // Find all branches
  const branches = await Branch.find({});

  // Create a list of expected root elements
  const expectedElems = branches.map((b) => utils.createID(b._id, '__mbee__'))
  .concat(branches.map((b) => utils.createID(b._id, 'holding_bin')),
    branches.map((b) => utils.createID(b._id, 'undefined')));

  // Query for the expected elements
  const foundElems = await Element.find({ _id: expectedElems });
  const foundElemIDs = foundElems.map((e) => e._id);

  // Filter to find any missing elements
  const missingElemIDs = expectedElems.filter((e) => !foundElemIDs.includes(e));

  // Create missing element objects
  const missingElems = missingElemIDs.map((elemID) => {
    const ids = utils.parseID(elemID);
    // Get the short element id
    const id = ids.pop();
    // Get the branch id
    const branchID = utils.createID(ids);
    // Get the project id
    ids.pop();
    const projID = utils.createID(ids);
    // Get the branch
    const branch = branches.filter((b) => b._id === branchID)[0];
    // Get the name and parent
    let name = null;
    let parent = null;
    if (id === '__mbee__') {
      name = id;
      parent = utils.createID(branchID, 'model');
    }
    else if (id === 'holding_bin') {
      name = 'holding bin';
      parent = utils.createID(branchID, '__mbee__');
    }
    else if (id === 'undefined') {
      name = 'undefined element';
      parent = utils.createID(branchID, '__mbee__');
    }
    // Return the element object
    return {
      _id: elemID,
      name: name,
      parent: parent,
      source: null,
      target: null,
      documentation: '',
      type: '',
      archivedBy: null,
      createdBy: branch.createdBy,
      lastModifiedBy: branch.createdBy,
      archivedOn: null,
      archived: false,
      project: projID,
      branch: branchID,
      createdOn: branch.createdOn,
      updatedOn: branch.createdOn
    };
  });

  // Insert the missing elements
  if (missingElems.length !== 0) {
    await Element.insertMany(missingElems);
  }
};
