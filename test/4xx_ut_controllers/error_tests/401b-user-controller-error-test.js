/**
 * @classification UNCLASSIFIED
 *
 * @module test.401b-user-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Phillip Lee
 *
 * @description This tests for expected errors within the user controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const UserController = M.require('controllers.user-controller');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
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
   * Before: Create admin user. Creates two test users.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set global admin user
      adminUser = user;

      // Create the users
      return UserController.create(adminUser,
        [testData.users[1], testData.users[2]]);
    })
    .then((createdUsers) => {
      // Expect array to contain 2 users
      chai.expect(createdUsers.length).to.equal(2);
      done();
    })
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: Delete admin user. Deletes the two test users.
   */
  after((done) => {
    UserController.remove(adminUser,
      [testData.users[1].username, testData.users[2].username])
    // Removing admin user
    .then(() => testUtils.removeTestAdmin())
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  // -------------- Find --------------
  // ------------- Create -------------
  // ------------- Update -------------
  // ------------- Replace ------------
  it('should reject put user with invalid username', putInvalidUsername);
  it('should reject put user without username', putWithoutUsername);
  // ------------- Remove -------------
  // --------- Update Password --------
  // ------------- Search -------------
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies invalid username PUT call does not delete existing users.
 */
async function putInvalidUsername() {
  // Create the test user objects
  const testUserObj0 = testData.users[1];
  const testUserObj1 = testData.users[2];
  const invalidUserObj = {
    username: 'INVALID_NAME',
    fname: 'user name',
    password: 'Password12345!'
  };

  await UserController.createOrReplace(adminUser, [testUserObj0, testUserObj1, invalidUserObj])
  .should.eventually.be.rejectedWith(
    'User validation failed: _id: Invalid username [INVALID_NAME].'
  );

  let foundUsers;
  try {
    // Expected error, find valid users
    foundUsers = await UserController.find(adminUser,
      [testUserObj0.username, testUserObj1.username]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 users
  foundUsers.length.should.equal(2);
}

/**
 * @description Verifies PUT call without username does not delete existing users.
 * Note: This test should fail prior to deletion of existing users.
 */
async function putWithoutUsername() {
  // Create the test users
  const testUserObj0 = testData.users[1];
  const testUserObj1 = testData.users[2];
  const invalidUserObj = { fname: 'missing username' };

  await UserController.createOrReplace(adminUser, [testUserObj0, testUserObj1, invalidUserObj])
  .should.eventually.be.rejectedWith('User #3 does not have a username.');

  let foundUsers;
  try {
    // Expected error, find valid users
    foundUsers = await UserController.find(adminUser,
      [testUserObj0.username, testUserObj1.username]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 users
  foundUsers.length.should.equal(2);
}
