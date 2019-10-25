/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.artifact-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description This implements the behavior and logic for artifacts.
 * It also provides function for interacting with artifacts.
 *
 */

// Expose artifact controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  remove,
  getBlob,
  postBlob,
  deleteBlob
};

// Node modules
const assert = require('assert');

// MBEE modules
const Artifact = M.require('models.artifact');
const Branch = M.require('models.branch');
const Project = M.require('models.project');
const Org = M.require('models.organization');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const validators = M.require('lib.validators');
const utils = M.require('lib.utils');
const helper = M.require('lib.controller-utils');
const jmi = M.require('lib.jmi-conversions');
const ArtifactStrategy = M.require(`artifact.${M.config.artifact.strategy}`);
const errors = M.require('lib.errors');
const permissions = M.require('lib.permissions');

// Error Check - Verify ArtifactStrategy is imported and implements required functions
if (!ArtifactStrategy.hasOwnProperty('getBlob')) {
  M.log.critical(`Error: Artifact Strategy (${M.config.artifact.strategy}) does not implement getBlob.`);
  process.exit(0);
}
if (!ArtifactStrategy.hasOwnProperty('postBlob')) {
  M.log.critical(`Error: Artifact Strategy (${M.config.artifact.strategy}) does not implement postBlob.`);
  process.exit(0);
}
if (!ArtifactStrategy.hasOwnProperty('deleteBlob')) {
  M.log.critical(`Error: Artifact Strategy (${M.config.artifact.strategy}) does not implement deleteBlob.`);
  process.exit(0);
}
if (!ArtifactStrategy.hasOwnProperty('clear')) {
  M.log.critical(`Error: Artifact Strategy (${M.config.artifact.strategy}) does not implement clear.`);
  process.exit(0);
}

/**
 * @description This function finds an artifact based on artifact id.
 *
 * @param {User} requestingUser - The requesting user.
 * @param {string} organizationID - The organization ID.
 * @param {string} projectID - The project ID.
 * @param {string} branchID - The branch ID.
 * @param {(string|string[])} [artifacts] - The artifacts to find. Can either be
 * an array of artifact ids, a single artifact id, or not provided, which defaults
 * to every artifact in a branch being found.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {boolean} [options.includeArchived = false] - If true, find results will
 * include archived objects.
 * @param {string[]} [options.fields] - An array of fields to return. To NOT include
 * a field, provide a '-' in front.
 * @param {number} [options.limit = 0] - A number that specifies the maximum
 * number of documents to be returned to the user. A limit of 0 is equivalent to
 * setting no limit.
 * @param {number} [options.skip = 0] - A non-negative number that specifies the
 * number of documents to skip returning. For example, if 10 documents are found
 * and skip is 5, the first 5 documents will NOT be returned.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 * @param {string} [options.sort] - Provide a particular field to sort the results by.
 * You may also add a negative sign in front of the field to indicate sorting in
 * reverse order.
 * @param {string} [options.name] - Search for artifacts with a specific name.
 * @param {string} [options.filename] - Search for artifacts with a specific
 * filename.
 * @param {string} [options.createdBy] - Search for artifacts with a specific
 * createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for artifacts with a
 * specific lastModifiedBy value.
 * @param {string} [options.archived] - Search only for archived artifacts.  If false,
 * only returns unarchived artifacts.  Overrides the includeArchived option.
 * @param {string} [options.archivedBy] - Search for artifacts with a specific
 * archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use
 * dot notation for the keys. Ex: custom.hello = 'world'.
 *
 * @returns {Promise<object[]>} Array of found artifact objects.
 *
 * @example
 * find({User}, 'orgID', 'projID', 'branchID', ['artifact1', 'artifact2'], { populate: 'project' })
 * .then(function(artifacts) {
 *   // Do something with the found artifacts
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function find(requestingUser, organizationID, projectID, branchID, artifacts, options) {
  // Set options if no artifacts were provided, but options were
  if (typeof artifacts === 'object' && artifacts !== null && !Array.isArray(artifacts)) {
    options = artifacts; // eslint-disable-line no-param-reassign
    artifacts = undefined; // eslint-disable-line no-param-reassign
  }

  // Ensure input parameters are correct type
  helper.checkParams(requestingUser, options, organizationID, projectID, branchID);
  helper.checkParamsDataType(['undefined', 'object', 'string'], artifacts, 'Artifacts');
  // Sanitize input parameters
  const saniArtifacts = sani.db(JSON.parse(JSON.stringify(artifacts)));
  const reqUser = JSON.parse(JSON.stringify(requestingUser));
  const orgID = sani.db(organizationID);
  const projID = sani.db(projectID);
  const branID = sani.db(branchID);

  // Initialize search query
  const searchQuery = { branch: utils.createID(orgID, projID, branID), archived: false };

  // Initialize and ensure options are valid
  const validatedOptions = utils.validateOptions(options, ['includeArchived', 'populate',
    'fields', 'limit', 'skip', 'lean', 'sort'], Artifact);

  // Ensure options are valid
  if (options) {
    // Create array of valid search options
    const validSearchOptions = ['filename', 'name', 'createdBy',
      'lastModifiedBy', 'archived', 'archivedBy'];

    // Loop through provided options, look for validSearchOptions
    Object.keys(options).forEach((o) => {
      // If the provided option is a valid search option
      if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
        // Ensure the search option is a string
        if (typeof options[o] !== 'string') {
          throw new M.DataFormatError(`The option '${o}' is not a string.`, 'warn');
        }

        // Add the search option to the searchQuery
        searchQuery[o] = sani.db(options[o]);
      }
    });
  }

  // Find the organization
  const organization = await helper.findAndValidate(Org, orgID, reqUser,
    validatedOptions.includeArchived);

  // Find the project
  const project = await helper.findAndValidate(Project, utils.createID(orgID, projID),
    reqUser, validatedOptions.includeArchived);

  // Find the branch, validate it was found and not archived
  const branch = await helper.findAndValidate(Branch, utils.createID(
    orgID, projID, branID
  ), reqUser, validatedOptions.includeArchived);

  // Permissions check
  permissions.readArtifact(reqUser, organization, project, branch);

  // If the archived field is true, remove it from the query
  if (validatedOptions.includeArchived) {
    delete searchQuery.archived;
  }

  // Check the type of the artifact parameter
  if (Array.isArray(saniArtifacts)) {
    // An array of artifact ids, find all
    searchQuery._id = saniArtifacts.map(a => utils.createID(orgID, projID, branchID, a));
  }
  else if (typeof saniArtifacts === 'string') {
    // A single artifact id
    searchQuery._id = utils.createID(orgID, projID, branchID, saniArtifacts);
  }
  else if (!((typeof saniArtifacts === 'object' && saniArtifacts !== null)
    || saniArtifacts === undefined)) {
    // Invalid parameter, throw an error
    throw new M.DataFormatError('Invalid input for finding artifacts.', 'warn');
  }

  try {
    // Find the artifacts
    return await Artifact.find(searchQuery, validatedOptions.fieldsString,
      { limit: validatedOptions.limit,
        skip: validatedOptions.skip,
        sort: validatedOptions.sort,
        populate: validatedOptions.populateString,
        lean: validatedOptions.lean
      });
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function creates one or many artifacts from the provided
 * data.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branchID - The ID of the branch to add artifacts to.
 * @param {(object|object[])} artifacts - Either an array of objects containing
 * artifact data or a single object containing artifact data to create.
 * @param {string} artifacts.id - The ID of the artifact being created.
 * @param {string} [artifacts.name] - The name of the artifact.
 * @param {string} artifacts.filename - The filename of the artifact.
 * @param {string} artifacts.location - The file blob location.
 * @param {object} [artifacts.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. To NOT
 * include a field, provide a '-' in front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @returns {Promise<object[]>} Array of created artifact objects.
 *
 * @example
 * create({User}, 'orgID', 'projID', 'branch', [{Art1}, {Art2}, ...], { populate: ['project'] })
 * .then(function(artifacts) {
 *   // Do something with the newly created artifacts
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function create(requestingUser, organizationID, projectID, branchID,
  artifacts, options) {
  try {
    M.log.debug('ArtifactController.create(): Start of function');

    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options, organizationID, projectID, branchID);
    helper.checkParamsDataType(['object', 'array'], artifacts, 'Artifacts');

    // Sanitize input parameters and create function-wide variables
    const saniArtifacts = sani.db(JSON.parse(JSON.stringify(artifacts)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.db(organizationID);
    const projID = sani.db(projectID);
    const branID = sani.db(branchID);

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Artifact);

    // Define array to store artifact data
    let artsToCreate = [];
    const arrIDs = [];
    const validArtKeys = Artifact.getValidUpdateFields();
    validArtKeys.push('id');

    // Check parameter type
    if (Array.isArray(saniArtifacts)) {
      // artifacts is an array, create many artifacts
      artsToCreate = saniArtifacts;
    }
    else if (typeof saniArtifacts === 'object') {
      // artifacts is an object, create a single artifact
      artsToCreate = [saniArtifacts];
    }
    else {
      // artifact is not an object or array, throw an error
      throw new M.DataFormatError('Invalid input for creating artifacts.', 'warn');
    }

    // Find the organization and validate that it was found and not archived
    const organization = await helper.findAndValidate(Org, orgID, reqUser);

    // Find the project and validate that it was found and not archived
    const project = await helper.findAndValidate(Project,
      utils.createID(orgID, projID), reqUser);

    // Find the branch and validate that it was found and not archived
    const branch = await helper.findAndValidate(Branch,
      utils.createID(orgID, projID, branID), reqUser);

    // Check that the branch is is not a tag
    if (branch.tag) {
      throw new M.OperationError(`[${branID}] is a tag and does not allow `
        + 'artifacts to be created, updated, or deleted.', 'warn');
    }

    // Permissions check
    permissions.createArtifact(reqUser, organization, project, branch);

    M.log.debug('ArtifactController.create(): Before finding pre-existing artifact');

    // Check that each art has an id, and add to arrIDs
    try {
      let index = 1;
      artsToCreate.forEach((artifact) => {
        // Ensure keys are valid
        Object.keys(artifact).forEach((k) => {
          assert.ok(validArtKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each art has an id and that its a string
        assert.ok(artifact.hasOwnProperty('id'), `Artifact #${index} does not have an id.`);
        assert.ok(typeof artifact.id === 'string', `Artifact #${index}'s id is not a string.`);
        artifact.id = utils.createID(orgID, projID, branID, artifact.id);
        // Check if art with same ID is already being created
        assert.ok(!arrIDs.includes(artifact.id), 'Multiple artifacts with the '
          + `same ID [${artifact.id}] cannot be created.`);

        // Set the _id equal to the id
        artifact._id = artifact.id;
        arrIDs.push(artifact.id);
        index++;
      });
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Create searchQuery to search for any existing, conflicting artifacts
    const searchQuery = { _id: { $in: arrIDs } };

    // Check if the artifacts already exists
    const existingArtifact = await Artifact.find(searchQuery, '_id', { lean: true });

    // Ensure no artifacts were found
    if (existingArtifact.length > 0) {
      // Get array of found artifact's IDs
      const foundArtifactID = existingArtifact.map(a => utils.parseID(a._id).pop());

      throw new M.OperationError('Artifacts with the following IDs already '
        + `exist [${foundArtifactID.toString()}].`, 'warn');
    }

    const artObjects = artsToCreate.map((a) => {
      const artObj = Artifact.createDocument(a);
      artObj.project = project._id;
      artObj.branch = branch._id;
      artObj.strategy = M.config.artifact.strategy;
      artObj.lastModifiedBy = reqUser._id;
      artObj.createdBy = reqUser._id;
      artObj.updatedOn = Date.now();
      artObj.archivedBy = (a.archived) ? reqUser._id : null;
      artObj.archivedOn = (a.archived) ? Date.now() : null;

      return artObj;
    });

    // Save artifact object to the database
    const createdArtifacts = await Artifact.insertMany(artObjects);

    // Emit the event artifacts-created
    EventEmitter.emit('artifacts-created', createdArtifacts);

    return await Artifact.find(searchQuery, validatedOptions.fieldsString,
      { populate: validatedOptions.populateString,
        lean: validatedOptions.lean
      });
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function updates one or many artifacts.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branchID - The ID of the owning branch.
 * @param {(object|object[])} artifacts - Either an array of objects containing
 * artifact data or a single object containing artifact data to update.
 * @param {string} artifacts.id - The ID of the artifact being updated.
 * @param {string} [artifacts.name] - The name of the artifact.
 * @param {string} [artifacts.filename] - The filename of the artifact.
 * @param {string} [artifacts.location] - The file blob location.
 * @param {string} [artifacts.archived] - The updated archived field. If true,
 * the artifact will not be able to be found until unarchived.
 * @param {object} [artifacts.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. To NOT
 * include a field, provide a '-' in front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @returns {Promise<object[]>} Array of updated artifact objects.
 *
 * @example
 * update({User}, 'orgID', 'projID', 'branch', [{Art1}, {Art2}, ...], { populate: ['project'] })
 * .then(function(artifacts) {
 *   // Do something with the newly updated artifacts
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function update(requestingUser, organizationID, projectID, branchID,
  artifacts, options) {
  try {
    M.log.debug('ArtifactController.update(): Start of function');

    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options, organizationID, projectID, branchID);
    helper.checkParamsDataType(['object', 'update'], artifacts, 'Artifacts');

    // Sanitize input parameters and create function-wide variables
    const saniArtifacts = sani.db(JSON.parse(JSON.stringify(artifacts)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.db(organizationID);
    const projID = sani.db(projectID);
    const branID = sani.db(branchID);

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Artifact);

    // Define array to store artifact data
    let artsToUpdate = [];
    const arrIDs = [];
    const validArtKeys = Artifact.getValidUpdateFields();
    validArtKeys.push('id');

    // Check parameter type
    if (Array.isArray(saniArtifacts)) {
      // artifacts is an array, update many artifacts
      artsToUpdate = saniArtifacts;
    }
    else if (typeof saniArtifacts === 'object') {
      // artifacts is an object, update a single artifact
      artsToUpdate = [saniArtifacts];
    }
    else {
      // artifact is not an object or array, throw an error
      throw new M.DataFormatError('Invalid input for updating artifacts.', 'warn');
    }

    // Find organization, validate found and not archived
    const organization = await helper.findAndValidate(Org, orgID, reqUser);

    // Find project, validate found and not archived
    const project = await helper.findAndValidate(Project,
      utils.createID(orgID, projID), reqUser);

    // Find the branch and validate that it was found and not archived
    const branch = await helper.findAndValidate(Branch,
      utils.createID(orgID, projID, branID), reqUser);

    // Check that the branch is is not a tag
    if (branch.tag) {
      throw new M.OperationError(`[${branID}] is a tag and does not allow `
        + 'artifacts to be created, updated, or deleted.', 'warn');
    }

    // Permissions check
    permissions.updateArtifact(reqUser, organization, project, branch);

    M.log.debug('ArtifactController.update(): Before finding pre-existing artifact');

    // Check that each artifact has an id, and add to arrIDs
    try {
      let index = 1;
      artsToUpdate.forEach((art) => {
        // Ensure keys are valid
        Object.keys(art).forEach((k) => {
          assert.ok(validArtKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each artifact has an id and that its a string
        assert.ok(art.hasOwnProperty('id'), `Artifact #${index} does not have an id.`);
        assert.ok(typeof art.id === 'string', `Artifact #${index}'s id is not a string.`);
        art.id = utils.createID(orgID, projID, branID, art.id);
        // Check if art with same ID is already being updated
        assert.ok(!arrIDs.includes(art.id), 'Multiple artifacts with the same ID '
          + `[${art.id}] cannot be updated.`);
        arrIDs.push(art.id);
        // Set the _id equal to the id
        art._id = art.id;
        index++;
      });
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Create searchQuery to search for any existing artifacts
    const searchQuery = { _id: { $in: arrIDs } };

    // Find existing artifacts
    const foundArtifact = await Artifact.find(searchQuery, null, { lean: true });
    // Verify the same number of artifacts are found as desired
    if (foundArtifact.length !== arrIDs.length) {
      const foundIDs = foundArtifact.map(a => a._id);
      const notFound = arrIDs.filter(a => !foundIDs.includes(a))
      .map(a => utils.parseID(a).pop());
      throw new M.NotFoundError(
        `The following artifacts were not found: [${notFound.toString()}].`, 'warn'
      );
    }

    // Convert artsToUpdate to JMI type 2
    const jmiType2 = jmi.convertJMI(1, 2, artsToUpdate);
    const bulkArray = [];

    // Get array of editable parameters
    const validFields = Artifact.getValidUpdateFields();

    // For each artifact found
    foundArtifact.forEach((art) => {
      const updateArtifact = jmiType2[art._id];
      delete updateArtifact.id;
      delete updateArtifact._id;

      // Error Check: if artifact currently archived, they must first be unarchived
      if (art.archived && (updateArtifact.archived === undefined
        || JSON.parse(updateArtifact.archived) !== false)) {
        throw new M.OperationError(`Artifact [${utils.parseID(art._id).pop()}] is archived. `
          + 'Archived objects cannot be modified.', 'warn');
      }

      // For each key in the updated object
      Object.keys(updateArtifact).forEach((key) => {
        // Check if the field is valid to update
        if (!validFields.includes(key)) {
          throw new M.OperationError(`Artifact property [${key}] cannot `
            + 'be changed.', 'warn');
        }

        // Get validator for field if one exists
        if (validators.artifact.hasOwnProperty(key)) {
          // If validation fails, throw error
          if (!RegExp(validators.artifact[key]).test(updateArtifact[key])) {
            throw new M.DataFormatError(
              `Invalid ${key}: [${updateArtifact[key]}]`, 'warn'
            );
          }
        }

        // Set archivedBy if archived field is being changed
        if (key === 'archived') {
          // If the artifact is being archived
          if (updateArtifact[key] && !art[key]) {
            updateArtifact.archivedBy = reqUser._id;
            updateArtifact.archivedOn = Date.now();
          }
          // If the artifact is being unarchived
          else if (!updateArtifact[key] && art[key]) {
            updateArtifact.archivedBy = null;
            updateArtifact.archivedOn = null;
          }
        }
      });

      // Update lastModifiedBy field and updatedOn
      updateArtifact.lastModifiedBy = reqUser._id;
      updateArtifact.updatedOn = Date.now();

      // Update the artifact
      bulkArray.push({
        updateOne: {
          filter: { _id: art._id },
          update: updateArtifact
        }
      });
    });
    await Artifact.bulkWrite(bulkArray);

    const foundArtifacts = await Artifact.find(searchQuery, validatedOptions.fieldsString,
      { populate: validatedOptions.populateString,
        lean: validatedOptions.lean
      });

    // Emit the event artifacts-updated
    EventEmitter.emit('artifacts-updated', foundArtifacts);
    return foundArtifacts;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function removes one or many artifacts. Returns the IDs of
 * the deleted artifacts.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branchID - The ID of the branch to remove artifacts from.
 * @param {(string|string[])} artifacts - The artifacts to remove. Can either be
 * an array of artifact ids or a single artifact id.
 * @param {object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @returns {Promise<string[]>} Array of deleted artifact ids.
 *
 * @example
 * remove({User}, 'orgID', 'projID', 'branch', ['art1', 'art2'])
 * .then(function(artifacts) {
 *   // Do something with the deleted artifacts
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function remove(requestingUser, organizationID, projectID, branchID,
  artifacts, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options, organizationID, projectID, branchID);
    helper.checkParamsDataType(['object', 'string'], artifacts, 'Artifacts');

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.db(organizationID);
    const projID = sani.db(projectID);
    const branID = sani.db(branchID);
    const saniArtifacts = sani.db(JSON.parse(JSON.stringify(artifacts)));
    let artifactsToFind = [];

    // Check the type of the artifacts parameter
    if (Array.isArray(saniArtifacts) && saniArtifacts.length !== 0) {
      // An array of artifact ids, remove all
      artifactsToFind = saniArtifacts.map(
        e => utils.createID(orgID, projID, branID, e)
      );
    }
    else if (typeof saniArtifacts === 'string') {
      // A single artifact id, remove one
      artifactsToFind = [utils.createID(orgID, projID, branID, saniArtifacts)];
    }
    else {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for removing artifacts.', 'warn');
    }

    // Find the organization and validate that it was found and not archived
    const organization = await helper.findAndValidate(Org, orgID, reqUser);

    // Find the project and validate that it was found and not archived
    const project = await helper.findAndValidate(Project,
      utils.createID(orgID, projID), reqUser);

    // Find the branch and validate that it was found and not archived
    const branch = await helper.findAndValidate(Branch,
      utils.createID(orgID, projID, branID), reqUser);

    // Check that the branch is is not a tag
    if (branch.tag) {
      throw new M.OperationError(`[${branID}] is a tag and `
        + 'does not allow artifacts to be created, updated, or deleted.', 'warn');
    }

    // Permissions check
    permissions.deleteArtifact(reqUser, organization, project, branch);

    const searchQuery = { _id: { $in: artifactsToFind } };

    // Find the artifacts to delete
    const foundArtifacts = await Artifact.find(searchQuery, null, { lean: true });
    const foundArtifactIDs = foundArtifacts.map(a => a._id);

    // Check if all artifacts were found
    const notFoundIDs = artifactsToFind.filter(a => !foundArtifactIDs.includes(a));
    // Some artifacts not found, throw an error
    if (notFoundIDs.length > 0) {
      throw new M.NotFoundError('The following artifacts were not found: '
        + `[${notFoundIDs.map(a => utils.parseID(a).pop())}].`, 'warn');
    }
    // Delete the artifacts
    await Artifact.deleteMany(searchQuery);

    // Emit the event artifacts-deleted
    EventEmitter.emit('artifacts-deleted', foundArtifacts);

    // Return unique IDs of artifacts deleted
    return foundArtifactIDs;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function finds and returns an artifact blob based on project,
 * location and filename.
 *
 * @param {User} requestingUser - The requesting user.
 * @param {string} organizationID - The organization ID for the org the
 * project belongs to.
 * @param {string} projectID - The project ID of the project which which
 * contains the blob.
 * @param {object} artifact - Metadata containing parameters for finding the
 * artifact blob.
 * @param {object} [options] - A parameter that provides supported options.
 *
 * @returns {Promise<Buffer>} Artifact Blob object.
 */
async function getBlob(requestingUser, organizationID,
  projectID, artifact, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options, organizationID, projectID);
    helper.checkParamsDataType(['object'], artifact, 'Artifacts');

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniArt = sani.db(JSON.parse(JSON.stringify(artifact)));
    const orgID = sani.db(organizationID);
    const projID = sani.db(projectID);

    // Find the organization
    const organization = await helper.findAndValidate(Org, orgID, reqUser);

    // Find the project
    const project = await helper.findAndValidate(Project, utils.createID(orgID, projID), reqUser);

    // Permissions check
    permissions.readBlob(reqUser, organization, project);

    // Include org and project id
    saniArt.project = projID;
    saniArt.org = orgID;

    // Include artifact blob in return obj
    return ArtifactStrategy.getBlob(saniArt);
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function posts an artifact blob based on project,
 * location and filename.
 *
 * @param {User} requestingUser - The requesting user.
 * @param {string} organizationID - The organization ID for the org the
 * project belongs to.
 * @param {string} projectID - The project ID of the project which will contain
 * the newly created blob.
 * @param {object} artifact - Metadata containing parameters for creating
 * and storing the artifact blob.
 * @param {string} [artifact.filename] - The filename of the artifact.
 * @param {string} [artifact.location] - The location of the artifact.
 * @param {Buffer} artifactBlob - A binary large object artifact.
 * @param {object} [options] - A parameter that provides supported options.
 *
 * @returns {Promise<object>} Object that contains artifact location, filename,
 * and project.
 */
async function postBlob(requestingUser, organizationID,
  projectID, artifact, artifactBlob, options) {
  try {
    // Ensure artifact blob is buffer type
    if (Buffer.isBuffer(artifactBlob) === false) {
      throw new M.DataFormatError('Artifact blob must be a file.', 'warn');
    }

    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options, organizationID, projectID);
    helper.checkParamsDataType('object', artifact, 'Artifacts');

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniArt = sani.db(JSON.parse(JSON.stringify(artifact)));
    const orgID = sani.db(organizationID);
    const projID = sani.db(projectID);

    // Find the organization
    const organization = await helper.findAndValidate(Org, orgID, reqUser);

    // Find the project
    const project = await helper.findAndValidate(Project, utils.createID(orgID, projID), reqUser);

    // Permissions check
    permissions.createBlob(reqUser, organization, project);

    // Include org and project id
    saniArt.project = projID;
    saniArt.org = orgID;

    // Return artifact object
    ArtifactStrategy.postBlob(saniArt, artifactBlob);

    // Return artifact object
    return saniArt;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function deletes an artifact blob based on project,
 * location and filename.
 *
 * @param {User} requestingUser - The requesting user.
 * @param {string} organizationID - The organization ID for the org the
 * project belongs to.
 * @param {string} projectID - The project ID of the project which contains
 * the artifact blob.
 * @param {object[]} artifact - Metadata containing parameters for finding
 * the artifact blob.
 * @param {object} [options] - A parameter that provides supported options.
 *
 * @returns {Promise<object>} Object that contains artifact location, filename,
 * and project.
 */
async function deleteBlob(requestingUser, organizationID, projectID,
  artifact, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options, organizationID, projectID);
    helper.checkParamsDataType('object', artifact, 'Artifacts');

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniArt = sani.db(JSON.parse(JSON.stringify(artifact)));
    const orgID = sani.db(organizationID);
    const projID = sani.db(projectID);

    // Find the organization
    const organization = await helper.findAndValidate(Org, orgID, reqUser);

    // Find the project
    const project = await helper.findAndValidate(Project,
      utils.createID(orgID, projID), reqUser);

    // Permissions check
    permissions.deleteBlob(reqUser, organization, project);

    // Include org and project id
    saniArt.project = projectID;
    saniArt.org = orgID;

    // Delete the artifact blob
    ArtifactStrategy.deleteBlob(saniArt);

    // Return Artifact obj
    return saniArt;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}
