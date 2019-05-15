/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.organization-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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

// Node.js Modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// MBEE Modules
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');
const jmi = M.require('lib.jmi-conversions');

/**
 * @description This function finds one or many organizations. Depending on the
 * given parameters, this function can find a single org by ID, multiple orgs by
 * ID, or all orgs in the system. Only organizations which a user has read
 * access to will be returned.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} [orgs] - The organizations to find. Can either be
 * an array of org ids, a single org id, or not provided, which defaults to
 * every org being found.
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
 *
 * @return {Promise} Array of found organization objects
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
function find(requestingUser, orgs, options) {
  return new Promise((resolve, reject) => {
    // Set options if no orgs were provided, but options were
    if (typeof orgs === 'object' && orgs !== null && !Array.isArray(orgs)) {
      options = orgs; // eslint-disable-line no-param-reassign
      orgs = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');

      const orgTypes = ['undefined', 'object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(orgTypes.includes(typeof orgs), 'Orgs parameter is an invalid type.');
      // If orgs is an object, ensure it's an array of strings
      if (typeof orgs === 'object') {
        assert.ok(Array.isArray(orgs), 'Orgs is an object, but not an array.');
        assert.ok(orgs.every(o => typeof o === 'string'), 'Orgs is not an array of strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniOrgs = (orgs !== undefined)
      ? sani.mongo(JSON.parse(JSON.stringify(orgs)))
      : undefined;

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'archived',
      'fields', 'limit', 'skip', 'lean'], Organization);

    // Define searchQuery
    const searchQuery = { archived: false };
    // If not system admin, add permissions check
    if (!reqUser.admin) {
      searchQuery[`permissions.${reqUser._id}`] = 'read';
    }
    // If the archived field is true, remove it from the query
    if (validOptions.archived) {
      delete searchQuery.archived;
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
      throw new M.CustomError('Invalid input for finding organizations.', 400, 'warn');
    }

    // If the lean option is supplied
    if (validOptions.lean) {
      // Find the orgs
      Organization.find(searchQuery, validOptions.fieldsString,
        { limit: validOptions.limit, skip: validOptions.skip })
      .populate(validOptions.populateString).lean()
      .then((foundOrgs) => resolve(foundOrgs))
      .catch((error) => reject(M.CustomError.parseCustomError(error)));
    }
    else {
      Organization.find(searchQuery, validOptions.fieldsString,
        { limit: validOptions.limit, skip: validOptions.skip })
      .populate(validOptions.populateString)
      .then((foundOrgs) => resolve(foundOrgs))
      .catch((error) => reject(M.CustomError.parseCustomError(error)));
    }
  });
}

/**
 * @description This functions creates one or many orgs from the provided data.
 * This function is restricted to system-wide admins ONLY. This function checks
 * for any existing orgs with duplicate IDs before creating and returning the
 * given orgs.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(Object|Object[])} orgs - Either an array of objects containing org
 * data or a single object containing org data to create.
 * @param {string} orgs.id - The ID of the org being created.
 * @param {string} orgs.name - The organization name.
 * @param {Object} [orgs.custom] - Any additional key/value pairs for an object.
 * Must be proper JSON form.
 * @param {Object} [orgs.permissions] - Any preset permissions on the org. Keys
 * should be usernames and values should be the highest permissions the user
 * has. NOTE: The requesting user gets added as an admin by default.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created organization objects
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
function create(requestingUser, orgs, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions to create orgs.');
      assert.ok(typeof orgs === 'object', 'Orgs parameter is not an object.');
      assert.ok(orgs !== null, 'Orgs parameter cannot be null.');
      // If orgs is an array, ensure each item inside is an object
      if (Array.isArray(orgs)) {
        assert.ok(orgs.every(o => typeof o === 'object'), 'Every item in orgs is not an'
          + ' object.');
        assert.ok(orgs.every(o => o !== null), 'One or more items in orgs is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniOrgs = sani.mongo(JSON.parse(JSON.stringify(orgs)));
    let orgObjects = [];

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Organization);

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
      throw new M.CustomError('Invalid input for creating organizations.', 400, 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrIDs = [];
    const validOrgKeys = ['id', 'name', 'custom', 'permissions', 'archived'];

    // Check that each org has an id, and add to arrIDs
    try {
      let index = 1;
      orgsToCreate.forEach((org) => {
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
    }
    catch (err) {
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Create searchQuery to search for any existing, conflicting orgs
    const searchQuery = { _id: { $in: arrIDs } };

    // Find any existing, conflicting orgs
    Organization.find(searchQuery, '_id').lean()
    .then((foundOrgs) => {
      // If there are any foundOrgs, there is a conflict
      if (foundOrgs.length > 0) {
        // Get arrays of the foundOrg's ids and names
        const foundOrgIDs = foundOrgs.map(o => o._id);

        // There are one or more orgs with conflicting IDs
        throw new M.CustomError('Orgs with the following IDs already exist'
          + ` [${foundOrgIDs.toString()}].`, 403, 'warn');
      }

      // Get all existing users for permissions
      return User.find({}).lean();
    })
    .then((foundUsers) => {
      // Create array of usernames
      const foundUsernames = foundUsers.map(u => u._id);
      // For each object of org data, create the org object
      orgObjects = orgsToCreate.map((o) => {
        const orgObj = new Organization(o);
        // Set permissions
        Object.keys(orgObj.permissions).forEach((u) => {
          // If user does not exist, throw an error
          if (!foundUsernames.includes(u)) {
            throw new M.CustomError(`User [${u}] not found.`, 404, 'warn');
          }

          const permission = orgObj.permissions[u];

          // Change permission level to array of permissions
          switch (permission) {
            case 'read':
              orgObj.permissions[u] = ['read'];
              break;
            case 'write':
              orgObj.permissions[u] = ['read', 'write'];
              break;
            case 'admin':
              orgObj.permissions[u] = ['read', 'write', 'admin'];
              break;
            default:
              throw new M.CustomError(`Invalid permission [${permission}].`, 400, 'warn');
          }
        });
        orgObj.lastModifiedBy = reqUser._id;
        orgObj.createdBy = reqUser._id;
        orgObj.updatedOn = Date.now();
        orgObj.archivedBy = (orgObj.archived) ? reqUser._id : null;
        return orgObj;
      });

      // Create the organizations
      return Organization.insertMany(orgObjects);
    })
    .then(() => {
      // Emit the event orgs-created
      EventEmitter.emit('orgs-created', orgObjects);

      // If the lean option is supplied
      if (validOptions.lean) {
        return Organization.find({ _id: { $in: arrIDs } }, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return Organization.find({ _id: { $in: arrIDs } }, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundUpdatedOrgs) => resolve(foundUpdatedOrgs))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
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
 * @param {(Object|Object[])} orgs - Either an array of objects containing
 * updates to organizations, or a single object containing updates.
 * @param {string} orgs.id - The ID of the org being updated. Field cannot be
 * updated but is required to find org.
 * @param {string} [orgs.name] - The updated name of the organization.
 * @param {Object} [orgs.permissions] - An object of key value pairs, where the
 * key is the username, and the value is the role which the user is to have in
 * the org. To remove a user from an org, the value must be 'remove_all'.
 * @param {Object} [orgs.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [orgs.archived = false] - The updated archived field. If true, the
 * org will not be able to be found until unarchived.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of updated organization objects
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
function update(requestingUser, orgs, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof orgs === 'object', 'Orgs parameter is not an object.');
      assert.ok(orgs !== null, 'Orgs parameter cannot be null.');
      // If orgs is an array, ensure each item inside is an object
      if (Array.isArray(orgs)) {
        assert.ok(orgs.every(o => typeof o === 'object'), 'Every item in orgs is not an'
          + ' object.');
        assert.ok(orgs.every(o => o !== null), 'One or more items in orgs is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and function-wide variables
    const saniOrgs = sani.mongo(JSON.parse(JSON.stringify(orgs)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const duplicateCheck = {};
    let foundOrgs = [];
    let orgsToUpdate = [];
    let existingUsers = [];
    let updatingPermissions = false;

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Organization);

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
      throw new M.CustomError('Invalid input for updating organizations.', 400, 'warn');
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
          throw new M.CustomError(`Multiple objects with the same ID [${org.id}] exist in the`
            + ' update.', 400, 'warn');
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
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Create searchQuery
    const searchQuery = { _id: { $in: arrIDs } };

    // Find the orgs to update
    Organization.find(searchQuery).populate('projects').lean()
    .then((_foundOrgs) => {
      // Set function-wide foundOrgs
      foundOrgs = _foundOrgs;

      // Check that the user has admin permissions
      foundOrgs.forEach((org) => {
        if (!reqUser.admin && (!org.permissions[reqUser._id]
          || !org.permissions[reqUser._id].includes('admin'))) {
          throw new M.CustomError('User does not have permission to update'
            + ` the org [${org._id}].`, 403, 'warn');
        }
      });

      // Verify the same number of orgs are found as desired
      if (foundOrgs.length !== arrIDs.length) {
        const foundIDs = foundOrgs.map(o => o._id);
        const notFound = arrIDs.filter(o => !foundIDs.includes(o));
        throw new M.CustomError(
          `The following orgs were not found: [${notFound.toString()}].`, 404, 'warn'
        );
      }

      // Find users if updating permissions
      if (updatingPermissions) {
        return User.find({}).find();
      }

      // Return an empty array if not updating permissions
      return [];
    })
    .then((foundUsers) => {
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
          throw new M.CustomError('Cannot update the default org.', 403, 'warn');
        }

        // Error Check: if org is currently archived, it must first be unarchived
        if (org.archived && updateOrg.archived !== false) {
          throw new M.CustomError(`Organization [${org._id}] is archived. `
              + 'Archived objects cannot be modified.', 403, 'warn');
        }

        // For each key in the updated object
        Object.keys(updateOrg).forEach((key) => {
          // Check if the field is valid to update
          if (!validFields.includes(key)) {
            throw new M.CustomError(`Organization property [${key}] cannot `
                + 'be changed.', 400, 'warn');
          }

          // Get validator for field if one exists
          if (validators.org.hasOwnProperty(key)) {
            // If validation fails, throw error
            if (!RegExp(validators.org[key]).test(updateOrg[key])) {
              throw new M.CustomError(
                `Invalid ${key}: [${updateOrg[key]}]`, 403, 'warn'
              );
            }
          }

          // If the type of field is mixed
          if (Organization.schema.obj[key]
            && Organization.schema.obj[key].type.schemaName === 'Mixed') {
            // Only objects should be passed into mixed data
            if (typeof updateOrg !== 'object') {
              throw new M.CustomError(`${key} must be an object`, 400, 'warn');
            }

            // If the user is updating permissions
            if (key === 'permissions') {
              // Loop through each user provided
              Object.keys(updateOrg[key]).forEach((user) => {
                let permValue = updateOrg[key][user];
                // Ensure user is not updating own permissions
                if (user === reqUser.username) {
                  throw new M.CustomError('User cannot update own permissions.', 403, 'warn');
                }

                // If user does not exist, throw an error
                if (!existingUsers.includes(user)) {
                  throw new M.CustomError(`User [${user}] not found.`, 404, 'warn');
                }

                // Value must be an string containing highest permissions
                if (typeof permValue !== 'string') {
                  throw new M.CustomError(`Permission for ${user} must be a string.`, 400, 'warn');
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
                        throw new M.CustomError('User must be removed from '
                          + `the project [${utils.parseID(p._id).pop()}] prior`
                          + ` to being removed from the org [${org._id}].`, 403, 'warn');
                      }
                    });
                    delete org.permissions[user];
                    break;
                  // Default case, invalid permission
                  default:
                    throw new M.CustomError(
                      `${permValue} is not a valid permission`, 400, 'warn'
                    );
                }
              });

              // Copy permissions from org to update object
              updateOrg.permissions = org.permissions;
            }
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
      return Organization.bulkWrite(bulkArray);
    })
    .then(() => {
      // If the lean option is supplied
      if (validOptions.lean) {
        return Organization.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return Organization.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundUpdatedOrgs) => {
      // Emit the event orgs-updated
      EventEmitter.emit('orgs-updated', foundUpdatedOrgs);

      return resolve(foundUpdatedOrgs);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function creates one or many orgs. If orgs with matching
 * ids already exist, this function updates those orgs. This function is
 * restricted to system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(Object|Object[])} orgs - Either an array of objects containing
 * updates/new data for organizations, or a single object containing updates.
 * @param {string} orgs.id - The ID of the org being updated/created. Field
 * cannot be updated but is required to find/created org.
 * @param {string} [orgs.name] - The updated/new name of the organization.
 * @param {Object} [orgs.permissions] - An object of key value pairs, where the
 * key is the username, and the value is the role which the user is to have in
 * the org.
 * @param {Object} [orgs.custom] - The additions or changes to existing custom
 * data. If the key/value pair already exists, the value will be changed. If the
 * key/value pair does not exist, it will be added.
 * @param {boolean} [orgs.archived = false] - The archived field. If true, the org will
 * not be able to be found until unarchived.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and id fields. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of replaced/created organization objects
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
function createOrReplace(requestingUser, orgs, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions'
        + 'to create or replace orgs.');
      assert.ok(typeof orgs === 'object', 'Orgs parameter is not an object.');
      assert.ok(orgs !== null, 'Orgs parameter cannot be null.');
      // If orgs is an array, ensure each item inside is an object
      if (Array.isArray(orgs)) {
        assert.ok(orgs.every(o => typeof o === 'object'), 'Every item in orgs is not an'
          + ' object.');
        assert.ok(orgs.every(o => o !== null), 'One or more items in orgs is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and function-wide variables
    const saniOrgs = sani.mongo(JSON.parse(JSON.stringify(orgs)));
    const duplicateCheck = {};
    let foundOrgs = [];
    let orgsToLookup = [];
    let createdOrgs = [];
    const timestamp = Date.now();

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
      throw new M.CustomError('Invalid input for creating/replacing '
        + 'organizations.', 400, 'warn');
    }

    // Create list of ids
    const arrIDs = [];
    try {
      let index = 1;
      orgsToLookup.forEach((org) => {
        // Ensure each org has an id and that its a string
        assert.ok(org.hasOwnProperty('id'), `Org #${index} does not have an id.`);
        assert.ok(typeof org.id === 'string', `Org #${index}'s id is not a string.`);
        // If a duplicate ID, throw an error
        if (duplicateCheck[org.id]) {
          throw new M.CustomError(`Multiple objects with the same ID [${org.id}]`
            + ' exist in the orgs array.', 400, 'warn');
        }
        else {
          duplicateCheck[org.id] = org.id;
        }
        arrIDs.push(org.id);
        index++;
      });
    }
    catch (err) {
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Create searchQuery
    const searchQuery = { _id: { $in: arrIDs } };

    // Find the orgs to replace
    Organization.find(searchQuery).lean()
    .then((_foundOrgs) => {
      foundOrgs = _foundOrgs;

      // If data directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data'))) {
        fs.mkdirSync(path.join(M.root, 'data'));
      }

      // Write contents to temporary file
      return new Promise(function(res, rej) {
        fs.writeFile(path.join(M.root, 'data', `PUT-backup-orgs-${timestamp}.json`),
          JSON.stringify(_foundOrgs), function(err) {
            if (err) rej(err);
            else res();
          });
      });
    })
    // Delete orgs from database
    .then(() => Organization.deleteMany({ _id: foundOrgs.map(o => o._id) }).lean())
    .then(() => {
      // Emit the event orgs-deleted
      EventEmitter.emit('orgs-deleted', foundOrgs);

      // Create the new orgs
      return create(requestingUser, orgsToLookup, options);
    })
    .then((_createdOrgs) => {
      createdOrgs = _createdOrgs;

      // Delete the temporary file.
      if (fs.existsSync(path.join(M.root, 'data', `PUT-backup-orgs-${timestamp}.json`))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', `PUT-backup-orgs-${timestamp}.json`), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve(createdOrgs))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function removes one or many organizations as well as the
 * projects and elements that belong to them. This function can be used by
 * system-wide admins ONLY. NOTE: Cannot delete the default org.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} orgs - The organizations to remove. Can either be
 * an array of org ids or a single org id.
 * @param {Object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @return {Promise} Array of deleted organization ids.
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
function remove(requestingUser, orgs, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions to delete orgs.');
      const orgTypes = ['object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(orgTypes.includes(typeof orgs), 'Orgs parameter is an invalid type.');
      // If orgs is an object, ensure it's an array of strings
      if (typeof orgs === 'object') {
        assert.ok(Array.isArray(orgs), 'Orgs is an object, but not an array.');
        assert.ok(orgs.every(o => typeof o === 'string'), 'Orgs is not an array of strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and function-wide variables
    const saniOrgs = sani.mongo(JSON.parse(JSON.stringify(orgs)));
    let foundOrgs = [];
    let searchedIDs = [];

    // Define searchQuery and ownedQuery
    const searchQuery = {};
    const ownedQuery = {};

    // Check the type of the orgs parameter
    if (Array.isArray(saniOrgs)) {
      // An array of org ids, remove all
      searchedIDs = saniOrgs;
      searchQuery._id = { $in: saniOrgs };
    }
    else if (typeof saniOrgs === 'string') {
      // A single org id
      searchedIDs = [saniOrgs];
      searchQuery._id = saniOrgs;
    }
    else {
      // Invalid parameter, throw an error
      throw new M.CustomError('Invalid input for removing organizations.', 400, 'warn');
    }

    // Find the orgs to delete
    Organization.find(searchQuery).lean()
    .then((_foundOrgs) => {
      // Set function-wde foundOrgs and create ownedQuery
      foundOrgs = _foundOrgs;
      const foundOrgIDs = foundOrgs.map(o => o._id);
      const regexIDs = _foundOrgs.map(o => RegExp(`^${o._id}${utils.ID_DELIMITER}`));
      ownedQuery._id = { $in: regexIDs };

      // Check if all orgs were found
      const notFoundIDs = searchedIDs.filter(o => !foundOrgIDs.includes(o));
      // Some orgs not found, throw an error
      if (notFoundIDs.length > 0) {
        throw new M.CustomError('The following orgs were not found: '
          + `[${notFoundIDs}].`, 404, 'warn');
      }

      // Check that user can remove each org
      foundOrgs.forEach((org) => {
        // If trying to delete the default org, throw an error
        if (org._id === M.config.server.defaultOrganizationId) {
          throw new M.CustomError('The default organization cannot be deleted.', 403, 'warn');
        }
      });

      // Delete any elements in the org
      return Element.deleteMany(ownedQuery).lean();
    })
    // Delete any projects in the org
    .then(() => Project.deleteMany({ org: { $in: saniOrgs } }).lean())
    // Delete the orgs
    .then(() => Organization.deleteMany(searchQuery).lean())
    .then((retQuery) => {
      // Emit the event orgs-deleted
      EventEmitter.emit('orgs-deleted', foundOrgs);

      // Verify that all of the orgs were correctly deleted
      if (retQuery.n !== foundOrgs.length) {
        M.log.error(`Some of the following orgs were not deleted [${saniOrgs.toString()}].`);
      }
      return resolve(foundOrgs.map(o => o._id));
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}
