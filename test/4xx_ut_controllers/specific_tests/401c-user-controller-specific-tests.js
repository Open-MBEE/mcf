/**
 * @classification UNCLASSIFIED
 *
 * @module test.401c-user-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description These tests test for specific use cases within the user
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const UserController = M.require('controllers.user-controller');
const User = M.require('models.user');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
let adminUser = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create an admin user.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      M.log.error(error.message);
      // Expect no error
      chai.expect(error.message).to.equal(null);
    }
  });

  /**
   * After: Delete admin user.
   */
  after(async () => {
    try {
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error.message);
      // Expect no error
      chai.expect(error.message).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  it('should only find archived users when the option archived is provided', optionArchivedFind);
  it('should include archived users in the find results', optionIncludeArchivedFind);
  it('should populate allowed fields when finding a user', optionPopulateFind);
  it('should return a limited number of users from find()', optionLimitFind);
  it('should return a second batch of users with the limit and skip option'
    + ' from find()', optionSkipFind);
  it('should sort find results', optionSortFind);
  // ------------- Create -------------
  it('should create an archived user', createArchivedUser);
  it('should populate allowed fields when creating a user', optionPopulateCreate);
  it('should return a user with only the specific fields specified from'
    + ' create()', optionFieldsCreate);
  // ------------- Update -------------
  it('should archive a user', archiveUser);
  it('should populate allowed fields when updating a user', optionPopulateUpdate);
  it('should only include specified fields when updating a user', optionFieldsUpdate);
  // ------------- Replace ------------
  it('should populate allowed fields when replacing a user', optionPopulateReplace);
  it('should return a user with only the specific fields specified from'
    + ' createOrReplace()', optionFieldsReplace);
  // ------------- Remove -------------
  // --------- Update Password --------
  // ------------- Search -------------
  it('should search an archived user when the option archived is provided',
    optionArchivedSearch);
  it('should include archived users in the search results when the option includeArchived'
    + ' is provided', optionIncludeArchivedSearch);
  it('should populate allowed fields when searching a user', optionPopulateSearch);
  it('should return a limited number of users from search()', optionLimitSearch);
  it('should return a second batch of users with the limit and skip option '
    + 'from search()', optionSkipSearch);
  it('should sort search results', optionSortSearch);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that an archived user can be created.
 */
async function createArchivedUser() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test',
      archived: true
    };

    // Create user via UserController
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];
    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify that the user is archived
    chai.expect(createdUser.archived).to.equal(true);
    chai.expect(createdUser.archivedBy).to.equal(adminUser._id);
    chai.expect(createdUser.archivedOn).to.not.equal(null);
    // Remove the test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that specified populate fields will be returned when
 * creating a user.
 */
async function optionPopulateCreate() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Get the valid populate fields
    const pop = User.getValidPopulateFields();
    // Create the options object
    const options = { populate: pop };

    const createdUsers = await UserController.create(adminUser, userData, options);
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in createdUser).to.equal(true);
      if (Array.isArray(createdUser[field])) {
        createdUser[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (createdUser[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof createdUser[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in createdUser[field]).to.equal(true);
      }
    });

    // Remove the test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the fields option when specified with the create function
 * will cause the returned objects to return the specified fields.
 */
async function optionFieldsCreate() {
  try {
    // Create user objects
    const userObjFind = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'TestFind'
    };
    const userObjNotFind = {
      username: 'testuser01',
      password: 'Abc123!@',
      fname: 'TestNotFind'
    };
    // Create the options object with the list of fields specifically to find
    const findOptions = { fields: ['fname', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Create the user only with specific fields returned
    const createdUsers = await UserController.create(adminUser, userObjFind, findOptions);
    const createdUser = createdUsers[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible user fields.
    const visibleFields = Object.keys(createdUser);

    // Check that the only keys in the user are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Create the user without the notFind fields
    const notFindUsers = await UserController.create(adminUser, userObjNotFind, notFindOptions);
    const notFindUser = notFindUsers[0];

    // Create a list of visible user fields
    const visibleFields2 = Object.keys(notFindUser);

    // Check that the keys in the notFindOptions are not in createdUser
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);

    // Remove the test user
    await UserController.remove(adminUser, [userObjFind.username, userObjNotFind.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that a user can be archived.
 */
async function archiveUser() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the update object
    const updateObj = {
      username: userData.username,
      archived: true
    };
    // Create the test user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify that the user is not archived
    chai.expect(createdUser.archived).to.equal(false);

    // Update the user
    const updatedUsers = await UserController.update(adminUser, updateObj);
    const updatedUser = updatedUsers[0];

    // Verify user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(userData.fname);

    // Verify that the user has been archived
    chai.expect(updatedUser.archived).to.equal(true);
    chai.expect(updatedUser.archivedBy).to.equal(adminUser._id);
    chai.expect(updatedUser.archivedOn).to.not.equal(null);

    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that archived users can be found in the find()
 * function using the option 'archived'.
 */
async function optionArchivedFind() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test',
      archived: true
    };
    // Create the options object
    const options = { archived: true };

    // Create an archived user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Verify that the user is archived
    chai.expect(createdUser.archived).to.equal(true);

    // Attempt to find the user without providing options
    const notFoundUsers = await UserController.find(adminUser, userData.username);
    // Expect the array to be empty since the option archived: true was not provided
    chai.expect(notFoundUsers.length).to.equal(0);

    // Attempt the find the user WITH providing the archived option
    const foundUsers = await UserController.find(adminUser, userData.username, options);
    // Expect the array to be of length 1
    chai.expect(foundUsers.length).to.equal(1);
    const foundUser = foundUsers[0];

    // Verify all of the archived fields are properly set
    chai.expect(foundUser.archived).to.equal(true);
    chai.expect(foundUser.archivedOn).to.not.equal(null);
    chai.expect(foundUser.archivedBy).to.equal(adminUser._id);

    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that archived users can be found in the find()
 * function using the option 'archived'.
 */
async function optionIncludeArchivedFind() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test',
      archived: true
    };
    // Create the options object
    const options = { includeArchived: true };

    // Create an archived user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Verify that the user is archived
    chai.expect(createdUser.archived).to.equal(true);

    // Attempt to find the user without providing options
    const foundUsers = await UserController.find(adminUser, userData.username);

    // Expect the array to be empty since the option archived: true was not provided
    chai.expect(foundUsers.length).to.equal(0);

    // Attempt the find the user WITH the includeArchived option
    const archivedUsers = await UserController.find(adminUser, userData.username, options);

    // Expect the array to be of length 1
    chai.expect(archivedUsers.length).to.equal(1);
    const archivedUser = archivedUsers[0];

    // Verify all of the archived fields are properly set
    chai.expect(archivedUser.archived).to.equal(true);
    chai.expect(archivedUser.archivedOn).to.not.equal(null);
    chai.expect(archivedUser.archivedBy).to.equal(adminUser._id);
    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the fields specified in the user model function
 * getValidPopulateFields() can all be populated in the find() function using
 * the option 'populate'.
 */
async function optionPopulateFind() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Get the valid populate fields
    const pop = User.getValidPopulateFields();
    // Create the options object
    const options = { populate: pop };

    // Create the test user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);

    // Find the user with the populate option
    const foundUsers = await UserController.find(adminUser, userData.username, options);
    const foundUser = foundUsers[0];

    // Verify user found
    chai.expect(foundUser._id).to.equal(userData.username);

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in foundUser).to.equal(true);
      if (Array.isArray(foundUser[field])) {
        foundUser[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (foundUser[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof foundUser[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in foundUser[field]).to.equal(true);
      }
    });

    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies a limited number of users are returned when the
 * option 'limit' is supplied to the find() function.
 */
async function optionLimitFind() {
  try {
    // Create user objects
    const user1 = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    const user2 = {
      username: 'testuser01',
      password: 'Abc123!@',
      fname: 'Test'
    };
    const user3 = {
      username: 'testuser02',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the options object with a limit of 2
    const options = { limit: 2 };

    // Create test users
    const createdUsers = await UserController.create(adminUser, [user1, user2, user3]);
    // Verify that 3 users were created
    chai.expect(createdUsers.length).to.equal(3);
    // Find all users
    const foundUsers = await UserController.find(adminUser, options);
    // Verify that no more than 2 users were found
    chai.expect(foundUsers).to.have.lengthOf.at.most(2);

    // Remove test users
    await UserController.remove(adminUser, [user1.username, user2.username, user3.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that a second batch of users are returned when using
 * the 'skip' and 'limit' option together in the find() function.
 */
async function optionSkipFind() {
  try {
    // Create user objects
    const user1 = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    const user2 = {
      username: 'testuser01',
      password: 'Abc123!@',
      fname: 'Test'
    };
    const user3 = {
      username: 'testuser02',
      password: 'Abc123!@',
      fname: 'Test'
    };
    const user4 = {
      username: 'testuser03',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the first options object with just a limit
    const firstOptions = { limit: 2 };
    // Create the second options object with a limit and skip
    const secondOptions = { limit: 2, skip: 2 };

    // Create the test users
    const createdUsers = await UserController.create(adminUser, [user1, user2, user3, user4]);
    // Verify that four users were created
    chai.expect(createdUsers.length).to.equal(4);

    // Find the first two users
    const firstUsers = await UserController.find(adminUser, firstOptions);
    // Verify that no more than 2 users were found
    chai.expect(firstUsers.length).to.equal(2);
    // Add user ids to the firstBatchIDs array
    const firstBatchIDs = firstUsers.map(u => u._id);

    // Find the next batch of users
    const secondUsers = await UserController.find(adminUser, secondOptions);
    // Verify that no more than 2 users were found
    chai.expect(secondUsers).to.have.lengthOf.at.most(2);
    // Verify the second batch of users are not the same as the first
    const secondBatchIDs = secondUsers.map(u => u._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);

    await UserController.remove(adminUser, [user1.username,
      user2.username, user3.username, user4.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the populate option when specified with the update
 * function will cause the returned objects to populate the specified fields with objects.
 */
async function optionPopulateUpdate() {
  try {
    // Create the user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the update object
    const updateUser = {
      username: userData.username,
      fname: 'Update'
    };
    // Get valid populate options
    const pop = User.getValidPopulateFields();
    // Create options object
    const options = { populate: pop };

    // Create the test user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Validate user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Update the user
    const updatedUsers = await UserController.update(adminUser, updateUser, options);
    const updatedUser = updatedUsers[0];

    // Validate that the user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(updateUser.fname);

    // Validate that the returned object has populated fields
    pop.forEach((field) => {
      chai.expect(field in updatedUser).to.equal(true);
      if (Array.isArray(updatedUser[field])) {
        updatedUser[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (updatedUser[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof updatedUser[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in updatedUser[field]).to.equal(true);
      }
    });
    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the fields option when specified with the update
 * function will cause the returned objects to only return the specified fields.
 */
async function optionFieldsUpdate() {
  try {
    // Create the user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the update object
    const updateUser = {
      username: userData.username,
      fname: 'Update'
    };
    // Create the options object with the list of fields specifically to find
    const findOptions = { fields: ['fname', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Create the test user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Validate user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Update the user with the find options
    const updatedUsers = await UserController.update(adminUser, updateUser, findOptions);
    const updatedUser = updatedUsers[0];

    // Validate that the user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(updateUser.fname);

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible user fields.
    const visibleFields = Object.keys(updatedUser);

    // Check that the only keys in the user are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    updateUser.fname = 'Updatetwo';

    // Update the user again
    const updatedUsers2 = await UserController.update(adminUser, updateUser, findOptions);
    const updatedUser2 = updatedUsers2[0];

    // Validate that the user updated properly
    chai.expect(updatedUser2._id).to.equal(userData.username);
    chai.expect(updatedUser2.fname).to.equal(updateUser.fname);

    // Create the list of fields that should not be returned
    const expectedFields2 = notFindOptions.fields;

    // Create a list of visible user fields.
    const visibleFields2 = Object.keys(updatedUser2);

    // Check that the only keys in the user are the expected ones
    chai.expect(visibleFields2).to.not.have.members(expectedFields2);

    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the populate option when specified with the createOrReplace
 * function will cause the returned objects to populate the specified fields with objects.
 */
async function optionPopulateReplace() {
  try {
    // Create the user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the replace user object
    const replaceUserObj = {
      username: userData.username,
      password: 'Abc123!@',
      fname: 'Replaced'
    };
    // Get valid populate options
    const pop = User.getValidPopulateFields();
    // Create options object
    const options = { populate: pop };

    // Create the test user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Validate created user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Replace the user
    const replacedUsers = await UserController.createOrReplace(adminUser, replaceUserObj, options);
    const replacedUser = replacedUsers[0];

    // Validate that user was replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(replaceUserObj.fname);

    // Validate that the returned object has populated fields
    pop.forEach((field) => {
      chai.expect(field in replacedUser).to.equal(true);
      if (Array.isArray(replacedUser[field])) {
        replacedUser[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (replacedUser[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof replacedUser[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in replacedUser[field]).to.equal(true);
      }
    });

    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the fields option when specified with the createOrReplace function
 * will cause the returned objects to return the specified fields.
 */
async function optionFieldsReplace() {
  try {
    // Create the user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'Test'
    };
    // Create the replace user objects
    const replaceUserObj1 = {
      username: userData.username,
      password: 'Abc123!@',
      fname: 'Replaced'
    };
    const replaceUserObj2 = {
      username: userData.username,
      password: 'Abc123!@',
      fname: 'ReplacedAgain'
    };
    // Create the options object with the list of fields specifically to find
    const findOptions = { fields: ['fname', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Create the test user
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Validate created user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Replace a user with field find options
    const replacedUsers = await UserController.createOrReplace(adminUser, replaceUserObj1,
      findOptions);
    const replacedUser = replacedUsers[0];

    // Validate that user was replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(replaceUserObj1.fname);

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible user fields.
    const visibleFields = Object.keys(replacedUser);

    // Check that the only keys in the user are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    const notFindUsers = await UserController.createOrReplace(adminUser, replaceUserObj2,
      notFindOptions);
    const notFindUser = notFindUsers[0];

    // Validate user replaced properly
    chai.expect(notFindUser._id).to.equal(userData.username);
    chai.expect(notFindUser.fname).to.equal(replaceUserObj2.fname);

    // Create a list of visible user fields.
    const visibleFields2 = Object.keys(notFindUser);

    // Check that the keys in the notFindOptions are not in createdUser
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);
    // Remove test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the archived option when specified in the search function
 * allows for archived results to be returned.
 */
async function optionArchivedSearch() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'FirstName',
      archived: true
    };
    // Search term
    const searchQuery = 'FirstName';
    // Create options object
    const options = { archived: true };

    // Create user via UserController
    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify user archived
    chai.expect(createdUser.archived).to.equal(true);

    // Search for users
    const foundUsers = await UserController.search(adminUser, searchQuery, options);
    // Expect to find at least one user
    chai.expect(foundUsers).to.have.lengthOf.at.least(1);
    // Validate search text in found users
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
    });

    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the archived option when specified in the search function
 * allows for archived results to be returned.
 */
async function optionIncludeArchivedSearch() {
  try {
    // Create user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'FirstName',
      archived: true
    };
    // Search term
    const searchQuery = 'FirstName';
    // Create options object
    const options = { includeArchived: true };

    // Create user via UserController
    const createdUsers = await UserController.create(adminUser, userData);

    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify user archived
    chai.expect(createdUser.archived).to.equal(true);

    // Search for users
    const foundUsers = await UserController.search(adminUser, searchQuery, options);

    // Expect to find at least one user
    chai.expect(foundUsers).to.have.lengthOf.at.least(1);
    // Validate search text in found users
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname).to.equal(searchQuery);
    });

    // Remove the test user
    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the populated parameter will cause specified fields to
 * be populated in the search results when used with the search function.
 */
async function optionPopulateSearch() {
  try {
    // Create the user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'First'
    };
    // Search term
    const searchQuery = 'First';
    // Get valid populate fields
    const pop = User.getValidPopulateFields();
    // Create options object
    const options = { populate: pop };

    const createdUsers = await UserController.create(adminUser, userData);
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Search for users
    const foundUsers = await UserController.search(adminUser, searchQuery, options);
    // Validate search function
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
    });

    // Validate that fields were populated
    pop.forEach((field) => {
      foundUsers.forEach((foundUser) => {
        chai.expect(field in foundUser).to.equal(true);
        if (Array.isArray(foundUser[field])) {
          foundUser[field].forEach((item) => {
            // Expect each populated field to be an object
            chai.expect(typeof item).to.equal('object');
            // Expect each populated field to at least have an id
            chai.expect('_id' in item).to.equal(true);
          });
        }
        else if (foundUser[field] !== null) {
          // Expect each populated field to be an object
          chai.expect(typeof foundUser[field]).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in foundUser[field]).to.equal(true);
        }
      });
    });

    await UserController.remove(adminUser, userData.username);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the limit parameter will limit the number of search
 * results returned when used with the search function.
 */
async function optionLimitSearch() {
  try {
    // Create the user object
    const userData = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'First'
    };
    const userData2 = {
      username: 'testuser01',
      password: 'Abc123!@',
      fname: 'First'
    };
    // Search term
    const searchQuery = 'First';
    // Create options object
    const options = { limit: 1 };
    const createdUsers = await UserController.create(adminUser, [userData, userData2]);
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Search for users
    const foundUsers = await UserController.search(adminUser, searchQuery, options);
    // Expect only one users to be returned
    chai.expect(foundUsers.length).to.equal(1);

    // Validate search function
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
    });

    await UserController.remove(adminUser, [userData.username, userData2.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the skip parameter will skip search results when used
 * with the search function.
 */
async function optionSkipSearch() {
  try {
    // Create user objects
    const user1 = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'First'
    };
    const user2 = {
      username: 'testuser01',
      password: 'Abc123!@',
      fname: 'First'
    };
    const user3 = {
      username: 'testuser02',
      password: 'Abc123!@',
      fname: 'First'
    };
    // Search term
    const searchQuery = 'First';
    // Create the first options object with just a limit
    const firstOptions = { limit: 2 };
    // Create the second options object with a limit and skip
    const secondOptions = { limit: 1, skip: 2 };

    // Create test users
    const createdUsers = await UserController.create(adminUser, [user1, user2, user3]);
    // Validate that 3 users were created
    chai.expect(createdUsers.length).to.equal(3);

    // Search for users
    const firstUsers = await UserController.search(adminUser, searchQuery, firstOptions);
    // Expect to find the first two users
    chai.expect(firstUsers.length).to.equal(2);

    // Add user ids to the firstBatchIDs array
    const firstBatchIDs = firstUsers.map(u => u._id);

    // Search for next batch of users
    const secondUsers = await UserController.search(adminUser, searchQuery, secondOptions);
    // Expect to find one user
    chai.expect(secondUsers.length).to.equal(1);

    // Expect the second search to return different users than the first
    const secondBatchIDs = secondUsers.map(u => u._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);

    await UserController.remove(adminUser, [user1.username, user2.username, user3.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can be sorted.
 */
async function optionSortFind() {
  try {
    // Create user objects
    const user1 = {
      username: 'testuser0',
      password: 'Abc123!@',
      fname: 'c'
    };
    const user2 = {
      username: 'testuser1',
      password: 'Abc123!@',
      fname: 'a'
    };
    const user3 = {
      username: 'testuser2',
      password: 'Abc123!@',
      fname: 'b'
    };
    // Create sort options
    const sortOption = { sort: 'fname' };
    const sortOptionReverse = { sort: '-fname' };

    // Create the test users
    const createdUsers = await UserController.create(adminUser, [user1, user2, user3]);
    // Validate that 3 users were created
    chai.expect(createdUsers.length).to.equal(3);

    // Find the users and return them sorted
    const sortUsers = await UserController.find(adminUser,
      [user1.username, user2.username, user3.username], sortOption);
    // Expect to find all three users
    chai.expect(sortUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(sortUsers[0].fname).to.equal('a');
    chai.expect(sortUsers[0]._id).to.equal('testuser1');
    chai.expect(sortUsers[1].fname).to.equal('b');
    chai.expect(sortUsers[1]._id).to.equal('testuser2');
    chai.expect(sortUsers[2].fname).to.equal('c');
    chai.expect(sortUsers[2]._id).to.equal('testuser0');

    // Find the users and return them sorted in reverse
    const reverseUsers = await UserController.find(adminUser,
      [user1.username, user2.username, user3.username], sortOptionReverse);
    // Expect to find all three users
    chai.expect(reverseUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(reverseUsers[0].fname).to.equal('c');
    chai.expect(reverseUsers[0]._id).to.equal('testuser0');
    chai.expect(reverseUsers[1].fname).to.equal('b');
    chai.expect(reverseUsers[1]._id).to.equal('testuser2');
    chai.expect(reverseUsers[2].fname).to.equal('a');
    chai.expect(reverseUsers[2]._id).to.equal('testuser1');

    await UserController.remove(adminUser, [user1.username, user2.username, user3.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the search results can be sorted.
 */
async function optionSortSearch() {
  try {
    // Create user objects
    const user1 = {
      username: 'testuser00',
      password: 'Abc123!@',
      fname: 'b',
      lname: 'searchme'
    };
    const user2 = {
      username: 'testuser01',
      password: 'Abc123!@',
      fname: 'c',
      lname: 'searchme'
    };
    const user3 = {
      username: 'testuser02',
      password: 'Abc123!@',
      fname: 'a',
      lname: 'searchme'
    };
    const user4 = {
      username: 'testuser03',
      password: 'Abc123!@',
      fname: 'd',
      lname: 'no'
    };

    // Create sort options
    const sortOption = { sort: 'fname' };
    const sortOptionReverse = { sort: '-fname' };
    // Search term
    const searchQuery = 'searchme';

    // Create the test users
    const createdUsers = await UserController.create(adminUser, [user1, user2, user3, user4]);
    // Validate that 4 users were created
    chai.expect(createdUsers.length).to.equal(4);

    // Search the users and return them sorted
    const sortUsers = await UserController.search(adminUser, searchQuery, sortOption);
    // Expect to only find three users
    chai.expect(sortUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(sortUsers[0].fname).to.equal('a');
    chai.expect(sortUsers[0]._id).to.equal('testuser02');
    chai.expect(sortUsers[1].fname).to.equal('b');
    chai.expect(sortUsers[1]._id).to.equal('testuser00');
    chai.expect(sortUsers[2].fname).to.equal('c');
    chai.expect(sortUsers[2]._id).to.equal('testuser01');

    // Search the users and return them sorted in reverse
    const reverseUsers = await UserController.search(adminUser, searchQuery, sortOptionReverse);
    // Expect to find three users
    chai.expect(reverseUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(reverseUsers[0].fname).to.equal('c');
    chai.expect(reverseUsers[0]._id).to.equal('testuser01');
    chai.expect(reverseUsers[1].fname).to.equal('b');
    chai.expect(reverseUsers[1]._id).to.equal('testuser00');
    chai.expect(reverseUsers[2].fname).to.equal('a');
    chai.expect(reverseUsers[2]._id).to.equal('testuser02');

    await UserController.remove(adminUser, [user1.username, user2.username,
      user3.username, user4.username]);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}
