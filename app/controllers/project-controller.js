/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.project-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Provides an abstraction layer on top of the Project model that
 * implements controller logic and behavior for Projects.
 */

// Expose project controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  createOrReplace,
  remove
};

// Node.js Modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// MBEE Modules
const Element = M.require('models.element');
const Branch = M.require('models.branch');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');
const jmi = M.require('lib.jmi-conversions');
const errors = M.require('lib.errors');

/**
 * @description This function finds one or many projects. Depending on the given
 * parameters, this function can find a single project by ID, multiple projects
 * by ID, or all projects in the given org. This function will return only the
 * projects a user has read access to.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {(string|string[])} [projects] - The projects to find. Can either be
 * an array of project ids, a single project id, or not provided, which defaults
 * to every project being found.
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
 * @param {string} [options.name] - Search for projects with a specific name.
 * @param {string} [options.visibility] - Search for projects with a certain
 * level of visibility.
 * @param {string} [options.createdBy] - Search for projects with a specific
 * createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for projects with a
 * specific lastModifiedBy value.
 * @param {string} [options.archivedBy] - Search for projects with a specific
 * archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use
 * dot notation for the keys. Ex: custom.hello = 'world'
 *
 * @return {Promise} Array of found project objects
 *
 * @example
 * find({User}, 'orgID', ['proj1', 'proj2'], { populate: 'org' })
 * .then(function(projects) {
 *   // Do something with the found projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function find(requestingUser, organizationID, projects, options) {
  return new Promise((resolve, reject) => {
    // Set options if no projects were provided, but options were
    if (typeof projects === 'object' && projects !== null && !Array.isArray(projects)) {
      options = projects; // eslint-disable-line no-param-reassign
      projects = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok((typeof organizationID === 'string') || (organizationID === null),
        'Organization ID is not a string.');

      const projectTypes = ['undefined', 'object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(projectTypes.includes(typeof projects), 'Projects parameter is an invalid type.');
      // If projects is an object, ensure it's an array of strings
      if (typeof projects === 'object') {
        assert.ok(Array.isArray(projects), 'Projects is an object, but not an array.');
        assert.ok(projects.every(p => typeof p === 'string'), 'Projects is not an array of'
          + ' strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters
    const orgID = sani.mongo(organizationID);
    const saniProjects = (projects !== undefined)
      ? sani.mongo(JSON.parse(JSON.stringify(projects)))
      : undefined;
    const reqUser = JSON.parse(JSON.stringify(requestingUser));

    // Define searchQuery
    const searchQuery = { archived: false };

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'archived',
      'fields', 'limit', 'skip', 'lean', 'sort'], Project);

    // Ensure options are valid
    if (options) {
      // Create array of valid search options
      const validSearchOptions = ['name', 'visibility', 'createdBy',
        'lastModifiedBy', 'archivedBy'];

      // Loop through provided options, look for validSearchOptions
      Object.keys(options).forEach((o) => {
        // If the provided option is a valid search option
        if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
          // Ensure the search option is a string
          if (typeof options[o] !== 'string') {
            throw new M.DataFormatError(`The option '${o}' is not a string.`, 'warn');
          }
          // Add the search option to the searchQuery
          searchQuery[o] = sani.mongo(options[o]);
        }
      });
    }

    // If not system admin, add permissions check
    if (!reqUser.admin) {
      searchQuery[`permissions.${reqUser._id}`] = 'read';
    }
    // If the archived field is true, remove it from the query
    if (validOptions.archived) {
      delete searchQuery.archived;
    }
    if (orgID !== null) {
      searchQuery.org = orgID;
    }

    // Check the type of the projects parameter
    if (Array.isArray(projects) && projects.every(p => typeof p === 'string')) {
      // An array of project ids, find all
      searchQuery._id = { $in: saniProjects.map(p => utils.createID(orgID, p)) };
    }
    else if (typeof projects === 'string') {
      // A single project id
      searchQuery._id = utils.createID(orgID, saniProjects);
    }
    else if (!((typeof projects === 'object' && projects !== null) || projects === undefined)) {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for finding projects.', 'warn');
    }

    // Find the organization
    Organization.findOne({ _id: orgID }).lean()
    .then((foundOrg) => {
      // Handle special case where user is requesting all projects they have access to
      if (organizationID !== null) {
        // Ensure the organization was found
        if (foundOrg === null) {
          throw new M.NotFoundError(`Organization [${orgID}] was not found.`,
            'warn');
        }

        // Ensure the user has at least read permissions on the organization
        if (!reqUser.admin && (!foundOrg.permissions[reqUser._id]
          || !foundOrg.permissions[reqUser._id].includes('read'))) {
          throw new M.PermissionError('User does not have permission to find'
            + ` projects on the organization [${orgID}].`, 'warn');
        }

        // If the org is archived and the user hasn't specified archived = true
        if (foundOrg.archived && !validOptions.archived) {
          throw new M.PermissionError(`The organization [${orgID}] is archived.`
            + ' It must first be unarchived before finding projects.', 'warn');
        }
      }

      // If the lean option is supplied
      if (validOptions.lean) {
        // Find the projects
        return Project.find(searchQuery, validOptions.fieldsString,
          { limit: validOptions.limit, skip: validOptions.skip })
        .sort(validOptions.sort)
        .populate(validOptions.populateString).lean();
      }
      else {
        // Find the projects
        return Project.find(searchQuery, validOptions.fieldsString,
          { limit: validOptions.limit, skip: validOptions.skip })
        .sort(validOptions.sort)
        .populate(validOptions.populateString);
      }
    })
    .then((finishedProjects) => resolve(finishedProjects))
    .catch((error) => reject(errors.captureError(error)));
  });
}

/**
 * @description This functions creates one or many projects from the provided
 * data. This function is restricted to org writers or system-wide admins ONLY.
 * This function checks for any existing projects with duplicate IDs and creates
 * the root model element for each project that is created.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {(Object|Object[])} projects - Either an array of objects containing
 * project data or a single object containing project data to create.
 * @param {string} projects.id - The ID of the project being created.
 * @param {string} projects.name - The name of the project.
 * @param {Object} [projects.custom] - The additions or changes to existing
 * custom data. If the key/value pair already exists, the value will be changed.
 * If the key/value pair does not exist, it will be added.
 * @param {string} [projects.visibility = 'private'] - The visibility of the
 * project being created. If 'internal', users not in the project but in the
 * owning org will be able to view the project.
 * @param {Object} [projects.permissions] - Any preset permissions on the
 * project. Keys should be usernames and values should be the highest
 * permissions the user has. NOTE: The requesting user gets added as an admin by
 * default.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created project objects
 *
 * @example
 * create({User}, 'orgID', [{Proj1}, {Proj2}, ...], { populate: 'org' })
 * .then(function(projects) {
 *   // Do something with the newly created projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function create(requestingUser, organizationID, projects, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projects === 'object', 'Projects parameter is not an object.');
      assert.ok(projects !== null, 'Projects parameter cannot be null.');
      // If projects is an array, ensure each item inside is an object
      if (Array.isArray(projects)) {
        assert.ok(projects.every(p => typeof p === 'object'), 'Every item in projects is not an'
          + ' object.');
        assert.ok(projects.every(p => p !== null), 'One or more items in projects is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and function-wide variables
    const orgID = sani.mongo(organizationID);
    const saniProjects = sani.mongo(JSON.parse(JSON.stringify(projects)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundOrg = {};
    let projObjects = [];

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Project);

    // Define array to store project data
    let projectsToCreate = [];

    // Check the type of the projects parameter
    if (Array.isArray(saniProjects)) {
      // projects is an array, create many projects
      projectsToCreate = saniProjects;
    }
    else if (typeof saniProjects === 'object') {
      // projects is an object, create a single project
      projectsToCreate = [saniProjects];
    }
    else {
      // projects is not an object or array, throw an error
      throw new M.DataFormatError('Invalid input for creating projects.', 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrIDs = [];
    const validProjKeys = ['id', 'name', 'custom', 'visibility', 'permissions',
      'archived'];

    // Check that each project has an id, and add to arrIDs
    try {
      let index = 1;
      projectsToCreate.forEach((proj) => {
        // Ensure keys are valid
        Object.keys(proj).forEach((k) => {
          assert.ok(validProjKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each project has an id and that its a string
        assert.ok(proj.hasOwnProperty('id'), `Project #${index} does not have an id.`);
        assert.ok(typeof proj.id === 'string', `Project #${index}'s id is not a string.`);
        proj.id = utils.createID(orgID, proj.id);
        // Check if project with same ID is already being created
        assert.ok(!arrIDs.includes(proj.id), 'Multiple projects with the same '
          + `ID [${utils.parseID(proj.id).pop()}] cannot be created.`);
        arrIDs.push(proj.id);
        proj._id = proj.id;

        // If user not setting permissions, add the field
        if (!proj.hasOwnProperty('permissions')) {
          proj.permissions = {};
        }

        // Add requesting user as admin on project
        proj.permissions[reqUser._id] = 'admin';

        index++;
      });
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Create searchQuery to search for any existing, conflicting projects
    const searchQuery = { _id: { $in: arrIDs } };

    // Find the organization to verify existence and permissions
    Organization.findOne({ _id: orgID }).lean()
    .then((_foundOrg) => {
      foundOrg = _foundOrg;
      // If the org was not found
      if (foundOrg === null) {
        throw new M.NotFoundError(`The org [${orgID}] was not found.`, 'warn');
      }

      // Verify user has write permissions on the org
      if (!reqUser.admin && (!foundOrg.permissions[reqUser._id]
        || !foundOrg.permissions[reqUser._id].includes('write'))) {
        throw new M.PermissionError('User does not have permission to create'
          + ` projects on the org [${foundOrg._id}].`, 'warn');
      }

      // Verify the org is not archived
      if (_foundOrg.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before creating projects.', 'warn');
      }

      // Find any existing, conflicting projects
      return Project.find(searchQuery, '_id').lean();
    })
    .then((foundProjects) => {
      // If there are any foundProjects, there is a conflict
      if (foundProjects.length > 0) {
        // Get arrays of the foundProjects's ids and names
        const foundProjectIDs = foundProjects.map(p => utils.parseID(p._id).pop());

        // There are one or more projects with conflicting IDs
        throw new M.OperationError('Projects with the following IDs already exist'
          + ` [${foundProjectIDs.toString()}].`, 'warn');
      }

      // Get all existing users for permissions
      return User.find({}).lean();
    })
    .then((foundUsers) => {
      // Create array of usernames
      const foundUsernames = foundUsers.map(u => u._id);
      const promises = [];
      // For each object of project data, create the project object
      projObjects = projectsToCreate.map((p) => {
        const projObj = new Project(p);
        // Set org
        projObj.org = orgID;
        // Set permissions
        Object.keys(projObj.permissions).forEach((u) => {
          // If user does not exist, throw an error
          if (!foundUsernames.includes(u)) {
            throw new M.NotFoundError(`User [${u}] not found.`, 'warn');
          }

          const permission = projObj.permissions[u];

          // Change permission level to array of permissions
          switch (permission) {
            case 'read':
              projObj.permissions[u] = ['read'];
              break;
            case 'write':
              projObj.permissions[u] = ['read', 'write'];
              break;
            case 'admin':
              projObj.permissions[u] = ['read', 'write', 'admin'];
              break;
            default:
              throw new M.DataFormatError(`Invalid permission [${permission}].`, 'warn');
          }

          // Check if they have been added to the org
          if (!foundOrg.permissions.hasOwnProperty(u)) {
            // Add user to org with read permissions
            const updateQuery = {};
            updateQuery[`permissions.${u}`] = ['read'];
            promises.push(Organization.updateOne({ _id: orgID }, updateQuery));
          }
        });
        projObj.lastModifiedBy = reqUser._id;
        projObj.createdBy = reqUser._id;
        projObj.updatedOn = Date.now();
        projObj.archivedBy = (projObj.archived) ? reqUser._id : null;
        return projObj;
      });

      // Create the projects
      promises.push(Project.insertMany(projObjects));

      // Return when all promises are complete
      return Promise.all(promises);
    })
    .then(() => {
      // Emit the event projects-created
      EventEmitter.emit('projects-created', projObjects);

      // Create a branch for each project
      const branchObjects = projObjects.map((p) => new Branch({
        _id: utils.createID(p._id, 'master'),
        name: 'Master',
        project: p._id,
        tag: false,
        lastModifiedBy: reqUser._id,
        createdBy: reqUser._id,
        createdOn: Date.now(),
        updatedOn: Date.now(),
        archived: p.archived,
        archivedBy: (p.archived) ? reqUser._id : null
      }));

      // Create the branch
      return Branch.insertMany(branchObjects);
    })
    .then(() => {
      // Create a root model element for each project
      const elemModelObj = projObjects.map((p) => new Element({
        _id: utils.createID(p._id, 'master', 'model'),
        name: 'Model',
        parent: null,
        project: p._id,
        branch: utils.createID(p._id, 'master'),
        lastModifiedBy: reqUser._id,
        createdBy: reqUser._id,
        createdOn: Date.now(),
        updatedOn: Date.now(),
        archived: p.archived,
        archivedBy: (p.archived) ? reqUser._id : null
      }));

      // Create a __MBEE__ element for each project
      const elemMBEEObj = projObjects.map((p) => new Element({
        _id: utils.createID(p._id, 'master', '__mbee__'),
        name: '__mbee__',
        parent: utils.createID(p._id, 'master', 'model'),
        project: p._id,
        branch: utils.createID(p._id, 'master'),
        lastModifiedBy: reqUser._id,
        createdBy: reqUser._id,
        createdOn: Date.now(),
        updatedOn: Date.now(),
        archived: p.archived,
        archivedBy: (p.archived) ? reqUser._id : null
      }));

      // Create a holding bin element for each project
      const elemHoldingBinObj = projObjects.map((p) => new Element({
        _id: utils.createID(p._id, 'master', 'holding_bin'),
        name: 'holding bin',
        parent: utils.createID(p._id, 'master', '__mbee__'),
        project: p._id,
        branch: utils.createID(p._id, 'master'),
        lastModifiedBy: reqUser._id,
        createdBy: reqUser._id,
        createdOn: Date.now(),
        updatedOn: Date.now(),
        archived: p.archived,
        archivedBy: (p.archived) ? reqUser._id : null
      }));

      // Create a undefined element for each project
      const elemUndefinedBinObj = projObjects.map((p) => new Element({
        _id: utils.createID(p._id, 'master', 'undefined'),
        name: 'undefined element',
        parent: utils.createID(p._id, 'master', '__mbee__'),
        project: p._id,
        branch: utils.createID(p._id, 'master'),
        lastModifiedBy: reqUser._id,
        createdBy: reqUser._id,
        createdOn: Date.now(),
        updatedOn: Date.now(),
        archived: p.archived,
        archivedBy: (p.archived) ? reqUser._id : null
      }));

      // Concatenate all element arrays
      const conCatElemObj = elemModelObj.concat(elemMBEEObj) // eslint-disable-next-line indent
        .concat(elemHoldingBinObj).concat(elemUndefinedBinObj);

      // Create the elements
      return Element.insertMany(conCatElemObj);
    })
    .then(() => {
      // If the lean option is supplied
      if (validOptions.lean) {
        return Project.find({ _id: { $in: arrIDs } }, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return Project.find({ _id: { $in: arrIDs } }, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundCreatedProjects) => resolve(foundCreatedProjects))
    .catch((error) => reject(errors.captureError(error)));
  });
}

/**
 * @description This function updates one or many projects. Multiple fields in
 * multiple projects can be updated at once, provided that the fields are
 * allowed to be updated. If updating project permissions, to add one or more
 * users, provide a permissions object containing key/value pairs where the
 * username of the user is the key, and the value is the role the user is given.
 * To remove a user, the value should be 'remove_all'. If updating the custom
 * data on a project, and key/value pairs that exist in the update object that
 * don't exist in the current custom data, the key/value pair will be added. If
 * the key/value pairs do exist, the value will be changed. If a project is
 * archived, it must first be unarchived before any other updates occur. This
 * function is restricted to admins of projects and system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {(Object|Object[])} projects - Either an array of objects containing
 * updates to projects, or a single object containing updates.
 * @param {string} projects.id - The ID of the project being updated. Field
 * cannot be updated but is required to find project.
 * @param {string} [projects.name] - The updated name of the project.
 * @param {Object} [projects.permissions] - An object of key value pairs, where
 * the key is the username, and the value is the role which the user is to have
 * in the project. To remove a user from a project, the value must be
 * 'remove_all'.
 * @param {Object} [projects.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [projects.archived = false] - The updated archived field. If true,
 * the project will not be able to be found until unarchived.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of updated project objects
 *
 * @example
 * update({User}, 'orgID', [{Updated Proj 1}, {Updated Proj 2}...], { populate: 'org' })
 * .then(function(projects) {
 *   // Do something with the newly updated projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function update(requestingUser, organizationID, projects, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projects === 'object', 'Projects parameter is not an object.');
      assert.ok(projects !== null, 'Projects parameter cannot be null.');
      // If projects is an array, ensure each item inside is an object
      if (Array.isArray(projects)) {
        assert.ok(projects.every(p => typeof p === 'object'), 'Every item in projects is not an'
          + ' object.');
        assert.ok(projects.every(p => p !== null), 'One or more items in projects is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const orgID = sani.mongo(organizationID);
    const saniProjects = sani.mongo(JSON.parse(JSON.stringify(projects)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const duplicateCheck = {};
    const loweredVisibility = [];
    let foundProjects = [];
    let projectsToUpdate = [];
    let existingUsers = [];
    let updatingPermissions = false;
    let foundOrg = {};

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Project);

    // Check the type of the projects parameter
    if (Array.isArray(saniProjects)) {
      // projects is an array, update many projects
      projectsToUpdate = saniProjects;
    }
    else if (typeof saniProjects === 'object') {
      // projects is an object, update a single project
      projectsToUpdate = [saniProjects];
    }
    else {
      throw new M.DataFormatError('Invalid input for updating projects.', 'warn');
    }

    // Create list of ids
    const arrIDs = [];
    try {
      let index = 1;
      projectsToUpdate.forEach((proj) => {
        // Ensure each project has an id and that its a string
        assert.ok(proj.hasOwnProperty('id'), `Project #${index} does not have an id.`);
        assert.ok(typeof proj.id === 'string', `Project #${index}'s id is not a string.`);
        proj.id = utils.createID(orgID, proj.id);
        // If a duplicate ID, throw an error
        if (duplicateCheck[proj.id]) {
          throw new M.DataFormatError('Multiple objects with the same ID '
            + `[${proj.id}] exist in the update.`, 'warn');
        }
        else {
          duplicateCheck[proj.id] = proj.id;
        }
        arrIDs.push(proj.id);
        proj._id = proj.id;

        // Check if updating user permissions
        if (proj.hasOwnProperty('permissions')) {
          updatingPermissions = true;
        }

        index++;
      });
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Create searchQuery
    const searchQuery = { _id: { $in: arrIDs } };

    // Find the organization containing the projects
    Organization.findOne({ _id: orgID }).lean()
    .then((_foundOrganization) => {
      // Check if the organization was found
      if (_foundOrganization === null) {
        throw new M.NotFoundError(`The org [${orgID}] was not found.`, 'warn');
      }

      // Ensure the user has at least read access on the organization
      if (!reqUser.admin && (!_foundOrganization.permissions[reqUser._id]
        || !_foundOrganization.permissions[reqUser._id].includes('read'))) {
        throw new M.PermissionError('User does not have permission to update'
          + ` projects on the organization [${orgID}].`, 'warn');
      }

      // Verify the org is not archived
      if (_foundOrganization.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before updating projects.', 'warn');
      }

      // Set function-wide foundOrg
      foundOrg = _foundOrganization;

      // Find the projects to update
      return Project.find(searchQuery).lean();
    })
    .then((_foundProjects) => {
      // Set function-wide foundProjects
      foundProjects = _foundProjects;

      // Check that the user has admin permissions
      foundProjects.forEach((proj) => {
        if (!reqUser.admin && (!proj.permissions[reqUser._id]
          || !proj.permissions[reqUser._id].includes('admin'))) {
          throw new M.PermissionError('User does not have permission to update'
            + ` the project [${utils.parseID(proj._id).pop()}].`, 'warn');
        }
      });

      // Verify the same number of projects are found as desired
      if (foundProjects.length !== arrIDs.length) {
        const foundIDs = foundProjects.map(p => p._id);
        const notFound = arrIDs.filter(p => !foundIDs.includes(p)).map(p => utils.parseID(p).pop());
        throw new M.NotFoundError(
          `The following projects [${notFound.toString()}] were not found in `
            + `the org [${orgID}].`, 'warn'
        );
      }

      // Find users if updating permissions
      if (updatingPermissions) {
        return User.find({}).lean();
      }

      // Return an empty array if not updating permissions
      return [];
    })
    .then((foundUsers) => {
      // Set existing users
      existingUsers = foundUsers.map(u => u._id);

      // Convert projectsToUpdate to JMI type 2
      const jmiType2 = jmi.convertJMI(1, 2, projectsToUpdate);
      const bulkArray = [];
      const promises = [];
      // Get array of editable parameters
      const validFields = Project.getValidUpdateFields();

      // For each found project
      foundProjects.forEach((proj) => {
        const updateProj = jmiType2[proj._id];
        // Remove id and _id field from update object
        delete updateProj.id;
        delete updateProj._id;

        // Error Check: if proj is currently archived, it must first be unarchived
        if (proj.archived && (updateProj.archived === undefined
          || JSON.parse(updateProj.archived) !== false)) {
          throw new M.OperationError(`Project [${proj._id}] is archived. `
              + 'Archived objects cannot be modified.', 'warn');
        }

        // For each key in the updated object
        Object.keys(updateProj).forEach((key) => {
          // Check if the field is valid to update
          if (!validFields.includes(key)) {
            throw new M.OperationError(`Project property [${key}] cannot `
                + 'be changed.', 'warn');
          }

          // Get validator for field if one exists
          if (validators.project.hasOwnProperty(key)) {
            // If validation fails, throw error
            if (!RegExp(validators.project[key]).test(updateProj[key])) {
              throw new M.DataFormatError(
                `Invalid ${key}: [${updateProj[key]}]`, 'warn'
              );
            }
          }

          // If the user is updating permissions
          if (key === 'permissions') {
            // Get a list of valid project permissions
            const validPermissions = Project.getPermissionLevels();

            // Loop through each user provided
            Object.keys(updateProj[key]).forEach((user) => {
              let permValue = updateProj[key][user];
              // Ensure user is not updating own permissions
              if (user === reqUser.username) {
                throw new M.OperationError('User cannot update own permissions.', 'warn');
              }

              // If user does not exist, throw an error
              if (!existingUsers.includes(user)) {
                throw new M.NotFoundError(`User [${user}] not found.`, 'warn');
              }

              // Value must be an string containing highest permissions
              if (typeof permValue !== 'string') {
                throw new M.DataFormatError(`Permission for ${user} must be a string.`, 'warn');
              }

              // Lowercase the permission value
              permValue = permValue.toLowerCase();

              // Value must be valid permission
              if (!validPermissions.includes(permValue)) {
                throw new M.DataFormatError(
                  `${permValue} is not a valid permission`, 'warn'
                );
              }

              // Set stored permissions value based on provided permValue
              switch (permValue) {
                case 'read':
                  proj.permissions[user] = ['read'];
                  break;
                case 'write':
                  proj.permissions[user] = ['read', 'write'];
                  break;
                case 'admin':
                  proj.permissions[user] = ['read', 'write', 'admin'];
                  break;
                case 'remove_all':
                  delete proj.permissions[user];
                  break;
                // Default case, unknown permission, throw an error
                default:
                  throw new M.DataFormatError(
                    `${permValue} is not a valid permission`, 'warn'
                  );
              }

              // If not removing a user, check if they have been added to the org
              if (permValue !== 'remove_all' && !foundOrg.permissions.hasOwnProperty(user)) {
                // Add user to org with read permissions
                const updateQuery = {};
                updateQuery[`permissions.${user}`] = ['read'];
                promises.push(Organization.updateOne({ _id: orgID }, updateQuery));
              }
            });

            // Copy permissions from project to update object
            updateProj.permissions = proj.permissions;
          }
          // Set archivedBy if archived field is being changed
          else if (key === 'archived') {
            // If the proj is being archived
            if (updateProj[key] && !proj[key]) {
              updateProj.archivedBy = reqUser._id;
              updateProj.archivedOn = Date.now();
            }
            // If the proj is being unarchived
            else if (!updateProj[key] && proj[key]) {
              updateProj.archivedBy = null;
              updateProj.archivedOn = null;
            }
          }
          // If updating the visibility from internal to private
          else if (key === 'visibility' && updateProj[key] === 'private'
            && proj[key] === 'internal') {
            // Add project ID to loweredVisibility array
            loweredVisibility.push(proj._id);
          }
        });

        // Update lastModifiedBy field and updatedOn
        updateProj.lastModifiedBy = reqUser._id;
        updateProj.updatedOn = Date.now();

        // Update the project
        bulkArray.push({
          updateOne: {
            filter: { _id: proj._id },
            update: updateProj
          }
        });
      });

      // Update all projects through a bulk write to the database
      promises.push(Project.bulkWrite(bulkArray));

      // Return when all promises have been complete
      return Promise.all(promises);
    })
    .then(() => {
      // Create query to find all elements which reference elements on any
      // projects whose visibility was just lowered to 'private'
      const relRegex = `^(${loweredVisibility.join(':)|(')}:)`;
      const relQuery = {
        project: { $nin: loweredVisibility },
        $or: [
          { source: { $regex: relRegex } },
          { target: { $regex: relRegex } }
        ]
      };

      // Find broken relationships
      return Element.find(relQuery).populate('source target').lean();
    })
    .then((foundElements) => {
      const bulkArray = [];

      // For each broken relationship
      foundElements.forEach((elem) => {
        // If the source no longer exists, set it to the undefined element
        if (loweredVisibility.includes(elem.source.project)) {
          // Add broken relationship details to custom data
          if (!elem.custom) elem.custom = {};
          if (!elem.custom.mbee) elem.custom.mbee = {};
          if (!elem.custom.mbee.broken_relationships) elem.custom.mbee.broken_relationships = [];
          elem.custom.mbee.broken_relationships.push(
            { date: Date.now(), type: 'source', element: elem.source, reason: 'Project Visibility' }
          );

          // Reset source to the undefined element
          elem.source = utils.createID(elem.branch, 'undefined');
        }

        // If the target no longer exists, set it to the undefined element
        if (loweredVisibility.includes(elem.target.project)) {
          // Add broken relationship details to custom data
          if (!elem.custom) elem.custom = {};
          if (!elem.custom.mbee) elem.custom.mbee = {};
          if (!elem.custom.mbee.broken_relationships) elem.custom.mbee.broken_relationships = [];
          elem.custom.mbee.broken_relationships.push(
            { date: Date.now(), type: 'target', element: elem.target, reason: 'Project Visibility' }
          );

          // Reset target to the undefined element
          elem.target = utils.createID(elem.branch, 'undefined');
        }

        bulkArray.push({
          updateOne: {
            filter: { _id: elem._id },
            update: elem
          }
        });
      });

      // If there are relationships to fix
      if (bulkArray.length > 0) {
        return Element.bulkWrite(bulkArray);
      }
    })
    .then(() => {
      // If the lean option is supplied
      if (validOptions.lean) {
        return Project.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return Project.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundUpdatedProjects) => {
      // Emit the event projects-updated
      EventEmitter.emit('projects-updated', foundUpdatedProjects);

      return resolve(foundUpdatedProjects);
    })
    .catch((error) => reject(errors.captureError(error)));
  });
}

/**
 * @description This functions creates one or many projects from the provided
 * data. If projects with matching ids already exist, the function replaces
 * those projects. This function is restricted to system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {(Object|Object[])} projects - Either an array of objects containing
 * project data or a single object containing project data to create.
 * @param {string} projects.id - The ID of the project being created.
 * @param {string} projects.name - The name of the project.
 * @param {Object} [projects.custom] - The additions or changes to existing
 * custom data. If the key/value pair already exists, the value will be changed.
 * If the key/value pair does not exist, it will be added.
 * @param {string} [projects.visibility = 'private'] - The visibility of the
 * project being created. If 'internal', users not in the project but in the
 * owning org will be able to view the project.
 * @param {Object} [projects.permissions] - Any preset permissions on the
 * project. Keys should be usernames and values should be the highest
 * permissions the user has. NOTE: The requesting user gets added as an admin by
 * default.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created project objects
 *
 * @example
 * createOrReplace({User}, 'orgID', [{Proj1}, {Proj2}, ...], { populate: 'org' })
 * .then(function(projects) {
 *   // Do something with the newly created/replaced projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function createOrReplace(requestingUser, organizationID, projects, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projects === 'object', 'Projects parameter is not an object.');
      assert.ok(projects !== null, 'Projects parameter cannot be null.');
      // If projects is an array, ensure each item inside is an object
      if (Array.isArray(projects)) {
        assert.ok(projects.every(p => typeof p === 'object'), 'Every item in projects is not an'
          + ' object.');
        assert.ok(projects.every(p => p !== null), 'One or more items in projects is null.');
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
    const saniProjects = sani.mongo(JSON.parse(JSON.stringify(projects)));
    const duplicateCheck = {};
    let foundProjects = [];
    let foundOrganization = [];
    let projectsToLookUp = [];
    let createdProjects = [];
    let isCreated = false;
    let isDeleted = false;
    const ts = Date.now();

    // Check the type of the projects parameter
    if (Array.isArray(saniProjects)) {
      // projects is an array, replace/create many projects
      projectsToLookUp = saniProjects;
    }
    else if (typeof saniProjects === 'object') {
      // projects is an object, replace/create a single project
      projectsToLookUp = [saniProjects];
    }
    else {
      throw new M.DataFormatError('Invalid input for updating projects.', 'warn');
    }

    // Create list of ids
    const arrIDs = [];
    try {
      let index = 1;
      projectsToLookUp.forEach((proj) => {
        // Ensure each project has an id and that its a string
        assert.ok(proj.hasOwnProperty('id'), `Project #${index} does not have an id.`);
        assert.ok(typeof proj.id === 'string', `Project #${index}'s id is not a string.`);
        const tmpID = utils.createID(orgID, proj.id);
        // If a duplicate ID, throw an error
        if (duplicateCheck[tmpID]) {
          throw new M.DataFormatError(`Multiple objects with the same ID [${proj.id}] exist in the`
            + ' update.', 'warn');
        }
        else {
          duplicateCheck[tmpID] = tmpID;
        }
        arrIDs.push(tmpID);
        index++;
      });
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Create searchQuery
    const searchQuery = { _id: { $in: arrIDs } };

    // Find the organization containing the projects
    Organization.findOne({ _id: orgID }).lean()
    .then((_foundOrganization) => {
      foundOrganization = _foundOrganization;

      // Check if the organization was found
      if (_foundOrganization === null) {
        throw new M.NotFoundError(`The org [${orgID}] was not found.`, 'warn');
      }

      // Verify the organization is not archived
      if (_foundOrganization.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before replacing projects.', 'warn');
      }

      // Find the projects to update
      return Project.find(searchQuery).lean();
    })
    .then((_foundProjects) => {
      foundProjects = _foundProjects;

      // Check if new projects are being created
      if (projectsToLookUp.length > foundProjects.length) {
        // Ensure the user has at least write access on the organization
        if (!reqUser.admin && (!foundOrganization.permissions[reqUser._id]
          || !foundOrganization.permissions[reqUser._id].includes('write'))) {
          throw new M.PermissionError('User does not have permission to create'
            + ` projects on the organization [${orgID}].`, 'warn');
        }
      }

      // Check that the user has admin permissions
      foundProjects.forEach((proj) => {
        if (!reqUser.admin && (!proj.permissions[reqUser._id]
          || !proj.permissions[reqUser._id].includes('admin'))) {
          throw new M.PermissionError('User does not have permission to create or '
            + `replace the project [${utils.parseID(proj._id).pop()}].`, 'warn');
        }
      });

      // If data directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data'))) {
        fs.mkdirSync(path.join(M.root, 'data'));
      }

      // If org directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data', orgID))) {
        fs.mkdirSync(path.join(M.root, 'data', orgID));
      }

      // Write contents to temporary file
      return new Promise(function(res, rej) {
        fs.writeFile(path.join(M.root, 'data', orgID, `PUT-backup-projects-${ts}.json`),
          JSON.stringify(_foundProjects), function(err) {
            if (err) rej(err);
            else res();
          });
      });
    })
    // Delete root elements from database
    .then(() => {
      const elemDelObj = [];
      foundProjects.forEach(p => {
        elemDelObj.push(utils.createID(p._id, 'master', 'model'));
        elemDelObj.push(utils.createID(p._id, 'master', '__mbee__'));
        elemDelObj.push(utils.createID(p._id, 'master', 'holding_bin'));
        elemDelObj.push(utils.createID(p._id, 'master', 'undefined'));
      });
      return Element.deleteMany({ _id: { $in: elemDelObj } }).lean();
    })
    // Delete branches from database
    .then(() => {
      const branchDelObj = [];
      foundProjects.forEach(p => {
        branchDelObj.push(utils.createID(p._id, 'master'));
      });
      return Branch.deleteMany({ _id: { $in: branchDelObj } }).lean();
    })
    // Delete projects from database
    .then(() => Project.deleteMany({ _id: { $in: foundProjects.map(p => p._id) } }).lean())

    .then(() => {
      // Emit the event projects-deleted
      EventEmitter.emit('projects-deleted', foundProjects);

      // Set deleted to true
      isDeleted = true;

      // Create the new/replaced projects
      return create(reqUser, orgID, projectsToLookUp, options);
    })
    .then((_createdProjects) => {
      createdProjects = _createdProjects;

      // Set created to true
      isCreated = true;

      const filePath = path.join(M.root, 'data',
        orgID, `PUT-backup-projects-${ts}.json`);
      // Delete the temporary file.
      if (fs.existsSync(filePath)) {
        return new Promise(function(res, rej) {
          fs.unlink(filePath, function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => {
      // Read all of the files in the org directory
      const existingFiles = fs.readdirSync(path.join(M.root, 'data', orgID));

      // If no files exist in the directory, delete it
      if (existingFiles.length === 0) {
        fs.rmdirSync(path.join(M.root, 'data', orgID));
      }

      // Return the newly created projects
      return resolve(createdProjects);
    })
    .catch((error) => new Promise((res) => {
      // Check if deleted and creation failed
      if (isDeleted && !isCreated) {
        // Reinsert original data
        Project.insertMany(foundProjects)
        .then(() => new Promise((resInner, rejInner) => {
          // Remove the file
          fs.unlink(path.join(M.root, 'data', orgID,
            `PUT-backup-projects-${ts}.json`), function(err) {
            if (err) rejInner(err);
            else resInner();
          });
        }))
        .then(() => res(errors.captureError(error)))
        .catch((err) => res(err));
      }
      else {
        // Resolve original error
        return res(error);
      }
    }))
    .then((error) => {
      // If an error was returned, reject it.
      if (error) {
        return reject(errors.captureError(error));
      }
    });
  });
}

/**
 * @description This function removes one or many projects as well as the
 * elements that belong to them. This function can be used by system-wide admins
 * ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {(string|string[])} projects - The projects to remove. Can either be
 * an array of project ids or a single project id.
 * @param {Object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @return {Promise} Array of deleted project ids.
 *
 * @example
 * remove({User}, 'orgID', ['proj1', 'proj2'])
 * .then(function(projects) {
 *   // Do something with the deleted projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function remove(requestingUser, organizationID, projects, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions to delete'
        + ' projects.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');

      const projectTypes = ['object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(projectTypes.includes(typeof projects), 'Projects parameter is an invalid type.');
      // If projects is an object, ensure it's an array of strings
      if (typeof projects === 'object') {
        assert.ok(Array.isArray(projects), 'Projects is an object, but not an array.');
        assert.ok(projects.every(p => typeof p === 'string'), 'Projects is not an array of'
          + ' strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and function-wide variables
    const orgID = sani.mongo(organizationID);
    const saniProjects = sani.mongo(JSON.parse(JSON.stringify(projects)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundProjects = [];
    let searchedIDs = [];

    // Ensure parameters are valid
    try {
      // Ensure that requesting user has an _id field
      assert.ok(reqUser.hasOwnProperty('_id'), 'Requesting user is not populated.');
      assert.ok(reqUser.admin, 'User does not have permissions to delete projects.');
      assert.ok(typeof orgID === 'string', 'Organization ID is not a string.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Define searchQuery and ownedQuery
    const searchQuery = {};
    const ownedQuery = {};

    // Check the type of the projects parameter
    if (Array.isArray(saniProjects)) {
      // An array of project ids, remove all
      searchedIDs = saniProjects.map(p => utils.createID(orgID, p));
      searchQuery._id = { $in: searchedIDs };
    }
    else if (typeof saniProjects === 'string') {
      // A single project id, remove one
      searchedIDs = [utils.createID(orgID, saniProjects)];
      searchQuery._id = utils.createID(orgID, saniProjects);
    }
    else {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for removing projects.', 'warn');
    }

    // Find the organization
    Organization.findOne({ _id: orgID }).lean()
    .then((foundOrg) => {
      // Verify the organization was found
      if (foundOrg === null) {
        throw new M.NotFoundError(`The organization [${orgID}] was not found.`,
          'warn');
      }

      // Verify the organization is not archived
      if (foundOrg.archived) {
        throw new M.PermissionError(`The organization [${orgID}] is archived.`
          + ' It must first be unarchived before deleting projects.', 'warn');
      }

      // Find the projects to delete
      return Project.find(searchQuery).lean();
    })
    .then((_foundProjects) => {
      // Set the function-wide foundProjects and create ownedQuery
      foundProjects = _foundProjects;
      const foundProjectIDs = foundProjects.map(p => p._id);
      ownedQuery.project = { $in: foundProjectIDs };

      // Check if all projects were found
      const notFoundIDs = searchedIDs.filter(p => !foundProjectIDs.includes(p));
      // Some projects not found, throw an error
      if (notFoundIDs.length > 0) {
        throw new M.NotFoundError('The following projects were not found: '
          + `[${notFoundIDs.map(p => utils.parseID(p).pop())}].`, 'warn');
      }

      // Delete any elements in the project
      return Element.deleteMany(ownedQuery).lean();
    })
    // Delete any branches in the project
    .then(() => Branch.deleteMany(ownedQuery).lean())
    // Delete the projects
    .then(() => Project.deleteMany(searchQuery).lean())
    .then((retQuery) => {
      // Emit the event projects-deleted
      EventEmitter.emit('projects-deleted', foundProjects);

      // Verify that all of the projects were correctly deleted
      if (retQuery.n !== foundProjects.length) {
        M.log.error('Some of the following projects were not '
            + `deleted [${saniProjects.toString()}].`);
      }
      return resolve(foundProjects.map(p => p._id));
    })
    .catch((error) => reject(errors.captureError(error)));
  });
}
