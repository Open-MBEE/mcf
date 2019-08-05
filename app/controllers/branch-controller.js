/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.branch-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Provides an abstraction layer on top of the Branch model that
 * implements controller logic and behavior for Branches.
 */

// Expose branch controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  remove
};

// Node.js Modules
const assert = require('assert');

// MBEE Modules
const Element = M.require('models.element');
const Branch = M.require('models.branch');
const Project = M.require('models.project');
const Org = M.require('models.organization');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');
const jmi = M.require('lib.jmi-conversions');
const errors = M.require('lib.errors');

/**
 * @description This function finds one or many branches. Depending on the given
 * parameters, this function can find a single branch by ID, multiple branches
 * by ID, or all branches in the given project.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {(string|string[])} [branches] - The branches to find. Can either be
 * an array of branch ids, a single branch id, or not provided, which defaults
 * to every branch being found.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {boolean} [options.archived = false] - If true, find results will include
 * archived objects.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
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
 * @param {boolean} [options.tag] - Search for branches with a specific tag
 * value.
 * @param {string} [options.source] - Search for branches with a specific source
 * branch.
 * @param {string} [options.name] - Search for branches with a specific name.
 * @param {string} [options.createdBy] - Search for branches with a specific
 * createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for branches with a
 * specific lastModifiedBy value.
 * @param {string} [options.archivedBy] - Search for branches with a specific
 * archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use
 * dot notation for the keys. Ex: custom.hello = 'world'
 *
 * @return {Promise} Array of found branch objects
 *
 * @example
 * find({User}, 'orgID', 'projID', ['branch1', 'branch2'], { populate: 'project' })
 * .then(function(branches) {
 *   // Do something with the found branches
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function find(requestingUser, organizationID, projectID, branches, options) {
  return new Promise((resolve, reject) => {
    // Set options if no branches were provided, but options were
    if (typeof branches === 'object' && branches !== null && !Array.isArray(branches)) {
      options = branches; // eslint-disable-line no-param-reassign
      branches = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');

      const branchesTypes = ['undefined', 'object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(branchesTypes.includes(typeof branches), 'Branches parameter is an invalid type.');
      // If branches is an object, ensure it's an array of strings
      if (typeof branches === 'object') {
        assert.ok(Array.isArray(branches), 'Branches is an object, but not an array.');
        assert.ok(branches.every(b => typeof b === 'string'), 'Branches is not an array of'
          + ' strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters
    const saniBranches = (branches !== undefined)
      ? sani.mongo(JSON.parse(JSON.stringify(branches)))
      : undefined;
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    let branchesToFind = [];

    // Define searchQuery
    const searchQuery = { project: utils.createID(orgID, projID), archived: false };

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'archived',
      'fields', 'limit', 'skip', 'lean', 'sort'], Branch);

    // Ensure options are valid
    if (options) {
      // Create array of valid search options
      const validSearchOptions = ['tag', 'source', 'name', 'createdBy',
        'lastModifiedBy', 'archivedBy'];

      // Loop through provided options, look for validSearchOptions
      Object.keys(options).forEach((o) => {
        // If the provided option is a valid search option
        if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
          // Ensure the search option is a string
          if ((o === 'tag') && typeof options[o] !== 'boolean') {
            throw new M.DataFormatError(`The option '${o}' is not a boolean.`, 'warn');
          }
          else if ((typeof options[o] !== 'string') && (o !== 'tag')) {
            throw new M.DataFormatError(`The option '${o}' is not a string.`, 'warn');
          }

          // If the search option is a branch reference
          if (['source'].includes(o)) {
            // Make value the concatenated ID
            options[o] = utils.createID(orgID, projID, options[o]);
          }
          // Add the search option to the searchQuery
          searchQuery[o] = sani.mongo(options[o]);
        }
      });
    }

    // If the archived field is true, remove it from the query
    if (validOptions.archived) {
      delete searchQuery.archived;
    }

    // Find the organization
    Org.findOne({ _id: orgID }).lean()
    .then((organization) => {
      // Check that the org was found
      if (!organization) {
        throw new M.NotFoundError(`Organization [${orgID}] not found.`, 'warn');
      }

      // Verify the user has at least read permissions on the organization
      if (!reqUser.admin && (!organization.permissions[reqUser._id]
        || !organization.permissions[reqUser._id].includes('read'))) {
        throw new M.PermissionError('User does not have permission to get'
          + ` branches on the organization [${orgID}].`, 'warn');
      }

      // Verify the organization is not archived
      if (organization.archived && !validOptions.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before finding branches.', 'warn');
      }

      // Find the project
      return Project.findOne({ _id: utils.createID(orgID, projID) }).lean();
    })
    .then((project) => {
      // Check that the project was found
      if (!project) {
        throw new M.NotFoundError(`Project [${projID}] not found in the `
          + `organization [${orgID}].`, 'warn');
      }

      // Verify the user has read permissions on the project
      if (!reqUser.admin && (!project.permissions[reqUser._id]
        || !project.permissions[reqUser._id].includes('read'))) {
        throw new M.PermissionError('User does not have permission to get'
          + ` branches on the project [${projID}].`, 'warn');
      }

      // Verify the project is not archived
      if (project.archived && !validOptions.archived) {
        throw new M.PermissionError(`The project [${projID}] is archived.`
          + ' It must first be unarchived before finding branches.', 'warn');
      }

      // Check the type of the branches parameter
      if (Array.isArray(saniBranches)) {
        // An array of branch ids, find all
        branchesToFind = saniBranches.map(b => utils.createID(orgID, projID, b));
        searchQuery._id = { $in: branchesToFind };
      }
      else if (typeof saniBranches === 'string') {
        // A single branch id
        searchQuery._id = utils.createID(orgID, projID, saniBranches);
      }
      else if (((typeof saniBranches === 'object' && saniBranches !== null)
        || saniBranches === undefined)) {
        // Find branches in the project
        branchesToFind = [];
      }
      else {
        // Invalid parameter, throw an error
        throw new M.DataFormatError('Invalid input for finding branches.', 'warn');
      }

      // If the lean option is supplied
      if (validOptions.lean) {
        // Find branches in a project
        return Branch.find(searchQuery, validOptions.fieldsString,
          { limit: validOptions.limit, skip: validOptions.skip })
        .sort(validOptions.sort)
        .populate(validOptions.populateString).lean()
        .then((finishedBranches) => resolve(finishedBranches))
        .catch((error) => reject(error));
      }
      else {
        return Branch.find(searchQuery, validOptions.fieldsString,
          { limit: validOptions.limit, skip: validOptions.skip })
        .sort(validOptions.sort)
        .populate(validOptions.populateString)
        .then((finishedBranches) => resolve(finishedBranches))
        .catch((error) => reject(error));
      }
    })
    .catch((error) => reject(errors.captureError(error)));
  });
}


/**
 * @description This functions creates one or many branches from the provided
 * data. This function is restricted to project writers or system-wide admins ONLY.
 * This function checks for any existing branches with duplicate IDs and duplicates
 * all the model elements in a specific branch in the project that is created.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {(Object|Object[])} branches - Either an array of objects containing
 * branch data or a single object containing branch data to create.
 * @param {string} [branches.id] - The ID of the branch being created.
 * @param {string} [branches.name] - The name of the branch.
 * @param {string} [branches.tag] = false - If the branch is a tag, the value
 * should be set to true. This will hinder all create, update, and deletes of
 * elements on the branch.
 * @param {Object} [branches.custom] - The custom data of the branch.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created branch objects
 *
 * @example
 * create({User}, 'orgID', 'projID', 'branchID', [{Branch1}, {Branch2}, ...],
 *  {populate: 'project' })
 * .then(function(branches) {
 *   // Do something with the newly created branches
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function create(requestingUser, organizationID, projectID, branches, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branches === 'object', 'Branches parameter is not an object.');
      assert.ok(branches !== null, 'Branches parameter cannot be null.');
      // If branches is an array, ensure each item inside is an object
      if (Array.isArray(branches)) {
        assert.ok(branches.every(b => typeof b === 'object'), 'Every item in branches is not an'
          + ' object.');
        assert.ok(branches.every(b => b !== null), 'One or more items in branches is null.');
        assert.ok(branches.every(b => b.source === branches[0].source), 'One or more items in branches source '
          + 'field is not the same.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }
    // Sanitize input parameters and create function-wide variables
    const saniBranches = sani.mongo(JSON.parse(JSON.stringify(branches)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    let branchObjects = [];
    let newBranches = [];
    let elementsCloning;
    let created = false;

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Branch);

    // Define array to store branch data
    let branchesToCreate = [];

    // Check the type of the branches parameter
    if (Array.isArray(saniBranches)) {
      // Branches is an array, create many branches
      branchesToCreate = saniBranches;
    }
    else if (typeof saniBranches === 'object') {
      // Branches is an object, create a single branch
      branchesToCreate = [saniBranches];
    }
    else {
      // Branches is not an object or array, throw an error
      throw new M.DataFormatError('Invalid input for creating branches.', 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrIDs = [];
    let sourceID;
    const validBranchKeys = ['id', 'name', 'custom', 'source', 'tag', 'archived'];

    // Check that each branch has an id, and add to arrIDs
    try {
      let index = 1;
      branchesToCreate.forEach((branch) => {
        // Set sourceID
        sourceID = branch.source;

        Object.keys(branch).forEach((k) => {
          // Ensure keys are valid
          assert.ok(validBranchKeys.includes(k), `Invalid key [${k}].`);
        });
        // Ensure each branch has an id and that its a string
        assert.ok(branch.hasOwnProperty('id'), `Branch #${index} does not have an id.`);
        assert.ok(branch.hasOwnProperty('source'), `Branch #${index} does not have a source.`);
        assert.ok(branch.source !== null, `Branch #${index}'s source can not be null.`);
        assert.ok(typeof branch.id === 'string', `Branch #${index}'s id is not a string.`);
        branch.id = utils.createID(orgID, projID, branch.id);
        // Check if branch with same ID is already being created
        assert.ok(!arrIDs.includes(branch.id), 'Multiple branches with the same '
          + `ID [${utils.parseID(branch.id).pop()}] cannot be created.`);
        arrIDs.push(branch.id);
        branch._id = branch.id;

        index++;
      });
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Find the organization
    Org.findOne({ _id: orgID }).lean()
    .then((organization) => {
      // Check that the org was found
      if (!organization) {
        throw new M.NotFoundError(`Organization [${orgID}] not found.`, 'warn');
      }

      // Verify user has at least read permissions on the org
      if (!reqUser.admin && (!organization.permissions[reqUser._id]
        || !organization.permissions[reqUser._id].includes('read'))) {
        throw new M.PermissionError('User does not have permission to create'
          + ` branches on the organization [${orgID}].`, 'warn');
      }

      // Verify the organization is not archived
      if (organization.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before creating branches.', 'warn');
      }

      // Find the project to verify existence and permissions
      return Project.findOne({ _id: utils.createID(orgID, projID) }).lean();
    })
    .then((foundProject) => {
      // Check that the project was found
      if (!foundProject) {
        throw new M.NotFoundError(`Project [${projID}] not found in the `
          + `organization [${orgID}].`, 'warn');
      }

      // Verify user has write permissions on the project
      if (!reqUser.admin && (!foundProject.permissions[reqUser._id]
        || !foundProject.permissions[reqUser._id].includes('write'))) {
        throw new M.PermissionError('User does not have permission to create'
          + ' branches on the project '
          + `[${projID}].`, 'warn');
      }

      // Verify the project is not archived
      if (foundProject.archived) {
        throw new M.PermissionError(`The project [${projID}] is archived.`
          + ' It must first be unarchived before creating branches.', 'warn');
      }

      sourceID = utils.createID(orgID, projID, sourceID);

      // Find the source branch to verify existence
      return Branch.findOne({ _id: sourceID }).lean();
    })
    .then((foundBranch) => {
      // Check that the branch was found
      if (!foundBranch) {
        throw new M.NotFoundError(`Branch [${utils.parseID(sourceID).pop()}] not found in the `
          + `project [${projID}].`, 'warn');
      }

      // Create searchQuery to search for any existing, conflicting branches
      const searchQuery = { _id: { $in: arrIDs } };

      // Find any existing, conflicting branches
      return Branch.find(searchQuery, '_id').lean();
    })
    .then((foundBranches) => {
      // If there are any foundBranches, there is a conflict
      if (foundBranches.length > 0) {
        // Get arrays of the foundBranches' ids
        const foundBranchIDs = foundBranches.map(b => utils.parseID(b._id).pop());

        // There are one or more branches with conflicting IDs
        throw new M.OperationError('Branches with the following IDs already exist'
          + ` [${foundBranchIDs.toString()}].`, 'warn');
      }

      // For each object of branch data, create the branch object
      branchObjects = branchesToCreate.map((branchObj) => {
        // Set the branch object variables
        branchObj.project = utils.createID(orgID, projID);
        branchObj.source = sourceID;
        branchObj.lastModifiedBy = reqUser._id;
        branchObj.createdBy = reqUser._id;
        branchObj.createdOn = Date.now();
        branchObj.updatedOn = Date.now();
        branchObj.archivedBy = (branchObj.archived) ? reqUser._id : null;
        branchObj.archivedOn = (branchObj.archived) ? Date.now() : null;

        return branchObj;
      });

      // Create the branches
      return Branch.insertMany(branchObjects);
    })
    .then((createdBranches) => {
      // Set the branches created to the new branches
      newBranches = createdBranches;
      // Set created to true
      // NOTE: This will only be used if elements do not get created
      created = true;

      // Find all the elements in the branch we are branching from
      return Element.find({ branch: sourceID }).lean();
    })
    .then((elementsToClone) => {
      let elementsToCreate = [];
      // Grabbing all the element ids
      elementsCloning = elementsToClone.map((e) => e._id);

      // Loop through all the branches
      newBranches.forEach((branch) => {
        // Create the new element objects for each element in the cloned from branch
        elementsToCreate = elementsToCreate.concat(elementsToClone.map((e) => {
          // Grab the element ID and parent ID
          const oldElemID = utils.parseID(e._id).pop();
          const elemID = utils.createID(branch._id, oldElemID);
          let parentID = null;

          // Verify there is a parent
          if (e.parent) {
            // Set the old id to the updated id
            const oldParentID = utils.parseID(e.parent).pop();
            parentID = utils.createID(branch._id, oldParentID);
          }

          // Create the element object
          const elemObj = {
            _id: elemID,
            name: e.name,
            parent: parentID,
            project: e.project,
            branch: branch._id,
            documentation: e.documentation,
            type: e.type,
            custom: e.custom,
            lastModifiedBy: reqUser._id,
            createdBy: e.createdBy,
            createdOn: e.createdOn,
            updatedOn: Date.now(),
            archived: e.archived,
            archivedOn: (e.archivedOn) ? e.archivedOn : null,
            archivedBy: (e.archivedBy) ? e.archivedBy : null
          };

          // If the element has a source
          if (e.source) {
            // Grab source IDS
            const IDs = utils.parseID(e.source);
            const elemSourceID = IDs.pop();
            const elemSourceBranchID = utils.createID(IDs);

            // Verify element's source is in this project
            if (elemSourceBranchID === sourceID) {
              // If the element's source is in this project,
              // create new ID
              elemObj.source = utils.createID(branch._id, elemSourceID);
            }
            else {
              // If the element's source is in another project,
              // keep the original id
              elemObj.source = e.source;
            }
          }

          // If the element has a target
          if (e.target) {
            // Grab source IDS
            const IDs = utils.parseID(e.target);
            const elemTargetID = IDs.pop();
            const elemTargetBranchID = utils.createID(IDs);

            // Verify element's target is in this project
            if (elemTargetBranchID === sourceID) {
              // If the element's target is in this project,
              // create new ID
              elemObj.target = utils.createID(branch._id, elemTargetID);
            }
            else {
              // If the element's target is in another project,
              // keep the original id
              elemObj.source = e.target;
            }
          }

          // Return the element object
          return elemObj;
        }));
      });
      // Create the new elements
      return Element.insertMany(elementsToCreate, { rawResult: true });
    })
    .then((queryResult) => {
      if (queryResult.result.n !== (newBranches.length * elementsCloning.length)) {
        // Not all elements were created
        throw new M.DatabaseError('Not all elements were cloned from branch.', 'error');
      }

      // reset created variable
      created = false;
    })
    .then(() => {
      // Emit the event branches-created
      EventEmitter.emit('branches-created', branchObjects);

      // If the lean option is supplied
      if (validOptions.lean) {
        return Branch.find({ _id: { $in: arrIDs } }, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return Branch.find({ _id: { $in: arrIDs } }, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundCreatedBranches) => resolve(foundCreatedBranches))
    .catch((error) => {
      // Verify if the branches were created
      if (created) {
        // Delete any elements created from branch
        Element.deleteMany({ branch: { $in: arrIDs } }).lean()
        // Delete the branches
        .then(() => Branch.deleteMany({ _id: { $in: arrIDs } }).lean())
        // Reject with error
        .then(() => reject(errors.captureError(error)))
        .catch(() => reject(errors.captureError(error)));
      }
      else {
        // Reject with error
        return reject(errors.captureError(error));
      }
    });
  });
}

/**
 * @description This function updates one or many branches. Multiple fields in
 * multiple branches can be updated at once, provided that the fields are
 * allowed to be updated. If a branch is archived, it must first be unarchived before any other
 * updates occur. This function is restricted to project writers and system-wide
 * admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {(Object|Object[])} branches - Either an array of objects containing
 * updates to branches, or a single object containing updates.
 * @param {string} branches.id - The ID of the branch being updated. Field
 * cannot be updated but is required to find branch.
 * @param {string} [branches.name] - The updated name of the branch.
 * @param {Object} [branches.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [branches.archived = false] - The updated archived field. If true,
 * the branch will not be able to be found until unarchived.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of updated branch objects
 *
 * @example
 * update({User}, 'orgID', 'projID' [{Updated Branch 1},
 *              {Updated Branch 2}...], { populate: 'project' })
 * .then(function(branches) {
 *   // Do something with the newly updated branches
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function update(requestingUser, organizationID, projectID, branches, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branches === 'object', 'Branches parameter is not an object.');
      assert.ok(branches !== null, 'Branches parameter cannot be null.');
      // If branches is an array, ensure each item inside is an object
      if (Array.isArray(branches)) {
        assert.ok(branches.every(b => typeof b === 'object'), 'Every item in branches is not an'
          + ' object.');
        assert.ok(branches.every(b => b !== null), 'One or more items in branches is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    const saniBranches = sani.mongo(JSON.parse(JSON.stringify(branches)));
    const duplicateCheck = {};
    let foundBranches = [];
    let foundProject = {};
    let branchesToUpdate = [];
    let searchQuery = {};
    const arrIDs = [];
    const bulkArray = [];

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Branch);

    // Check the type of the branches parameter
    if (Array.isArray(saniBranches)) {
      // Branches is an array, update many branches
      branchesToUpdate = saniBranches;
    }
    else if (typeof saniBranches === 'object') {
      // Branches is an object, update a single branches
      branchesToUpdate = [saniBranches];
    }
    else {
      throw new M.DataFormatError('Invalid input for updating branches.', 'warn');
    }

    // Find the organization
    Org.findOne({ _id: orgID }).lean()
    .then((organization) => {
      // Check that the org was found
      if (!organization) {
        throw new M.NotFoundError(`Organization [${orgID}] not found.`, 'warn');
      }

      // Verify the user has at least read permissions on the organization
      if (!reqUser.admin && (!organization.permissions[reqUser._id]
        || !organization.permissions[reqUser._id].includes('read'))) {
        throw new M.PermissionError('User does not have permission to update'
          + ` branches on the organization [${orgID}].`, 'warn');
      }

      // Verify the organization is not archived
      if (organization.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before updating branches.', 'warn');
      }

      // Find the project
      return Project.findOne({ _id: utils.createID(orgID, projID) }).lean();
    })
    .then((_foundProject) => {
      foundProject = _foundProject;
      // Check that the project was found
      if (!foundProject) {
        throw new M.NotFoundError(`Project [${projID}] not found in the `
          + `organization [${orgID}].`, 'warn');
      }

      // Verify user has write permissions on the project
      if (!reqUser.admin && (!foundProject.permissions[reqUser._id]
        || !foundProject.permissions[reqUser._id].includes('write'))) {
        throw new M.PermissionError('User does not have permission to update'
          + ` branch on the project [${projID}].`, 'warn');
      }

      // Verify the project is not archived
      if (foundProject.archived) {
        throw new M.PermissionError(`The project [${projID}] is archived.`
          + ' It must first be unarchived before updating branches.', 'warn');
      }
    })
    .then(() => {
      // Create list of ids
      try {
        let index = 1;
        branchesToUpdate.forEach((branch) => {
          // Ensure each branch has an id and that its a string
          assert.ok(branch.hasOwnProperty('id'), `Branch #${index} does not have an id.`);
          assert.ok(typeof branch.id === 'string', `Branch #${index}'s id is not a string.`);
          branch.id = utils.createID(orgID, projID, branch.id);
          // If a duplicate ID, throw an error
          if (duplicateCheck[branch.id]) {
            throw new M.DataFormatError('Multiple objects with the same ID '
              + `[${utils.parseID(branch.id).pop()}] exist in the update.`, 'warn');
          }
          else {
            duplicateCheck[branch.id] = branch.id;
          }
          arrIDs.push(branch.id);
          branch._id = branch.id;

          index++;
        });
      }
      catch (err) {
        throw new M.DataFormatError(err.message, 'warn');
      }

      // Create searchQuery
      searchQuery = { _id: { $in: arrIDs } };

      // Return when all branches have been found
      return Branch.find(searchQuery).lean();
    })
    .then((_foundBranches) => {
      foundBranches = _foundBranches;

      // Verify the same number of branches are found as desired
      if (foundBranches.length !== arrIDs.length) {
        const foundIDs = foundBranches.map(b => b._id);
        const notFound = arrIDs.filter(b => !foundIDs.includes(b))
        .map(b => utils.parseID(b).pop());
        throw new M.NotFoundError(
          `The following branches were not found: [${notFound.toString()}].`, 'warn'
        );
      }

      // Convert branchesToUpdate to JMI type 2
      const jmiType2 = jmi.convertJMI(1, 2, branchesToUpdate);

      // Get array of editable parameters
      const validFields = Branch.getValidUpdateFields();

      // For each found branch
      foundBranches.forEach((branch) => {
        const updateBranch = jmiType2[branch._id];
        // Remove id and _id field from update object
        delete updateBranch.id;
        delete updateBranch._id;

        // Error Check: if branch is currently archived, it must first be unarchived
        if (branch.archived && (updateBranch.archived === undefined
          || JSON.parse(updateBranch.archived) !== false)) {
          throw new M.OperationError(`Branch [${utils.parseID(branch._id).pop()}]`
            + ' is archived. Archived objects cannot be modified.', 'warn');
        }

        // For each key in the updated object
        Object.keys(updateBranch).forEach((key) => {
          // Check if the field is valid to update
          if (!validFields.includes(key)) {
            throw new M.OperationError(`Branch property [${key}] cannot `
              + 'be changed.', 'warn');
          }

          // Get validator for field if one exists
          if (validators.branch.hasOwnProperty(key)) {
            // If validation fails, throw error
            if (!RegExp(validators.branch[key]).test(updateBranch[key])) {
              throw new M.DataFormatError(
                `Invalid ${key}: [${updateBranch[key]}]`, 'warn'
              );
            }
          }

          // Set archivedBy if archived field is being changed
          if (key === 'archived') {
            // Error Check: ensure the root branch is not being archived
            if (Branch.getValidRootSource().includes(branch.id)) {
              throw new M.OperationError(
                `User cannot archive the master branch: ${branch.id}.`, 'warn'
              );
            }
            // If the branch is being archived
            if (updateBranch[key] && !branch[key]) {
              updateBranch.archivedBy = reqUser._id;
              updateBranch.archivedOn = Date.now();
            }
            // If the branch is being unarchived
            else if (!updateBranch[key] && branch[key]) {
              updateBranch.archivedBy = null;
              updateBranch.archivedOn = null;
            }
          }
        });

        // Update lastModifiedBy field and updatedOn
        updateBranch.lastModifiedBy = reqUser._id;
        updateBranch.updatedOn = Date.now();

        // Update the element
        bulkArray.push({
          updateOne: {
            filter: { _id: branch._id },
            update: updateBranch
          }
        });
      });

      // Update all branches through a bulk write to the database
      return Branch.bulkWrite(bulkArray);
    })
    .then(() => {
      // If the lean option is supplied
      if (validOptions.lean) {
        return Branch.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return Branch.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundUpdatedBranches) => {
      // Emit the event branches-updated
      EventEmitter.emit('branches-updated', foundUpdatedBranches);

      return resolve(foundUpdatedBranches);
    })
    .catch((error) => reject(errors.captureError(error)));
  });
}

/**
 * @description This function removes one or many branches as well as the
 * elements that belong to them.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {(string|string[])} branches - The branches to remove. Can either be
 * an array of branch ids or a single branch id.
 * @param {Object} [options] - A parameter that provides supported options.
 *
 * @return {Promise} Array of deleted branch ids.
 *
 * @example
 * remove({User}, 'orgID', 'projID', ['branch1', 'branch2'])
 * .then(function(branches) {
 *   // Do something with the deleted branches
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function remove(requestingUser, organizationID, projectID, branches, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');

      const branchesTypes = ['object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(branchesTypes.includes(typeof branches), 'Branches parameter is an invalid type.');
      // If branches is an object, ensure it's an array of strings
      if (typeof branches === 'object') {
        assert.ok(Array.isArray(branches), 'Branches is an object, but not an array.');
        assert.ok(branches.every(b => typeof b === 'string'), 'Branches is not an array of'
          + ' strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and function-wide variables
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    const saniBranches = sani.mongo(JSON.parse(JSON.stringify(branches)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundBranches = [];
    let searchedIDs = [];

    // Define searchQuery and ownedQuery
    const searchQuery = {};
    const ownedQuery = {};

    // Check the type of the branches parameter
    if (Array.isArray(saniBranches)) {
      // An array of branches ids, remove all
      searchedIDs = saniBranches.map(b => utils.createID(orgID, projID, b));
      searchQuery._id = { $in: searchedIDs };
    }
    else if (typeof saniBranches === 'string') {
      // A single branch id, remove one
      searchedIDs = [utils.createID(orgID, projID, saniBranches)];
      searchQuery._id = utils.createID(orgID, projID, saniBranches);
    }
    else {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for removing branches.', 'warn');
    }

    // Find the organization
    Org.findOne({ _id: orgID }).lean()
    .then((organization) => {
      // Check that the org was found
      if (!organization) {
        throw new M.NotFoundError(`Organization [${orgID}] not found.`, 'warn');
      }

      // Ensure the user has at least read access on the organization
      if (!reqUser.admin && (!organization.permissions[reqUser._id]
        || !organization.permissions[reqUser._id].includes('read'))) {
        throw new M.PermissionError('User does not have permission to delete'
          + ` branches on the organization [${orgID}].`, 'warn');
      }

      // Verify the organization is not archived
      if (organization.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before deleting branches.', 'warn');
      }

      // Find the project
      return Project.findOne({ _id: utils.createID(orgID, projID) }).lean();
    })
    .then((foundProject) => {
      // Verify the project was found or exists
      if (foundProject === null) {
        throw new M.NotFoundError(`The project [${projID}] was not found.`, 'warn');
      }

      // Verify the requesting user has at least project write permissions
      if (!reqUser.admin && (!foundProject.permissions[reqUser._id]
        || !foundProject.permissions[reqUser._id].includes('write'))) {
        throw new M.PermissionError('User does not have permission to delete'
          + ` branches on the project [${projID}].`, 'warn');
      }

      // Verify the project is not archived
      if (foundProject.archived) {
        throw new M.PermissionError(`The project [${projID}] is archived.`
          + ' It must first be unarchived before deleting branches.', 'warn');
      }

      // Find all the branches to delete
      return Branch.find(searchQuery).lean();
    })
    .then((_foundBranches) => {
      // Set the function-wide foundBranches and create ownedQuery
      foundBranches = _foundBranches;
      const foundBranchIDs = foundBranches.map(b => b._id);
      ownedQuery.branch = { $in: foundBranchIDs };

      // Check if all branches were found
      const notFoundIDs = searchedIDs.filter(b => !foundBranchIDs.includes(b));
      // Some branches not found, throw an error
      if (notFoundIDs.length > 0) {
        throw new M.NotFoundError('The following branches were not found: '
          + `[${notFoundIDs.map(b => utils.parseID(b).pop())}].`, 'warn');
      }

      // Check that user is not removing the master branch
      foundBranchIDs.forEach((id) => {
        // If trying to delete the master branch, throw an error
        const branchID = utils.parseID(id).pop();
        if (Branch.getValidRootSource().includes(branchID)) {
          throw new M.OperationError(
            `User cannot delete branch: ${branchID}.`, 'warn'
          );
        }
      });

      // Delete any elements in the branch
      return Element.deleteMany(ownedQuery).lean();
    })
    // Delete all the branches
    .then(() => Branch.deleteMany(searchQuery).lean())
    .then((retQuery) => {
      // Emit the event branches-deleted
      EventEmitter.emit('branches-deleted', foundBranches);

      // Verify that all of the branches were correctly deleted
      if (retQuery.n !== foundBranches.length) {
        M.log.error('Some of the following branches were not '
          + `deleted [${saniBranches.toString()}].`);
      }
      return resolve(foundBranches.map(b => b._id));
    })
    .catch((error) => reject(errors.captureError(error)));
  });
}
