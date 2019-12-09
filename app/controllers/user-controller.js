/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.user-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Austin Bieber
 * @author Connor Doyle
 * @author Phillip Lee
 *
 * @description Provides an abstraction layer on top of the User model that
 * implements controller logic and behavior for Users.
 */

// Expose user controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  createOrReplace,
  remove,
  updatePassword,
  search
};

// Node modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// MBEE modules
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const validators = M.require('lib.validators');
const jmi = M.require('lib.jmi-conversions');
const utils = M.require('lib.utils');
const errors = M.require('lib.errors');
const helper = M.require('lib.controller-utils');
const permissions = M.require('lib.permissions');

/**
 * @description This function finds one or many users. Depending on the given
 * parameters, this function can find a single user by username, multiple users
 * by username, or all users in the system.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} [users] - The users to find. Can either be an
 * array of user ids, a single user id, or not provided, which defaults to every
 * user being found.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {boolean} [options.includeArchived = false] - If true, find results will include
 * archived objects.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 * @param {number} [options.limit = 0] - A number that specifies the maximum
 * number of documents to be returned to the user. A limit of 0 is equivalent to
 * setting no limit.
 * @param {number} [options.skip = 0] - A non-negative number that specifies the
 * number of documents to skip returning. For example, if 10 documents are found
 * and skip is 5, the first 5 documents will NOT be returned.
 * @param {string} [options.fname] - A string that will search for matches with
 * the user fname field, or first name.
 * @param {string} [options.lname] - A string that will search for matches with
 * the user lname field, or last name.
 * @param {string} [options.preferredName] - A string that will search for matches
 * with the user preferredName field.
 * @param {string} [options.email] - A string that will search for matches with
 * the user email field.
 * @param {string} [options.createdBy] - A string that will search for matches for
 * users that were created by a specific person.
 * @param {string} [options.lastModifiedBy] - A string that will search for matches for
 * users that were last modified by a specific person.
 * @param {string} [options.archived] - Search only for archived users.  If false,
 * only returns unarchived users.  Overrides the includeArchived option.
 * @param {string} [options.archivedBy] - A string that will search for matches for
 * users that were archived by a specific person.
 * @param {string} [options.sort] - Provide a particular field to sort the results by.
 * You may also add a negative sign in front of the field to indicate sorting in
 * reverse order.
 *
 * @returns {Promise<object[]>} Array of found users.
 *
 * @example
 * find({User}, ['user1', 'user2'], { populate: 'createdBy' })
 * .then(function(users) {
 *   // Do something with the found users
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function find(requestingUser, users, options) {
  try {
    // Set options if no users were provided, but options were
    if (typeof users === 'object' && users !== null && !Array.isArray(users)) {
      options = users; // eslint-disable-line no-param-reassign
      users = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType(['undefined', 'object', 'string'], users, 'Users');

    // Sanitize input parameters
    const saniUsers = (users !== undefined)
      ? sani.db(JSON.parse(JSON.stringify(users)))
      : undefined;

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate',
      'includeArchived', 'fields', 'limit', 'skip', 'sort'], User);

    // Define searchQuery
    const searchQuery = { archived: false };
    // If the includeArchived field is true, remove archived from the query; return everything
    if (validatedOptions.includeArchived) {
      delete searchQuery.archived;
    }
    // If the archived field is true, query only for archived elements
    if (validatedOptions.archived) {
      searchQuery.archived = true;
    }

    // Ensure search options are valid
    if (options) {
      // List of valid search options
      const validSearchOptions = ['fname', 'preferredName', 'lname', 'email', 'createdBy',
        'lastModifiedBy', 'archived', 'archivedBy'];

      // Check each option for valid search queries
      Object.keys(options).forEach((o) => {
        // If the search option is valid
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

    // Check the type of the users parameter
    if (Array.isArray(saniUsers)) {
      // An array of usernames, find all
      searchQuery._id = { $in: saniUsers };
    }
    else if (typeof saniUsers === 'string') {
      // A single username
      searchQuery._id = saniUsers;
    }
    else if (!((typeof saniUsers === 'object' && saniUsers !== null) || saniUsers === undefined)) {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for finding users.', 'warn');
    }

    // Find and return the users
    return await User.find(searchQuery, validatedOptions.fieldsString,
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
 * @description This functions creates one or many users from the provided data.
 * This function is restricted to system-wide admin ONLY. The database is
 * searched for existing users with duplicate usernames and the users are added
 * to the default org prior to being returned from this function.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} users - Either an array of objects containing user
 * data or a single object containing user data to create.
 * @param {string} users.username - The username of the user being created.
 * @param {string} [users.password] - The password of the user being created.
 * Depending on the authentication module, the password may be required.
 * @param {string} [users.fname] - The first name of the user.
 * @param {string} [users.lname] - The last name of the user.
 * @param {string} [users.preferredName] - The preferred first name of the user.
 * @param {string} [users.email] - The email of the user.
 * @param {boolean} [users.admin = false] - A boolean denoting whether or not
 * the user will be a system admin.
 * @param {string} [users.provider = 'local'] - The provider which the user is
 * retrieved from.
 * @param {object} [users.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 *
 * @returns {Promise<object[]>} Array of created user objects.
 *
 * @example
 * create({User}, [{User1}, {User2}, ...], { populate: 'createdBy' })
 * .then(function(users) {
 *   // Do something with the newly created users
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function create(requestingUser, users, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', users, 'Users');

    // Ensure user has permission to create other users
    permissions.createUser(requestingUser);

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniUsers = sani.db(JSON.parse(JSON.stringify(users)));

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields'], User);

    // Define array to store user data
    let usersToCreate = [];

    // Check the type of the users parameter
    if (Array.isArray(saniUsers)) {
      // users is an array, create many users
      usersToCreate = saniUsers;
    }
    else if (typeof saniUsers === 'object') {
      // users is an object, create a single user
      usersToCreate = [saniUsers];
    }
    else {
      // users is not an object or array, throw an error
      throw new M.DataFormatError('Invalid input for creating users.', 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrUsernames = [];
    const validUserKeys = ['username', 'password', 'fname', 'lname',
      'preferredName', 'email', 'admin', 'provider', 'custom', 'archived'];

    // Check that each user has a username, and add to arrUsernames
    let index = 1;
    usersToCreate.forEach((user) => {
      try {
        // Ensure keys are valid
        Object.keys(user).forEach((k) => {
          assert.ok(validUserKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each user has a username and that it's a string
        assert.ok(user.hasOwnProperty('username'), `User #${index} does not have a username`);
        assert.ok(typeof user.username === 'string', `User #${index}'s username is not a string.`);
        // Check if user with same username is already being created
        assert.ok(!arrUsernames.includes(user.username), 'Multiple users with '
          + `the same username [${user.username}] cannot be created.`);
      }
      catch (error) {
        throw new M.DataFormatError(error.message, 'warn');
      }
      arrUsernames.push(user.username);
      user._id = user.username;
      index++;
    });

    // Create searchQuery to search for any existing, conflicting users
    const searchQuery = { _id: { $in: arrUsernames } };

    // Find any existing, conflicting users
    const foundUsers = await User.find(searchQuery, '_id');
    // If there are any foundUsers, there is a conflict
    if (foundUsers.length > 0) {
      // Get arrays of the foundUsers's usernames
      const foundUserUsernames = foundUsers.map(u => u._id);

      // There are one or more users with conflicting usernames
      throw new M.OperationError('Users with the following usernames already exist'
        + ` [${foundUserUsernames.toString()}].`, 'warn');
    }

    // For each object of user data, create the user object
    const userObjects = usersToCreate.map((u) => {
      u.lastModifiedBy = reqUser._id;
      u.createdBy = reqUser._id;
      u.updatedOn = Date.now();
      u.archivedBy = (u.archived) ? reqUser._id : null;
      u.archivedOn = (u.archived) ? Date.now() : null;
      User.hashPassword(u);
      return u;
    });

    // Create the users
    const createdUsers = await User.insertMany(userObjects);

    // Emit the event users-created
    EventEmitter.emit('users-created', createdUsers);

    // Find the default organization
    const defaultOrgQuery = { _id: M.config.server.defaultOrganizationId };
    const defaultOrg = await Organization.findOne(defaultOrgQuery);
    // Add each created user to the default org with read/write
    createdUsers.forEach((user) => {
      defaultOrg.permissions[user._id] = ['read', 'write'];
    });

    // Save the updated default org
    await Organization.updateOne(defaultOrgQuery, { permissions: defaultOrg.permissions });

    // Find and return the created users
    return await User.find({ _id: { $in: arrUsernames } }, validatedOptions.fieldsString,
      { populate: validatedOptions.populateString });
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function updates one or many users. Multiple fields in
 * multiple users can be updated at once, provided that the fields are allowed
 * to be updated. If updating the custom data on a user, and key/value pairs
 * exist in the update object that don't exist in the current custom data,
 * the key/value pair will be added. If the key/value pairs do exist, the value
 * will be changed. If a user is archived, they must first be unarchived before
 * any other updates occur. NOTE: A user cannot archive or un-archive
 * themselves. This function is restricted to system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} users - Either an array of objects containing
 * updates to users, or a single object containing updates.
 * @param {string} users.id - The ID of the user being updated. Field cannot be
 * updated but is required to find user.
 * @param {string} [users.fname] - The updated first name of the user.
 * @param {string} [users.lname] - The updated last name of the user.
 * @param {string} [users.preferredName] - The updated preferred first name of
 * the user.
 * @param {string} [users.email] - The updated email of the user.
 * @param {object} [users.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [users.archived = false] - The updated archived field. If true, the
 * user will not be able to be found until unarchived.
 * @param {boolean} [users.admin] - The updated admin field. If true, the
 * user is a system-wide admin. NOTE: Only system-wide admins can update this
 * property.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 *
 * @returns {Promise<object[]>} Array of updated user objects.
 *
 * @example
 * update({User}, [{Updated User 1}, {Updated User 2}...], { populate: 'createdBy' })
 * .then(function(users) {
 *   // Do something with the newly updated users
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function update(requestingUser, users, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', users, 'Users');

    // Sanitize input parameters and create function-wide variables
    const saniUsers = sani.db(JSON.parse(JSON.stringify(users)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let usersToUpdate = [];
    const duplicateCheck = {};

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields'], User);

    // Check the type of the users parameter
    if (Array.isArray(saniUsers)) {
      // users is an array, update many users
      usersToUpdate = saniUsers;
    }
    else if (typeof saniUsers === 'object') {
      // users is an object, update a single user
      usersToUpdate = [saniUsers];
    }
    else {
      throw new M.DataFormatError('Invalid input for updating users.', 'warn');
    }

    // Create list of usernames
    const arrUsernames = [];

    let index = 1;
    usersToUpdate.forEach((user) => {
      try {
        // Ensure each user has a username and that its a string
        assert.ok(user.hasOwnProperty('username'), `User #${index} does not have a username.`);
        assert.ok(typeof user.username === 'string', `User #${index}'s username is not a string.`);
      }
      catch (error) {
        throw new M.DataFormatError(error.message, 'warn');
      }
      // If a duplicate ID, throw an error
      if (duplicateCheck[user.username]) {
        throw new M.DataFormatError(`Multiple objects with the same ID [${user.username}] exist in`
          + ' the update.', 'warn');
      }
      else {
        duplicateCheck[user.username] = user.username;
      }
      arrUsernames.push(user.username);
      user._id = user.username;
      index++;
    });

    // Ensure user cannot update others, unless sys-admin
    permissions.updateUser(reqUser, arrUsernames[0]);

    // Create searchQuery
    const searchQuery = { _id: { $in: arrUsernames } };

    // Find the users to update
    const foundUsers = await User.find(searchQuery, null);
    // Verify the same number of users are found as desired
    if (foundUsers.length !== arrUsernames.length) {
      const foundIDs = foundUsers.map(u => u._id);
      const notFound = arrUsernames.filter(u => !foundIDs.includes(u));
      throw new M.NotFoundError(
        `The following users were not found: [${notFound.toString()}].`, 'warn'
      );
    }

    // Convert usersToUpdate to JMI type 2
    const jmiType2 = jmi.convertJMI(1, 2, usersToUpdate);
    const bulkArray = [];
    // Get array of editable parameters
    const validFields = User.getValidUpdateFields();

    // For each found user
    foundUsers.forEach((user) => {
      const updateUser = jmiType2[user._id];
      // Remove username and _id field from update object
      delete updateUser.username;
      delete updateUser._id;

      // Error Check: if user currently archived, they must first be unarchived
      if (user.archived && (updateUser.archived === undefined
        || JSON.parse(updateUser.archived) !== false)) {
        throw new M.OperationError(`User [${user._id}] is archived. `
          + 'Archived objects cannot be modified.', 'warn');
      }

      // For each key in the updated object
      Object.keys(updateUser).forEach((key) => {
        // Check if the field is valid to update
        if (!validFields.includes(key)) {
          throw new M.OperationError(`User property [${key}] cannot `
            + 'be changed.', 'warn');
        }

        // Get validator for field if one exists
        if (validators.user.hasOwnProperty(key)) {
          // If the validator is a regex string
          if (typeof validators.user[key] === 'string') {
            // If validation fails, throw error
            if (!RegExp(validators.user[key]).test(updateUser[key])) {
              throw new M.DataFormatError(
                `Invalid ${key}: [${updateUser[key]}]`, 'warn'
              );
            }
          }
          // If the validator is a function
          else if (typeof validators.user[key] === 'function') {
            if (!validators.user[key](updateUser[key])) {
              throw new M.DataFormatError(
                `Invalid ${key}: [${updateUser[key]}]`, 'warn'
              );
            }
          }
          // Improperly formatted validator
          else {
            throw new M.ServerError(`User validator [${key}] is neither a `
              + 'function nor a regex string.');
          }
        }

        // If updating the admin key, ensure the requesting user is an admin
        if (key === 'admin' && !reqUser.admin) {
          throw new M.PermissionError(`${reqUser._id} does not have`
            + ' permissions to update the admin field.', 'warn');
        }

        // Set archivedBy if archived field is being changed
        if (key === 'archived') {
          // User cannot archive or un-archive themselves
          if ((user._id === reqUser._id) && (updateUser[key] !== user.archived)) {
            throw new M.OperationError('User cannot archive or unarchive themselves', 'warn');
          }

          // If the user is being archived
          if (updateUser[key] && !user[key]) {
            updateUser.archivedBy = reqUser._id;
            updateUser.archivedOn = Date.now();
          }
          // If the user is being unarchived
          else if (!updateUser[key] && user[key]) {
            updateUser.archivedBy = null;
            updateUser.archivedOn = null;
          }
        }
      });

      // Update lastModifiedBy field and updatedOn
      updateUser.lastModifiedBy = reqUser._id;
      updateUser.updatedOn = Date.now();

      // Update the user
      bulkArray.push({
        updateOne: {
          filter: { _id: user._id },
          update: updateUser
        }
      });
    });

    // Update all users through a bulk write to the database
    await User.bulkWrite(bulkArray);

    const foundUpdatedUsers = await User.find(searchQuery, validatedOptions.fieldsString,
      { populate: validatedOptions.populateString });

    // Emit the event users-updated
    EventEmitter.emit('users-updated', foundUpdatedUsers);

    return foundUpdatedUsers;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function creates or replaces one or many users. If users
 * with matching usernames already exist, this function updates those users.
 * This function is restricted to system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} users - Either an array of objects containing
 * updates to users, or a single object containing updates.
 * @param {string} users.id - The ID of the user being updated. Field cannot be
 * updated but is required to find user.
 * @param {string} [users.fname] - The updated first name of the user.
 * @param {string} [users.lname] - The updated last name of the user.
 * @param {string} [users.preferredName] - The updated preferred first name of
 * the user.
 * @param {string} [users.email] - The updated email of the user.
 * @param {object} [users.custom] - The additions or changes to existing custom
 * data. If the key/value pair already exists, the value will be changed. If the
 * key/value pair does not exist, it will be added.
 * @param {boolean} [users.archived = false] - The updated archived field. If true, the
 * user will not be able to be found until unarchived.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 *
 * @returns {Promise<object[]>} Array of created/replaced user objects.
 *
 * @example
 * createOrReplace({User}, [{User 1}, {User 2}...], { populate: 'createdBy' })
 * .then(function(users) {
 *   // Do something with the created/replaced users
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function createOrReplace(requestingUser, users, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', users, 'Users');

    // Ensure user has permission to create or replace users
    permissions.createUser(requestingUser);

    // Sanitize input parameters and create function-wide variables
    const saniUsers = sani.db(JSON.parse(JSON.stringify(users)));
    const duplicateCheck = {};
    let usersToLookup = [];
    let createdUsers = [];
    const ts = Date.now();

    // Check the type of the users parameter
    if (Array.isArray(saniUsers)) {
      // users is an array, update many users
      usersToLookup = saniUsers;
    }
    else if (typeof saniUsers === 'object') {
      // users is an object, update a single user
      usersToLookup = [saniUsers];
    }
    else {
      throw new M.DataFormatError('Invalid input for updating users.', 'warn');
    }

    // Create list of usernames
    const arrUsernames = [];
    let index = 1;
    usersToLookup.forEach((user) => {
      try {
        // Ensure each user has a username and that its a string
        assert.ok(user.hasOwnProperty('username'), `User #${index} does not have a username.`);
        assert.ok(typeof user.username === 'string', `User #${index}'s username is not a string.`);
      }
      catch (error) {
        throw new M.DataFormatError(error.message, 'warn');
      }
      // If a duplicate ID, throw an error
      if (duplicateCheck[user.username]) {
        throw new M.DataFormatError(`Multiple objects with the same ID [${user.username}] exist in`
          + ' the update.', 'warn');
      }
      else {
        duplicateCheck[user.username] = user.username;
      }
      arrUsernames.push(user.username);
      index++;
    });

    // Create searchQuery
    const searchQuery = { _id: { $in: arrUsernames } };

    // Find the users to update
    const foundUsers = await User.find(searchQuery, null);

    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Write contents to temporary file
    fs.writeFileSync(path.join(M.root, 'data', `PUT-backup-users-${ts}.json`),
      JSON.stringify(foundUsers));

    await User.deleteMany({ _id: { $in: foundUsers.map(u => u._id) } });

    // Emit the event users-deleted
    EventEmitter.emit('users-deleted', foundUsers);

    // Try block to create new users after the old ones were deleted
    try {
      // Create the new users
      createdUsers = await create(requestingUser, usersToLookup, options);
    }
    // This will restore the original users if the new ones failed to create
    catch (error) {
      throw await new Promise(async (res) => {
        // Reinsert original data
        try {
          await User.insertMany(foundUsers);
          fs.unlinkSync(path.join(M.root, 'data',
            `PUT-backup-users-${ts}.json`));

          // Restoration succeeded; pass the original error
          res(error);
        }
        catch (restoreError) {
          // Pass the new error that occurred while trying to restore old users
          res(restoreError);
        }
      });
    }

    EventEmitter.emit('users-created', createdUsers);

    // Delete the temporary file.
    const filePath = path.join(M.root, 'data',
      `PUT-backup-users-${ts}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return createdUsers;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function removes one or many users. It additionally removes
 * the user from permissions lists on any org or project that the user was apart
 * of. This function can be used by system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} users - The users to remove. Can either be an
 * array of user ids or a single user id.
 * @param {object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @returns {Promise<string[]>} Array of deleted users' usernames.
 *
 * @example
 * remove({User}, ['user1', 'user2'])
 * .then(function(usernames) {
 *   // Do something with the deleted users usernames
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function remove(requestingUser, users, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType(['object', 'string'], users, 'Users');

    // Sanitize input parameters and create function-wide variables
    const saniUsers = sani.db(JSON.parse(JSON.stringify(users)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundUsernames = [];
    let searchedUsernames = [];

    // Define searchQuery and memberQuery
    const searchQuery = {};
    const memberQuery = {};

    // Ensure user has permission to delete users
    permissions.deleteUser(reqUser);

    // Check the type of the users parameter
    if (Array.isArray(saniUsers)) {
      // An array of usernames, remove all
      searchedUsernames = saniUsers;
      searchQuery._id = { $in: saniUsers };
    }
    else if (typeof saniUsers === 'string') {
      // A single username
      searchedUsernames = [saniUsers];
      searchQuery._id = saniUsers;
    }
    else {
      // Invalid parameter, throw an error
      throw new M.DataFormatError('Invalid input for removing users.', 'warn');
    }

    // Find the users to delete
    const foundUsers = await User.find(searchQuery);

    foundUsernames = foundUsers.map(u => u._id);

    // Check if all users were found
    const notFoundUsernames = searchedUsernames.filter(u => !foundUsernames.includes(u));
    // Some users not found, throw an error
    if (notFoundUsernames.length > 0) {
      throw new M.NotFoundError('The following users were not found: '
        + `[${notFoundUsernames}].`, 'warn');
    }

    // Create memberQuery
    foundUsers.forEach((user) => {
      memberQuery[`permissions.${user._id}`] = { $all: ['read'] };
    });

    // Check that user can remove each user
    foundUsers.forEach((user) => {
      // If trying to delete the self, throw an error
      if (user._id === reqUser._id) {
        throw new M.OperationError('User cannot delete self.', 'warn');
      }
    });

    // Find any organizations the users were apart of
    const orgs = await Organization.find(memberQuery);

    const promises = [];
    // For each org, remove users from permissions lists
    orgs.forEach((org) => {
      foundUsernames.forEach((user) => {
        delete org.permissions[user];
      });

      // Update each org
      promises.push(Organization.updateOne({ _id: org._id }, { permissions: org.permissions }));
    });

    // Save all orgs and return once all are saved
    await Promise.all(promises);

    // Find any projects the users were apart of
    const projects = await Project.find(memberQuery);

    const promises2 = [];
    // For each project, remove users from permissions lists
    projects.forEach((proj) => {
      foundUsernames.forEach((user) => {
        delete proj.permissions[user];
      });

      // Update each project
      promises2.push(Project.updateOne({ _id: proj._id }, { permissions: proj.permissions }));
    });

    // Save all projects and return once all are saved
    await Promise.all(promises2);

    // Remove the users
    await User.deleteMany(searchQuery);

    // Emit the event users-deleted
    EventEmitter.emit('users-deleted', foundUsers);

    // Return the deleted users
    return foundUsernames;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description A function which searches for users using a text-based search.
 * Returns any users that match the text search, in order of the best matches to
 * the worst.  Searches the fname, preferredName, and lname fields.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} query - The text-based query to search the database for.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {boolean} [options.archived] - A parameter that if true, will return
 * search results containing both archived and non-archived users.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects.  By default, no fields are populated.
 * @param {number} [options.limit = 0] - A number that specifies the maximum
 * number of documents to be returned to the user. A limit of 0 is equivalent to
 * setting no limit.
 * @param {number} [options.skip = 0] - A non-negative number that specifies the
 * number of documents to skip returning. For example, if 10 documents are found
 * and skip is 5, the first 5 documents will NOT be returned.
 * @param {string} [options.sort] - Provide a particular field to sort the results by.
 * You may also add a negative sign in front of the field to indicate sorting in
 * reverse order.
 *
 * @returns {Promise<object[]>} An array of found users.
 *
 * @example
 * search({User}, 'query', { populate : 'createdBy' })
 * .then(function(users) {
 *   // Do something with the found users
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function search(requestingUser, query, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    // Search function only: query must be a string
    try {
      assert.ok(typeof query === 'string', 'Query is not a string.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const searchQuery = { archived: false };

    // Validate and set the options
    const validatedOptions = utils.validateOptions(options, ['populate',
      'limit', 'skip', 'sort', 'includeArchived'], User);

    // Ensure search options are valid
    if (options) {
      // List of valid search options
      const validSearchOptions = ['fname', 'preferredName', 'lname', 'email', 'createdBy',
        'lastModifiedBy', 'archived', 'archivedBy'];

      // Check each option for valid search queries
      Object.keys(options).forEach((o) => {
        // If the search option is valid
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

    // Add text to search query
    searchQuery.$text = query;
    // If the includeArchived field is true, remove archived from the query; return everything
    if (validatedOptions.includeArchived) {
      delete searchQuery.archived;
    }

    return await User.find(searchQuery, null,
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
 * @description Updates a users password given that the old password matches the
 * currently stored password.
 *
 * @param {object} requestingUser - The object containing the requesting user.
 * This is the users whose password is being changed.
 * @param {string} oldPassword - The old password to confirm.
 * @param {string} newPassword - THe new password the user would like to set.
 * @param {string} confirmPassword - The new password entered a second time
 * to confirm they match.
 *
 * @returns {Promise<object>} The updated user public data object.
 *
 * @example
 * updatePassword({User}, 'oldPass', 'newPass', 'newPass')
 * .then(function(updatedUser) {
 *   // Do something with the updated user
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function updatePassword(requestingUser, oldPassword, newPassword, confirmPassword) {
  try {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');

      // Ensure all provided passwords are strings
      assert.ok(typeof oldPassword === 'string', 'Old Password is not a string.');
      assert.ok(typeof newPassword === 'string', 'New Password is not a string.');
      assert.ok(typeof confirmPassword === 'string', 'Confirm password is not a string');
      assert.ok(confirmPassword === newPassword, 'Passwords do not match.');
    }
    catch (err) {
      throw new M.DataFormatError(err.message, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));

    // Find the requesting user
    const userQuery = { _id: reqUser._id };
    const foundUser = await User.findOne(userQuery);

    // Ensure the user was found
    if (foundUser === null) {
      throw new M.NotFoundError('User not found.', 'warn');
    }

    // Verify the old password matches
    const verified = await User.verifyPassword(foundUser, oldPassword);

    // Ensure old password was verified
    if (!verified) {
      throw new M.AuthorizationError('Old password is incorrect.', 'warn');
    }

    // Update password on requesting user
    foundUser.password = newPassword;
    // Hash the user password
    User.hashPassword(foundUser);

    // Save the user with the updated password
    await User.updateOne(userQuery, { password: foundUser.password });

    // Find and return the updated user
    return await User.findOne(userQuery);
  }
  catch (error) {
    throw errors.captureError(error);
  }
}
