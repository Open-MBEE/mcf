/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.organization-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Josh Kaplan
 * @author Austin Bieber
 * @author Connor Doyle
 * @author Phillip Lee
 *
 * @description Provides an abstraction layer on top of the Organization model
 * that provides functions implementing controller logic and behavior.
 */

// Expose organization controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  createOrReplace,
  remove
};

// Node modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// MBEE modules
const Artifact = M.require('models.artifact');
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
const helper = M.require('lib.controller-utils');
const permissions = M.require('lib.permissions');
const ArtifactStrategy = M.require(`artifact.${M.config.artifact.strategy}`);

/**
 * @description This function finds one or many organizations. Depending on the
 * given parameters, this function can find a single org by ID, multiple orgs by ID,
 * or all orgs in the system. Only organizations which a user has read access to
 * will be returned.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} [orgs] - The organizations to find. Can either be
 * an array of org ids, a single org id, or not provided, which defaults to
 * every org being found.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {boolean} [options.includeArchived = false] - If true, find results will include
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
 * @param {string} [options.sort] - Provide a particular field to sort the results by.
 * You may also add a negative sign in front of the field to indicate sorting in
 * reverse order.
 * @param {string} [options.name] - Search for orgs with a specific name.
 * @param {string} [options.createdBy] - Search for orgs with a specific
 * createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for orgs with a specific
 * lastModifiedBy value.
 * @param {string} [options.archived] - Search only for archived orgs.  If false,
 * only returns unarchived orgs.  Overrides the includeArchived option.
 * @param {string} [options.archivedBy] - Search for orgs with a specific
 * archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use
 * dot notation for the keys. Ex: custom.hello = 'world'.
 *
 * @returns {Promise<object[]>} Array of found organization objects.
 *
 * @example
 * find({User}, ['org1', 'org2'], { populate: 'createdBy' })
 * .then(function(orgs) {
 *   // Do something with the found orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function find(requestingUser, orgs, options) {
  try {
    // Set options if no orgs were provided, but options were
    if (typeof orgs === 'object' && orgs !== null && !Array.isArray(orgs)) {
      options = orgs; // eslint-disable-line no-param-reassign
      orgs = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType(['undefined', 'object', 'string'], orgs, 'Orgs');

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniOrgs = (orgs !== undefined)
      ? sani.db(JSON.parse(JSON.stringify(orgs)))
      : undefined;

    // Define searchQuery
    const searchQuery = { archived: false };

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate',
      'includeArchived', 'fields', 'limit', 'skip', 'sort'], Organization);

    // Ensure options are valid
    if (options) {
      // Create array of valid search options
      const validSearchOptions = ['name', 'createdBy', 'lastModifiedBy', 'archived',
        'archivedBy'];

      // Loop through provided options, look for validSearchOptions
      Object.keys(options).forEach((o) => {
        // If the provided option is a valid search option
        if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
          // Ensure the archived search option is a boolean
          if (o === 'archived' && typeof options[o] !== 'boolean') {
            throw new M.DataFormatError(`The option '${o}' is not a boolean.`, 'warn');
          }
          // Ensure the search option is a string
          else if (typeof options[o] !== 'string' && o !== 'archived') {
            throw new M.DataFormatError(`The option '${o}' is not a string.`, 'warn');
          }
          // Add the search option to the searchQuery
          searchQuery[o] = sani.db(options[o]);
        }
      });
    }

    // If not system admin, add permissions check
    if (!reqUser.admin) {
      searchQuery[`permissions.${reqUser._id}`] = { $all: ['read'] };
    }
    // If the includeArchived field is true, remove archived from the query; return everything
    if (validatedOptions.includeArchived) {
      delete searchQuery.archived;
    }
    // If the archived field is true, query only for archived elements
    if (validatedOptions.archived) {
      searchQuery.archived = true;
    }

    // Check the type of the orgs parameter
    if (Array.isArray(orgs) && orgs.every(o => typeof o === 'string')) {
      // An array of org ids, find all
      searchQuery._id = { $in: saniOrgs };
    }
    else if (typeof orgs === 'string') {
      // A single org id
      searchQuery._id = saniOrgs;
    }
    else if (!((typeof orgs === 'object' && orgs !== null) || orgs === undefined)) {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for finding organizations.', 'warn');
    }

    // Find the orgs
    return await Organization.find(searchQuery, validatedOptions.fieldsString,
      { limit: validatedOptions.limit,
        skip: validatedOptions.skip,
        sort: validatedOptions.sort,
        populate: validatedOptions.populateString
      });
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This functions creates one or many orgs from the provided data.
 * This function is restricted to system-wide admins ONLY. This function checks
 * for any existing orgs with duplicate IDs before creating and returning the
 * given orgs.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} orgs - Either an array of objects containing org
 * data or a single object containing org data to create.
 * @param {string} orgs.id - The ID of the org being created.
 * @param {string} orgs.name - The organization name.
 * @param {object} [orgs.custom] - Any additional key/value pairs for an object.
 * Must be proper JSON form.
 * @param {object} [orgs.permissions] - Any preset permissions on the org. Keys
 * should be usernames and values should be the highest permissions the user
 * has. NOTE: The requesting user gets added as an admin by default.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 *
 * @returns {Promise<object[]>} Array of created organization objects.
 *
 * @example
 * create({User}, [{Org1}, {Org2}, ...], { populate: 'createdBy' })
 * .then(function(orgs) {
 *   // Do something with the newly created orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function create(requestingUser, orgs, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', orgs, 'Orgs');

    // Create or remove orgs function only: must be admin
    permissions.createOrg(requestingUser);

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniOrgs = sani.db(JSON.parse(JSON.stringify(orgs)));

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields'], Organization);

    // Define array to store org data
    let orgsToCreate = [];

    // Check the type of the orgs parameter
    if (Array.isArray(saniOrgs)) {
      // orgs is an array, create many orgs
      orgsToCreate = saniOrgs;
    }
    else if (typeof saniOrgs === 'object') {
      // orgs is an object, create a single org
      orgsToCreate = [saniOrgs];
    }
    else {
      // orgs is not an object or array, throw an error
      throw new M.DataFormatError('Invalid input for creating organizations.', 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrIDs = [];
    const validOrgKeys = ['id', 'name', 'custom', 'permissions', 'archived'];

    // Check that each org has an id, and add to arrIDs
    let index = 1;
    orgsToCreate.forEach((org) => {
      try {
        // Ensure keys are valid
        Object.keys(org).forEach((k) => {
          assert.ok(validOrgKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each org has an id and that its a string
        assert.ok(org.hasOwnProperty('id'), `Org #${index} does not have an id.`);
        assert.ok(typeof org.id === 'string', `Org #${index}'s id is not a string.`);
        // Check if org with same ID is already being created
        assert.ok(!arrIDs.includes(org.id), 'Multiple orgs with the same ID '
          + `[${org.id}] cannot be created.`);
      }
      catch (error) {
        throw new M.DataFormatError(error.message, 'warn');
      }
      arrIDs.push(org.id);
      // Set the _id equal to the id
      org._id = org.id;

      // If user not setting permissions, add the field
      if (!org.hasOwnProperty('permissions')) {
        org.permissions = {};
      }

      // Add requesting user as admin on org
      org.permissions[reqUser._id] = 'admin';

      index++;
    });

    // Create searchQuery to search for any existing, conflicting orgs
    const searchQuery = { _id: { $in: arrIDs } };


    // Find any existing, conflicting orgs
    const foundOrgs = await Organization.find(searchQuery, '_id');
    // If there are any foundOrgs, there is a conflict
    if (foundOrgs.length > 0) {
      // Get arrays of the foundOrg's ids and names
      const foundOrgIDs = foundOrgs.map(o => o._id);

      // There are one or more orgs with conflicting IDs
      throw new M.OperationError('Orgs with the following IDs already exist'
        + ` [${foundOrgIDs.toString()}].`, 'warn');
    }

    // Get all existing users for permissions
    const foundUsers = await User.find({}, null);

    // Create array of usernames
    const foundUsernames = foundUsers.map(u => u._id);
    // For each object of org data, create the org object
    const orgObjects = orgsToCreate.map((o) => {
      // Set permissions
      Object.keys(o.permissions).forEach((u) => {
        // If user does not exist, throw an error
        if (!foundUsernames.includes(u)) {
          throw new M.NotFoundError(`User [${u}] not found.`, 'warn');
        }

        const permission = o.permissions[u];

        // Change permission level to array of permissions
        switch (permission) {
          case 'read':
            o.permissions[u] = ['read'];
            break;
          case 'write':
            o.permissions[u] = ['read', 'write'];
            break;
          case 'admin':
            o.permissions[u] = ['read', 'write', 'admin'];
            break;
          default:
            throw new M.DataFormatError(`Invalid permission [${permission}].`, 'warn');
        }
      });
      o.lastModifiedBy = reqUser._id;
      o.createdBy = reqUser._id;
      o.updatedOn = Date.now();
      o.archivedBy = (o.archived) ? reqUser._id : null;
      o.archivedOn = (o.archived) ? Date.now() : null;
      return o;
    });

    // Create the organizations
    await Organization.insertMany(orgObjects);

    // Emit the event orgs-created
    EventEmitter.emit('orgs-created', orgObjects);

    return await Organization.find({ _id: { $in: arrIDs } },
      validatedOptions.fieldsString,
      { populate: validatedOptions.populateString });
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function updates one or many orgs. Multiple fields in
 * multiple orgs can be updated at once, provided that the fields are allowed to
 * be updated. If updating org permissions, to add one or more users, provide
 * a permissions object containing key/value pairs where the username of the
 * user is the key, and the value is the role the user is given. To remove a
 * user, the value should be 'remove_all'. If updating the custom data on an
 * org, and key/value pairs that exist in the update object that don't exist in
 * the current custom data, the key/value pair will be added. If the key/value
 * pairs do exist, the value will be changed. If an org is archived, it
 * must first be unarchived before any other updates occur. This function is
 * restricted to admins of orgs and system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} orgs - Either an array of objects containing
 * updates to organizations, or a single object containing updates.
 * @param {string} orgs.id - The ID of the org being updated. Field cannot be
 * updated but is required to find org.
 * @param {string} [orgs.name] - The updated name of the organization.
 * @param {object} [orgs.permissions] - An object of key value pairs, where the
 * key is the username, and the value is the role which the user is to have in
 * the org. To remove a user from an org, the value must be 'remove_all'.
 * @param {object} [orgs.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [orgs.archived = false] - The updated archived field. If true, the
 * org will not be able to be found until unarchived.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 *
 * @returns {Promise<object[]>} Array of updated organization objects.
 *
 * @example
 * update({User}, [{Updated Org 1}, {Updated Org 2}...], { populate: 'createdBy' })
 * .then(function(orgs) {
 *   // Do something with the newly updated orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function update(requestingUser, orgs, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', orgs, 'Orgs');

    // Sanitize input parameters and function-wide variables
    const saniOrgs = sani.db(JSON.parse(JSON.stringify(orgs)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const duplicateCheck = {};
    let foundOrgs = [];
    let orgsToUpdate = [];
    let existingUsers = [];
    let updatingPermissions = false;

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields'], Organization);

    // Check the type of the orgs parameter
    if (Array.isArray(saniOrgs)) {
      // orgs is an array, update many orgs
      orgsToUpdate = saniOrgs;
    }
    else if (typeof saniOrgs === 'object') {
      // orgs is an object, update a single org
      orgsToUpdate = [saniOrgs];
    }
    else {
      throw new M.DataFormatError('Invalid input for updating organizations.', 'warn');
    }

    // Create list of ids
    const arrIDs = [];
    try {
      let index = 1;
      orgsToUpdate.forEach((org) => {
        // Ensure each org has an id and that its a string
        assert.ok(org.hasOwnProperty('id'), `Org #${index} does not have an id.`);
        assert.ok(typeof org.id === 'string', `Org #${index}'s id is not a string.`);
        // If a duplicate ID, throw an error
        if (duplicateCheck[org.id]) {
          throw new M.OperationError('Multiple objects with the same ID '
            + `[${org.id}] exist in the update.`, 'warn');
        }
        else {
          duplicateCheck[org.id] = org.id;
        }
        arrIDs.push(org.id);
        // Set the _id equal to the id
        org._id = org.id;

        // Check if updating user permissions
        if (org.hasOwnProperty('permissions')) {
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

    try {
      // Find the orgs to update
      foundOrgs = await Organization.find(searchQuery, null, { populate: 'projects' });
    }
    catch (error) {
      throw new M.DatabaseError(error.message, 'warn');
    }

    // Check that the user has permissions to update each org
    foundOrgs.forEach((org) => {
      permissions.updateOrg(reqUser, org);
    });

    // Verify the same number of orgs are found as desired
    if (foundOrgs.length !== arrIDs.length) {
      const foundIDs = foundOrgs.map(o => o._id);
      const notFound = arrIDs.filter(o => !foundIDs.includes(o));
      throw new M.NotFoundError(
        `The following orgs were not found: [${notFound.toString()}].`, 'warn'
      );
    }

    let foundUsers = [];
    // Find users if updating permissions
    if (updatingPermissions) {
      try {
        foundUsers = await User.find({});
      }
      catch (error) {
        throw new M.DatabaseError(error.message, 'warn');
      }
    }

    // Set existing users
    existingUsers = foundUsers.map(u => u._id);

    // Convert orgsToUpdate to JMI type 2
    const jmiType2 = jmi.convertJMI(1, 2, orgsToUpdate);
    const bulkArray = [];
    // Get array of editable parameters
    const validFields = Organization.getValidUpdateFields();

    // For each found org
    foundOrgs.forEach((org) => {
      const updateOrg = jmiType2[org._id];
      // Remove id and _id field from update object
      delete updateOrg.id;
      delete updateOrg._id;

      // Error Check: ensure the org being updated is not the default org
      if (org._id === M.config.server.defaultOrganizationId) {
        // orgID is default, reject error
        throw new M.OperationError('Cannot update the default org.', 'warn');
      }

      // Error Check: if org is currently archived, it must first be unarchived
      if (org.archived && (updateOrg.archived === undefined
        || JSON.parse(updateOrg.archived) !== false)) {
        throw new M.OperationError(`Organization [${org._id}] is archived. `
          + 'Archived objects cannot be modified.', 'warn');
      }

      // For each key in the updated object
      Object.keys(updateOrg).forEach((key) => {
        // Check if the field is valid to update
        if (!validFields.includes(key)) {
          throw new M.OperationError(`Organization property [${key}] cannot `
            + 'be changed.', 'warn');
        }

        // Get validator for field if one exists
        if (validators.org.hasOwnProperty(key)) {
          // If the validator is a regex string
          if (typeof validators.org[key] === 'string') {
            // If validation fails, throw error
            if (!RegExp(validators.org[key]).test(updateOrg[key])) {
              throw new M.DataFormatError(
                `Invalid ${key}: [${updateOrg[key]}]`, 'warn'
              );
            }
          }
          // If the validator is a function
          else if (typeof validators.org[key] === 'function') {
            if (!validators.org[key](updateOrg[key])) {
              throw new M.DataFormatError(
                `Invalid ${key}: [${updateOrg[key]}]`, 'warn'
              );
            }
          }
          // Improperly formatted validator
          else {
            throw new M.ServerError(`Org validator [${key}] is neither a `
              + 'function nor a regex string.');
          }
        }

        // If the user is updating permissions
        if (key === 'permissions') {
          // Loop through each user provided
          Object.keys(updateOrg[key]).forEach((user) => {
            let permValue = updateOrg[key][user];
            // Ensure user is not updating own permissions
            if (user === reqUser._id) {
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

            // Set stored permissions value based on provided permValue
            switch (permValue) {
              case 'read':
                org.permissions[user] = ['read'];
                break;
              case 'write':
                org.permissions[user] = ['read', 'write'];
                break;
              case 'admin':
                org.permissions[user] = ['read', 'write', 'admin'];
                break;
              case 'remove_all':
                // If user is still on a project within the org, throw error
                org.projects.forEach((p) => {
                  if (p.permissions.hasOwnProperty(user)) {
                    throw new M.OperationError('User must be removed from '
                      + `the project [${utils.parseID(p._id).pop()}] prior`
                      + ` to being removed from the org [${org._id}].`, 'warn');
                  }
                });
                delete org.permissions[user];
                break;
              // Default case, invalid permission
              default:
                throw new M.DataFormatError(
                  `${permValue} is not a valid permission`, 'warn'
                );
            }
          });

          // Copy permissions from org to update object
          updateOrg.permissions = org.permissions;
        }
        // Set archivedBy if archived field is being changed
        else if (key === 'archived') {
          // If the org is being archived
          if (updateOrg[key] && !org[key]) {
            updateOrg.archivedBy = reqUser._id;
            updateOrg.archivedOn = Date.now();
          }
          // If the org is being unarchived
          else if (!updateOrg[key] && org[key]) {
            updateOrg.archivedBy = null;
            updateOrg.archivedOn = null;
          }
        }
      });

      // Update lastModifiedBy field and updatedOn
      updateOrg.lastModifiedBy = reqUser._id;
      updateOrg.updatedOn = Date.now();

      // Update the org
      bulkArray.push({
        updateOne: {
          filter: { _id: org._id },
          update: updateOrg
        }
      });
    });

    // Update all orgs through a bulk write to the database
    await Organization.bulkWrite(bulkArray);

    const foundUpdatedOrgs = await Organization.find(searchQuery, validatedOptions.fieldsString,
      { populate: validatedOptions.populateString });

    // Emit the event orgs-updated
    EventEmitter.emit('orgs-updated', foundUpdatedOrgs);

    return foundUpdatedOrgs;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function creates one or many orgs. If orgs with matching
 * ids already exist, this function updates those orgs.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} orgs - Either an array of objects containing
 * updates/new data for organizations, or a single object containing updates.
 * @param {string} orgs.id - The ID of the org being updated/created. Field
 * cannot be updated but is required to find/created org.
 * @param {string} [orgs.name] - The updated/new name of the organization.
 * @param {object} [orgs.permissions] - An object of key value pairs, where the
 * key is the username, and the value is the role which the user is to have in
 * the org.
 * @param {object} [orgs.custom] - The additions or changes to existing custom
 * data. If the key/value pair already exists, the value will be changed. If the
 * key/value pair does not exist, it will be added.
 * @param {boolean} [orgs.archived = false] - The archived field. If true, the org will
 * not be able to be found until unarchived.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 *
 * @returns {Promise<object[]>} Array of replaced/created organization objects.
 *
 * @example
 * createOrReplace({User}, [{Updated Org 1}, {Updated Org 2}...])
 * .then(function(orgs) {
 *   // Do something with the newly replaced/created orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function createOrReplace(requestingUser, orgs, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', orgs, 'Orgs');

    // Sanitize input parameters and function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniOrgs = sani.db(JSON.parse(JSON.stringify(orgs)));
    const duplicateCheck = {};
    let foundOrgs = [];
    let orgsToLookup = [];
    let createdOrgs = [];
    const ts = Date.now();

    // Check the type of the orgs parameter
    if (Array.isArray(saniOrgs)) {
      // orgs is an array, update many orgs
      orgsToLookup = saniOrgs;
    }
    else if (typeof saniOrgs === 'object') {
      // orgs is an object, update a single org
      orgsToLookup = [saniOrgs];
    }
    else {
      throw new M.DataFormatError('Invalid input for creating/replacing '
        + 'organizations.', 'warn');
    }

    // Create list of ids
    const arrIDs = [];

    let index = 1;
    orgsToLookup.forEach((org) => {
      try {
        // Ensure each org has an id and that its a string
        assert.ok(org.hasOwnProperty('id'), `Org #${index} does not have an id.`);
        assert.ok(typeof org.id === 'string', `Org #${index}'s id is not a string.`);
      }
      catch (error) {
        throw new M.DataFormatError(error.message, 'warn');
      }
      // If a duplicate ID, throw an error
      if (duplicateCheck[org.id]) {
        throw new M.DataFormatError(`Multiple objects with the same ID [${org.id}]`
          + ' exist in the orgs array.', 'warn');
      }
      else {
        duplicateCheck[org.id] = org.id;
      }
      arrIDs.push(org.id);
      index++;
    });

    // Create searchQuery
    const searchQuery = { _id: { $in: arrIDs } };

    // Find the orgs to replace
    foundOrgs = await Organization.find(searchQuery, null);

    // Check if there are new orgs
    // Note: if more orgs than found, there must be new orgs
    if (orgsToLookup.length > foundOrgs.length) {
      // Ensure user can create new orgs
      permissions.createOrg(reqUser);
    }

    // Ensure the user can update each org
    foundOrgs.forEach((org) => {
      permissions.updateOrg(reqUser, org);
    });

    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Write contents to temporary file
    await new Promise(async function(res) {
      await fs.writeFile(path.join(M.root, 'data', `PUT-backup-orgs-${ts}.json`),
        JSON.stringify(foundOrgs), function(err) {
          if (err) throw errors.captureError(err);
          else res();
        });
    });

    // Delete orgs from database
    await Organization.deleteMany({ _id: { $in: foundOrgs.map(o => o._id) } });

    // Emit the event orgs-deleted
    EventEmitter.emit('orgs-deleted', foundOrgs);

    // Code block after original orgs have been deleted but before they have been replaced
    // If creation of new orgs fails, it will restore the previous orgs
    try {
      // Create the new orgs
      createdOrgs = await create(reqUser, orgsToLookup, options);
    }
    catch (error) {
      throw await new Promise(async (res) => {
        // Reinsert original data
        try {
          await Organization.insertMany(foundOrgs);
          fs.unlinkSync(path.join(M.root, 'data',
            `PUT-backup-orgs-${ts}.json`));

          // Restoration succeeded; pass the original error
          res(error);
        }
        catch (restoreErr) {
          // Pass the new error that occurred while trying to restore orgs
          res(restoreErr);
        }
      });
    }

    // Delete the temporary file.
    const filePath = path.join(M.root, 'data', `PUT-backup-orgs-${ts}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return createdOrgs;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function removes one or many organizations as well as the
 * projects, branches, and elements that belong to them. This function can be used by
 * system-wide admins ONLY. NOTE: Cannot delete the default org.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} orgs - The organizations to remove. Can either be
 * an array of org ids or a single org id.
 * @param {object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @returns {Promise<string[]>} Array of deleted organization ids.
 *
 * @example
 * remove({User}, ['org1', 'org2'])
 * .then(function(orgs) {
 *   // Do something with the deleted orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function remove(requestingUser, orgs, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType(['object', 'string'], orgs, 'Orgs');

    // Sanitize input parameters and function-wide variables
    const saniOrgs = sani.db(JSON.parse(JSON.stringify(orgs)));
    let searchedIDs = [];

    // Define searchQuery and ownedQuery
    const searchQuery = {};

    // Check the type of the orgs parameter
    if (Array.isArray(saniOrgs)) {
      // An array of org ids, remove all
      searchedIDs = saniOrgs;
      searchQuery._id = { $in: searchedIDs };
    }
    else if (typeof saniOrgs === 'string') {
      // A single org id
      searchedIDs = [saniOrgs];
      searchQuery._id = { $in: searchedIDs };
    }
    else {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for removing organizations.', 'warn');
    }

    // Find the orgs to delete
    const foundOrgs = await Organization.find(searchQuery, null);

    // Check that user can remove each org
    foundOrgs.forEach(org => {
      // Ensure user has permissions to delete each org
      permissions.deleteOrg(requestingUser, org);

      // If trying to delete the default org, throw an error
      if (org._id === M.config.server.defaultOrganizationId) {
        throw new M.OperationError('The default organization cannot be deleted.', 'warn');
      }
    });

    const foundOrgIDs = foundOrgs.map(o => o._id);

    // Check if all orgs were found
    const notFoundIDs = searchedIDs.filter(o => !foundOrgIDs.includes(o));
    // Some orgs not found, throw an error
    if (notFoundIDs.length > 0) {
      throw new M.NotFoundError('The following orgs were not found: '
        + `[${notFoundIDs}].`, 'warn');
    }

    // Find all projects to delete
    const projectsToDelete = await Project.find({ org: { $in: searchedIDs } }, null);

    const projectIDs = projectsToDelete.map(p => p._id);

    // Delete any elements in the found projects
    await Element.deleteMany({ project: { $in: projectIDs } });

    // Delete any artifacts in the found projects
    await Artifact.deleteMany({ project: { $in: projectIDs } });

    // Remove all blobs under org
    foundOrgIDs.forEach((orgID) => {
      ArtifactStrategy.clear({
        orgID: orgID
      });
    });

    // Delete any branches in the found projects
    await Branch.deleteMany({ project: { $in: projectIDs } });

    // Delete any projects in the org
    await Project.deleteMany({ org: { $in: searchedIDs } });
    // Delete the orgs
    const retQuery = await Organization.deleteMany(searchQuery);
    // Emit the event orgs-deleted
    EventEmitter.emit('orgs-deleted', foundOrgs);

    // Verify that all of the orgs were correctly deleted
    if (retQuery.n !== foundOrgs.length) {
      M.log.error(`Some of the following orgs were not deleted [${saniOrgs.toString()}].`);
    }

    return foundOrgIDs;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}
