/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.user-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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
  updatePassword
};

// Node.js Modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// MBEE Modules
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const validators = M.require('lib.validators');
const jmi = M.require('lib.jmi-conversions');
const utils = M.require('lib.utils');

/**
 * @description This function finds one or many users. Depending on the given
 * parameters, this function can find a single user by username, multiple users
 * by username, or all users in the system.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} [users] - The users to find. Can either be an
 * array of user ids, a single user id, or not provided, which defaults to every
 * user being found.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {boolean} [options.archived = false] - If true, find results will include
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
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of found users' public data objects.
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
function find(requestingUser, users, options) {
  return new Promise((resolve, reject) => {
    // Set options if no users were provided, but options were
    if (typeof users === 'object' && users !== null && !Array.isArray(users)) {
      options = users; // eslint-disable-line no-param-reassign
      users = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');

      const userTypes = ['undefined', 'object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(userTypes.includes(typeof users), 'Users parameter is an invalid type.');
      // If users is an object, ensure it's an array of strings
      if (typeof users === 'object') {
        assert.ok(Array.isArray(users), 'Users is an object, but not an array.');
        assert.ok(users.every(u => typeof u === 'string'), 'Users is not an array of strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters
    const saniUsers = (users !== undefined)
      ? sani.mongo(JSON.parse(JSON.stringify(users)))
      : undefined;

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'archived',
      'fields', 'limit', 'skip', 'lean'], User);

    // Define searchQuery
    const searchQuery = { archived: false };
    // If the archived field is true, remove it from the query
    if (validOptions.archived) {
      delete searchQuery.archived;
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
      throw new M.CustomError('Invalid input for finding users.', 400, 'warn');
    }

    // If the lean option is supplied
    if (validOptions.lean) {
      // Find the users
      User.find(searchQuery, validOptions.fieldsString,
        { limit: validOptions.limit, skip: validOptions.skip })
      .populate(validOptions.populateString).lean()
      .then((foundUser) => resolve(foundUser))
      .catch((error) => reject(M.CustomError.parseCustomError(error)));
    }
    else {
      // Find the users
      User.find(searchQuery, validOptions.fieldsString,
        { limit: validOptions.limit, skip: validOptions.skip })
      .populate(validOptions.populateString)
      .then((foundUser) => resolve(foundUser))
      .catch((error) => reject(M.CustomError.parseCustomError(error)));
    }
  });
}

/**
 * @description This functions creates one or many users from the provided data.
 * This function is restricted to system-wide admin ONLY. The database is
 * searched for existing users with duplicate usernames and the users are added
 * to the default org prior to being returned from this function.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(Object|Object[])} users - Either an array of objects containing user
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
 * @param {Object} [users.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created users' users' public data objects.
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
function create(requestingUser, users, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions to create users.');
      assert.ok(typeof users === 'object', 'Users parameter is not an object.');
      assert.ok(users !== null, 'Users parameter cannot be null.');
      // If users is an array, ensure each item inside is an object
      if (Array.isArray(users)) {
        assert.ok(users.every(u => typeof u === 'object'), 'Every item in users is not an'
          + ' object.');
        assert.ok(users.every(u => u !== null), 'One or more items in users is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const saniUsers = sani.mongo(JSON.parse(JSON.stringify(users)));
    let createdUsers = [];

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], User);

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
      throw new M.CustomError('Invalid input for creating users.', 400, 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrUsernames = [];
    const validUserKeys = ['username', 'password', 'fname', 'lname',
      'preferredName', 'email', 'admin', 'provider', 'custom', 'archived'];

    // Check that each user has a username, and add to arrUsernames
    try {
      let index = 1;
      usersToCreate.forEach((user) => {
        // Ensure keys are valid
        Object.keys(user).forEach((k) => {
          assert.ok(validUserKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each user has a username and that its a string
        assert.ok(user.hasOwnProperty('username'), `User #${index} does not have a username`);
        assert.ok(typeof user.username === 'string', `User #${index}'s username is not a string.`);
        // Check if user with same username is already being created
        assert.ok(!arrUsernames.includes(user.username), 'Multiple users with '
          + `the same username [${user.username}] cannot be created.`);
        arrUsernames.push(user.username);
        user._id = user.username;
        index++;
      });
    }
    catch (err) {
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Create searchQuery to search for any existing, conflicting users
    const searchQuery = { _id: { $in: arrUsernames } };

    // Find any existing, conflicting users
    User.find(searchQuery, '_id').lean()
    .then((foundUsers) => {
      // If there are any foundUsers, there is a conflict
      if (foundUsers.length > 0) {
        // Get arrays of the foundUsers's usernames
        const foundUserUsernames = foundUsers.map(u => u._id);

        // There are one or more users with conflicting usernames
        throw new M.CustomError('Users with the following usernames already exist'
            + ` [${foundUserUsernames.toString()}].`, 403, 'warn');
      }

      // For each object of user data, create the user object
      const userObjects = usersToCreate.map((u) => {
        const userObj = new User(u);
        userObj.lastModifiedBy = reqUser._id;
        userObj.createdBy = reqUser._id;
        userObj.updatedOn = Date.now();
        userObj.archivedBy = (userObj.archived) ? reqUser._id : null;
        return userObj;
      });


      // Create the users
      // NOTE: .create() is being used here instead of.insertMany() so that the
      // pre save middleware is called for password validation
      return User.create(userObjects);
    })
    .then((_createdUsers) => {
      // Set function-wide createdUsers;
      createdUsers = _createdUsers;

      // Emit the event users-created
      EventEmitter.emit('users-created', createdUsers);

      // Find the default organization
      return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
    })
    .then((defaultOrg) => {
      // Add each created user to the default org with read/write
      createdUsers.forEach((user) => {
        defaultOrg.permissions[user._id] = ['read', 'write'];
      });

      // Mark the default orgs permissions as modified
      defaultOrg.markModified('permissions');

      // Save the updated default org
      return defaultOrg.save();
    })
    .then(() => {
      // If the lean option is supplied
      if (validOptions.lean) {
        return User.find({ _id: { $in: arrUsernames } }, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return User.find({ _id: { $in: arrUsernames } }, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundCreatedUsers) => resolve(foundCreatedUsers))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function updates one or many users. Multiple fields in
 * multiple users can be updated at once, provided that the fields are allowed
 * to be updated. If updating the custom data on a user, and key/value pairs
 * exist in the update object that don't exist in the current custom data,
 * the key/value pair will be added. If the key/value pairs do exist, the value
 * will be changed. If a user is archived, they must first be unarchived before
 * any other updates occur. NOTE: A user cannot archive or unarchive themselves.
 * This function is restricted to system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(Object|Object[])} users - Either an array of objects containing
 * updates to users, or a single object containing updates.
 * @param {string} users.id - The ID of the user being updated. Field cannot be
 * updated but is required to find user.
 * @param {string} [users.fname] - The updated first name of the user.
 * @param {string} [users.lname] - The updated last name of the user.
 * @param {string} [users.preferredName] - The updated preferred first name of
 * the user.
 * @param {string} [users.email] - The updated email of the user.
 * @param {Object} [users.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [users.archived = false] - The updated archived field. If true, the
 * user will not be able to be found until unarchived.
 * @param {boolean} [users.admin] - The updated admin field. If true, the
 * user is a system-wide admin. NOTE: Only system-wide admins can update this
 * property.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of updated users' public data objects.
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
function update(requestingUser, users, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof users === 'object', 'Users parameter is not an object.');
      assert.ok(users !== null, 'Users parameter cannot be null.');
      // If users is an array, ensure each item inside is an object
      if (Array.isArray(users)) {
        assert.ok(users.every(u => typeof u === 'object'), 'Every item in users is not an'
          + ' object.');
        assert.ok(users.every(u => u !== null), 'One or more items in users is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const saniUsers = sani.mongo(JSON.parse(JSON.stringify(users)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundUsers = [];
    let usersToUpdate = [];
    const duplicateCheck = {};

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], User);

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
      throw new M.CustomError('Invalid input for updating users.', 400, 'warn');
    }

    // Create list of usernames
    const arrUsernames = [];
    try {
      let index = 1;
      usersToUpdate.forEach((user) => {
        // Ensure each user has a username and that its a string
        assert.ok(user.hasOwnProperty('username'), `User #${index} does not have a username.`);
        assert.ok(typeof user.username === 'string', `User #${index}'s username is not a string.`);
        // If a duplicate ID, throw an error
        if (duplicateCheck[user.username]) {
          throw new M.CustomError(`Multiple objects with the same ID [${user.username}] exist in`
            + ' the update.', 400, 'warn');
        }
        else {
          duplicateCheck[user.username] = user.username;
        }
        arrUsernames.push(user.username);
        user._id = user.username;
        index++;
      });
    }
    catch (err) {
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Ensure user cannot update others, unless sys-admin
    if (!reqUser.admin && (arrUsernames.length > 1 || arrUsernames[0] !== reqUser.username)) {
      throw new M.CustomError('Cannot update other users unless admin.', 403, 'warn');
    }

    // Create searchQuery
    const searchQuery = { _id: { $in: arrUsernames } };
    // Find the users to update
    User.find(searchQuery).lean()
    .then((_foundUsers) => {
      // Verify the same number of users are found as desired
      if (_foundUsers.length !== arrUsernames.length) {
        const foundIDs = _foundUsers.map(u => u._id);
        const notFound = arrUsernames.filter(u => !foundIDs.includes(u));
        throw new M.CustomError(
          `The following users were not found: [${notFound.toString()}].`, 404, 'warn'
        );
      }
      // Set the function-wide foundUsers
      foundUsers = _foundUsers;

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
        if (user.archived && updateUser.archived !== false) {
          throw new M.CustomError(`User [${user._id}] is archived. `
              + 'Archived objects cannot be modified.', 403, 'warn');
        }

        // For each key in the updated object
        Object.keys(updateUser).forEach((key) => {
          // Check if the field is valid to update
          if (!validFields.includes(key)) {
            throw new M.CustomError(`User property [${key}] cannot `
                + 'be changed.', 400, 'warn');
          }

          // Get validator for field if one exists
          if (validators.user.hasOwnProperty(key)) {
            // If validation fails, throw error
            if (!RegExp(validators.user[key]).test(updateUser[key])) {
              throw new M.CustomError(
                `Invalid ${key}: [${updateUser[key]}]`, 403, 'warn'
              );
            }
          }

          // If updating the admin key, ensure the requesting user is an admin
          if (key === 'admin' && !reqUser.admin) {
            throw new M.CustomError(`${reqUser.username} does not have`
              + ' permissions to update the admin field.', 403, 'warn');
          }

          // If the type of field is mixed
          if (User.schema.obj[key]
            && User.schema.obj[key].type.schemaName === 'Mixed') {
            // Only objects should be passed into mixed data
            if (typeof updateUser !== 'object') {
              throw new M.CustomError(`${key} must be an object`, 400, 'warn');
            }
          }
          // Set archivedBy if archived field is being changed
          else if (key === 'archived') {
            // User cannot archive or unarchive themselves
            if (user._id === reqUser._id) {
              throw new M.CustomError('User cannot archive or unarchive themselves', 403, 'warn');
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
      return User.bulkWrite(bulkArray);
    })
    .then(() => {
      // If the lean option is supplied
      if (validOptions.lean) {
        return User.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString).lean();
      }
      else {
        return User.find(searchQuery, validOptions.fieldsString)
        .populate(validOptions.populateString);
      }
    })
    .then((foundUpdatedUsers) => {
      // Emit the event users-updated
      EventEmitter.emit('users-updated', foundUpdatedUsers);

      return resolve(foundUpdatedUsers);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function creates or replaces one or many users. If users
 * with matching usernames already exist, this function updates those users.
 * This function is restricted to system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(Object|Object[])} users - Either an array of objects containing
 * updates to users, or a single object containing updates.
 * @param {string} users.id - The ID of the user being updated. Field cannot be
 * updated but is required to find user.
 * @param {string} [users.fname] - The updated first name of the user.
 * @param {string} [users.lname] - The updated last name of the user.
 * @param {string} [users.preferredName] - The updated preferred first name of
 * the user.
 * @param {string} [users.email] - The updated email of the user.
 * @param {Object} [users.custom] - The additions or changes to existing custom
 * data. If the key/value pair already exists, the value will be changed. If the
 * key/value pair does not exist, it will be added.
 * @param {boolean} [users.archived = false] - The updated archived field. If true, the
 * user will not be able to be found until unarchived.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id and username fields. To NOT include a field, provide a '-'
 * in front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of users' public data objects.
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
function createOrReplace(requestingUser, users, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions'
        + 'to replace users.');
      assert.ok(typeof users === 'object', 'Users parameter is not an object.');
      assert.ok(users !== null, 'Users parameter cannot be null.');
      // If users is an array, ensure each item inside is an object
      if (Array.isArray(users)) {
        assert.ok(users.every(u => typeof u === 'object'), 'Every item in users is not an'
          + ' object.');
        assert.ok(users.every(u => u !== null), 'One or more items in users is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const saniUsers = sani.mongo(JSON.parse(JSON.stringify(users)));
    const duplicateCheck = {};
    let foundUsers = [];
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
      throw new M.CustomError('Invalid input for updating users.', 400, 'warn');
    }

    // Create list of usernames
    const arrUsernames = [];
    try {
      let index = 1;
      usersToLookup.forEach((user) => {
        // Ensure each user has a username and that its a string
        assert.ok(user.hasOwnProperty('username'), `User #${index} does not have a username.`);
        assert.ok(typeof user.username === 'string', `User #${index}'s username is not a string.`);
        // If a duplicate ID, throw an error
        if (duplicateCheck[user.username]) {
          throw new M.CustomError(`Multiple objects with the same ID [${user.username}] exist in`
            + ' the update.', 400, 'warn');
        }
        else {
          duplicateCheck[user.username] = user.username;
        }
        arrUsernames.push(user.username);
        index++;
      });
    }
    catch (err) {
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Create searchQuery
    const searchQuery = { _id: { $in: arrUsernames } };

    // Find the users to update
    User.find(searchQuery).lean()
    .then((_foundUsers) => {
      // Set the function-wide foundUsers
      foundUsers = _foundUsers;

      // If data directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data'))) {
        fs.mkdirSync(path.join(M.root, 'data'));
      }

      // Write contents to temporary file
      return new Promise(function(res, rej) {
        fs.writeFile(path.join(M.root, 'data', `PUT-backup-users-${ts}.json`),
          JSON.stringify(_foundUsers), function(err) {
            if (err) rej(err);
            else res();
          });
      });
    })
    .then(() => User.deleteMany({ _id: foundUsers.map(u => u._id) }).lean())
    .then(() => {
      // Emit the event users-deleted
      EventEmitter.emit('users-deleted', foundUsers);

      // Create the new users
      return create(requestingUser, usersToLookup, options);
    })
    .then((_createdUsers) => {
      createdUsers = _createdUsers;

      // Delete the temporary file.
      const filePath = path.join(M.root, 'data', `PUT-backup-users-${ts}.json`);
      if (fs.existsSync(filePath)) {
        return new Promise(function(res, rej) {
          fs.unlink(filePath, function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve(createdUsers))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function removes one or many users. It additionally removes
 * the user from permissions lists on any org or project that the user was apart
 * of. This function can be used by system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} users - The users to remove. Can either be an
 * array of user ids or a single user id.
 * @param {Object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @return {Promise} Array of deleted users' usernames.
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
function remove(requestingUser, users, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions to delete users.');
      const userTypes = ['object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(userTypes.includes(typeof users), 'Users parameter is an invalid type.');
      // If users is an object, ensure it's an array of strings
      if (typeof users === 'object') {
        assert.ok(Array.isArray(users), 'Users is an object, but not an array.');
        assert.ok(users.every(u => typeof u === 'string'), 'Users is not an array of strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const saniUsers = sani.mongo(JSON.parse(JSON.stringify(users)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundUsers = [];
    let foundUsernames = [];
    let searchedUsernames = [];

    // Define searchQuery and memberQuery
    const searchQuery = {};
    const memberQuery = {};

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
      throw new M.CustomError('Invalid input for removing users.', 400, 'warn');
    }

    // Find the users to delete
    User.find(searchQuery)
    .then((_foundUsers) => {
      // Set function-wide foundUsers and foundUsernames
      foundUsers = _foundUsers;
      foundUsernames = foundUsers.map(u => u._id);

      // Check if all users were found
      const notFoundUsernames = searchedUsernames.filter(u => !foundUsernames.includes(u));
      // Some users not found, throw an error
      if (notFoundUsernames.length > 0) {
        throw new M.CustomError('The following users were not found: '
          + `[${notFoundUsernames}].`, 404, 'warn');
      }

      // Create memberQuery
      foundUsers.forEach((user) => {
        memberQuery[`permissions.${user.username}`] = 'read';
      });

      // Check that user can remove each user
      foundUsers.forEach((user) => {
        // If trying to delete the self, throw an error
        if (user._id === reqUser._id) {
          throw new M.CustomError('User cannot delete self.', 403, 'warn');
        }
      });

      // Find any organizations the users were apart of
      return Organization.find(memberQuery);
    })
    .then((orgs) => {
      const promises = [];
      // For each org, remove users from permissions lists
      orgs.forEach((org) => {
        foundUsernames.forEach((user) => {
          delete org.permissions[user];
        });

        org.markModified('permissions');

        // Add save operation to promise array
        promises.push(org.save());
      });

      // Save all orgs and return once all are saved
      return Promise.all(promises);
    })
    // Find any projects the users were apart of
    .then(() => Project.find(memberQuery))
    .then((projects) => {
      const promises = [];
      // For each project, remove users from permissions lists
      projects.forEach((proj) => {
        foundUsernames.forEach((user) => {
          delete proj.permissions[user];
        });

        proj.markModified('permissions');

        // Add save operation to promise array
        promises.push(proj.save());
      });

      // Save all projects and return once all are saved
      return Promise.all(promises);
    })
    // Remove the users
    .then(() => User.deleteMany(searchQuery).lean())
    // Return the deleted users
    .then(() => {
      // Emit the event users-deleted
      EventEmitter.emit('users-deleted', foundUsers);

      return resolve(foundUsernames);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description Updates a users password given that the old password matches the
 * currently stored password.
 *
 * @param {Object} requestingUser - The object containing the requesting user.
 * This is the users whose password is being changed.
 * @param {string} oldPassword - The old password to confirm.
 * @param {string} newPassword - THe new password the user would like to set.
 * @param {string} confirmPassword - The new password entered a second time
 * to confirm they match.
 *
 * @return {Promise} The updated user public data object.
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
function updatePassword(requestingUser, oldPassword, newPassword, confirmPassword) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');

      // Ensure all provided passwords are strings
      assert.ok(typeof oldPassword === 'string', 'Old Password is not a string.');
      assert.ok(typeof newPassword === 'string', 'New Password is not a string.');
      assert.ok(typeof confirmPassword === 'string', 'Passwords do not match.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let foundUser = null;

    // Check if newPassword and confirmPassword match
    if (confirmPassword !== newPassword) {
      throw new M.CustomError('Passwords do not match.', 400, 'warn');
    }

    // Find the requesting user
    User.findOne({ _id: reqUser._id })
    .then((user) => {
      foundUser = user;

      // Ensure the user was found
      if (user === null) {
        throw new M.CustomError('User not found.', 404, 'warn');
      }

      // Verify the old password matches
      return foundUser.verifyPassword(oldPassword);
    })
    .then((verified) => {
      // Ensure old password was verified
      if (!verified) {
        throw new M.CustomError('Old password is incorrect.', 403, 'warn');
      }

      // Update password on requesting user
      foundUser.password = newPassword;

      // Save the requesting user, forcing pre-save middleware to hash
      // new password.
      return foundUser.save();
    })
    .then((updatedUser) => resolve(updatedUser))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}
