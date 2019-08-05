/**
 * Classification: UNCLASSIFIED
 *
 * @module test.401b-user-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests for expected errors within the user controller.
 */

// NPM modules
const chai = require('chai');

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
  it('should reject put user with invalid username', putInvalidUsername);
  it('should reject put user without username', putWithoutUsername);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies invalid username PUT call does not delete existing users.
 */
function putInvalidUsername(done) {
  // Create the test user objects
  const testUserObj0 = testData.users[1];
  const testUserObj1 = testData.users[2];
  const invalidUserObj = {
    username: 'INVALID_NAME',
    fname: 'user name',
    password: 'Password12345!'
  };

  UserController.createOrReplace(adminUser,
    [testUserObj0, testUserObj1, invalidUserObj])
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('User put successfully.'));
  })
  .catch((error) => {
    // Verify the error message
    chai.expect(error.message).to.equal('User validation failed: _id: '
      + 'Path `_id` is invalid (INVALID_NAME).');

    // Expected error, find valid users
    return UserController.find(adminUser, [testUserObj0.username, testUserObj1.username]);
  })
  .then((foundUsers) => {
    // Expect to find 2 users
    chai.expect(foundUsers.length).to.equal(2);
    done();
  })
  .catch((error) => {
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies PUT call without username does not delete existing users.
 * Note: This test should fail prior to deletion of existing users.
 */
function putWithoutUsername(done) {
  // Create the test users
  const testUserObj0 = testData.users[1];
  const testUserObj1 = testData.users[2];
  const invalidUserObj = { fname: 'missing username' };

  UserController.createOrReplace(adminUser,
    [testUserObj0, testUserObj1, invalidUserObj])
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('User put successfully.'));
  })
  .catch((error) => {
    // Expected error, find valid users
    UserController.find(adminUser, [testUserObj0.username, testUserObj1.username])
    .then((foundUsers) => {
      // Verify the error message
      chai.expect(error.message).to.equal('User #3 does not have a username.');

      // Expect to find 2 users
      chai.expect(foundUsers.length).to.equal(2);
      done();
    })
    .catch((err) => {
      chai.expect(err.message).to.equal(null);
      done();
    });
  });
}
