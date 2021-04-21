/**
 * @classification UNCLASSIFIED
 *
 * @module lib.controller-utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines helper functions used by the controllers.
 */

// Node modules
const assert = require('assert');

// MBEE modules
const utils = M.require('lib.utils');

/**
 * @description A function that validates the parameters passed to the
 * controllers.
 *
 * @param {object} requestingUser - The user in the request.
 * @param {object} options - The options passed in with the request.
 * @param {string} [orgID=''] - An optional parameter for the organization ID.
 * For example this would not be used in the org controller but would be in the
 * project, branch, and element controller.
 * @param {object} [projID=''] - An optional parameter for the project ID.
 * @param {object} [branchID=''] - An optional parameter for the branch ID.
 */
module.exports.checkParams = function(requestingUser, options, orgID = '', projID = '', branchID = '') {
  try {
    assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
    assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
    // Ensure that requesting user has an _id field
    assert.ok(requestingUser._id, 'Requesting user is not populated.');
    assert.ok(typeof orgID === 'string', 'Organization ID is not a string.');
    assert.ok(typeof projID === 'string', 'Project ID is not a string.');
    assert.ok(typeof branchID === 'string', 'Branch ID is not a string.');

    const optionsTypes = ['undefined', 'object'];
    assert.ok(optionsTypes.includes(typeof options), 'Options parameter cannot be of'
      + ` type ${typeof options}.`);
  }
  catch (err) {
    throw new M.DataFormatError(err.message, 'warn');
  }
};

/**
 * @description A function that validates data types of the parameters passed to
 * the controllers.
 *
 * @param {object} dataTypes - The allowed data types for this particular
 * operation.
 * @param {object} data - The data to be validated (could be an array of element
 * ids, an array of element objects, a single project id, etc).
 * @param {string} dataName - The type of model the data is ('element',
 * 'branch', 'project', etc) to be used in error messages.
 *
 */
module.exports.checkParamsDataType = function(dataTypes, data, dataName) {
  try {
    assert.ok(dataTypes.includes(typeof data), `${dataName} parameter cannot be of type`
      + ` ${typeof data}.`);
    // if the data is an object, ensure it's either an array of strings or objects
    if (typeof data === 'object') {
      // Ensure the data is not null
      assert.ok(data !== null, `${dataName} parameter cannot be null.`);
      // If strings are allowed, it can only be an array of strings
      if (dataTypes.includes('string')) {
        // Ensure it's an array
        assert.ok(Array.isArray(data), `${dataName} is an object, but not an array.`);
        // Ensure it's an array of strings
        assert.ok(data.every(o => typeof o === 'string'), `${dataName} is not an array of`
          + ' strings.');
      }
      // Else if it's an array and only objects are allowed:
      else if (Array.isArray(data)) {
        // Ensure it's an array of objects
        assert.ok(data.every(o => typeof o === 'object'), `Not every item in ${dataName} is`
          + ' an object.');
        assert.ok(data.every(o => o !== null), `One or more items in ${dataName} is null.`);
      }
    }
  }
  catch (error) {
    throw new M.DataFormatError(error.message, 'warn');
  }
};

/**
 * @description Validates that an org/project/branch has been found, is not
 * archived, and that the user has appropriate permissions for the controller
 * operation.
 *
 * @param {object} model - The model being validated: org/project/branch.
 * @param {string} id - The ID of the model being validated.
 * @param {boolean} [archived=false] - Specifies whether or not to allow
 * archived results.
 *
 * @returns {object} An object containing the sanitized input parameters.
 */
module.exports.findAndValidate = async function(model, id, archived = false) {
  // Perform the find operation on the model
  const query = { _id: id };
  const result = await model.findOne(query, null);
  // Get the name of the particular model
  const name = model.modelName;

  // Check that the model object was found
  if (!result) {
    M.log.debug(`Find query on ${id} failed`);
    throw new M.NotFoundError(`The ${name} [${utils.parseID(id).pop()}] was not found.`, 'warn');
  }

  // Verify the org/project/branch is not archived
  if (result.archived && !archived) {
    throw new M.PermissionError(`The ${name} [${utils.parseID(id).pop()}] is archived.`
      + ' It must first be unarchived before performing this operation.', 'warn');
  }

  // Return the found organization/project/branch
  return result;
};
