/**
 * @classification UNCLASSIFIED
 *
 * @module test.auth_tests.801-local-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Tests functionality for locking out users after exceeding the
 * allowed amount of failed login attempts within a specific time period and the
 * related tracking of such attempts.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const User = M.require('models.user');
const UserController = M.require('controllers.user-controller');
const APIController = M.require('controllers.api-controller');
const db = M.require('lib.db');
const localAuth = M.require('auth.local-strategy');

/* --------------------( Test Data )-------------------- */
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
   * Before: runs before all tests. Open the database connection.
   */
  before(async function() {
    try {
      await db.connect();
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      should.not.exist(error);
    }
  });

  /**
   * After: runs after all tests. Close database connection.
   */
  after(async function() {
    try {
      await User.deleteMany({ _id: adminUser.username });
      await db.disconnect();
    }
    catch (error) {
      should.not.exist(error);
    }
  });

  /* Execute the tests */
  it('should log the time and ip address of a failed login attempt', logFailedLogin);
  it('should only return the failedlogins field if the requesting user is an admin', failedloginsField);
  it('should archive a user after 5 failed login attempts in 15 minutes', lockoutUser);
  it('should not archive a user after 5 failed login attempts if that user is the only'
    + ' non-archived admin', noAdminLockout);
});

/* --------------------( Tests )-------------------- */
/**
 * @description This function tests that the local-strategy login function logs the time and ip
 * address of a failed login attempt.
 */
async function logFailedLogin() {
  if (M.config.auth.strategy !== 'local-strategy' && M.config.auth.strategy !== 'local-ldap-strategy') {
    M.log.verbose('Test skipped because local auth strategy is not enabled');
    this.skip();
  }
  // Create a test user
  const userData = testData.users[0];

  // Create user via controller
  const users = await UserController.create(adminUser, userData);
  const user = users[0];

  // Create mock request object
  const req = {
    connection: {
      remoteAddress: '::1'
    }
  };

  // Create mock response object
  const res = {};

  // Get the current time
  const timestamp = Date.now();

  // Attempt to authenticate user with wrong password
  await localAuth.handleBasicAuth(req, res, user._id, 'wrongPassword')
  .should.eventually.be.rejectedWith('Invalid password.');

  const foundUser = await User.findOne({ _id: user._id });

  // Validate the failedlogins field
  foundUser.failedlogins[0].ipaddress.should.equal('::1');
  foundUser.failedlogins[0].timestamp.should.be.at.least(timestamp);

  // Remove the test user
  await UserController.remove(adminUser, user._id);
}

/**
 * @description This function validates that only an admin user can see the failed login fields
 * of a user.
 */
async function failedloginsField() {
  if (M.config.auth.strategy !== 'local-strategy' && M.config.auth.strategy !== 'local-ldap-strategy') {
    M.log.verbose('Test skipped because local auth strategy is not enabled');
    this.skip();
  }
  // Create a test user
  const userData = testData.users[0];

  // Create user via controller
  const users = await UserController.create(adminUser, userData);
  const user = users[0];

  // Create mock req/res objects for the handleBasicAuth function
  let req = {
    connection: {
      remoteAddress: '::1'
    }
  };
  const res = {};

  // Attempt to authenticate user with wrong password
  await localAuth.handleBasicAuth(req, res, user._id, 'wrongPassword')
  .should.eventually.be.rejectedWith('Invalid password.');

  // *************** Verify failedlogins field returned for admin *************** //
  // Create a mock req object for the api controller
  req = testUtils.createRequest(adminUser, { username: userData.username }, {}, 'GET');
  // Create a mock res object for the api controller
  testUtils.createResponse(res);
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUser = JSON.parse(_data);
    // Verify expected response
    foundUser.should.have.property('failedlogins');
    res.statusCode.should.equal(200);
  };
  // GETs the test user as an admin
  await APIController.getUser(req, res);

  // *************** Verify failedlogins field not returned for non-admin *************** //
  // Create a mock req object for the api controller
  req = testUtils.createRequest(user, { username: userData.username }, {}, 'GET');
  // Create a mock res object for the api controller
  testUtils.createResponse(res);
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUser = JSON.parse(_data);
    // Verify expected response
    foundUser.should.not.have.property('failedlogins');
    res.statusCode.should.equal(200);
  };
  // GETs the user as a non-admin
  await APIController.getUser(req, res);

  // Remove the test user
  await UserController.remove(adminUser, user._id);
}

/**
 * @description This function tests that a user will be archived after five incorrect login
 * attempts within a 15 minute window.
 */
async function lockoutUser() {
  if (M.config.auth.strategy !== 'local-strategy' && M.config.auth.strategy !== 'local-ldap-strategy') {
    M.log.verbose('Test skipped because local auth strategy is not enabled');
    this.skip();
  }
  // Create a test user
  const userData = testData.users[0];

  // Create user via controller
  const users = await UserController.create(adminUser, userData);
  const user = users[0];


  // Create mock request object
  const req = {
    connection: {
      remoteAddress: '::1'
    }
  };

  // Create mock response object
  const res = {};

  const promises = [];
  for (let i = 0; i < 4; i++) {
    // Attempt to authenticate user with wrong password
    promises.push(localAuth.handleBasicAuth(req, res, user._id, 'wrongPassword')
    .should.eventually.be.rejectedWith('Invalid password.'));
  }

  // Wait for login failures to complete
  await Promise.all(promises);

  // Fail for the 5th time
  await localAuth.handleBasicAuth(req, res, user._id, 'wrongPassword')
  .should.eventually.be.rejectedWith(`Account '${user._id}' has been locked after `
    + 'exceeding allowed number of failed login attempts. '
    + 'Please contact your local administrator.');

  // Remove the test user
  await UserController.remove(adminUser, user._id);
}

/**
 * @description This function validates that the only non-archived admin user will NOT be archived
 * if that user enters five incorrect login attempts in fifteen minutes.
 */
async function noAdminLockout() {
  if (M.config.auth.strategy !== 'local-strategy' && M.config.auth.strategy !== 'local-ldap-strategy') {
    M.log.verbose('Test skipped because local auth strategy is not enabled');
    this.skip();
  }
  // This test will only work if there are no other active admins on the database
  // Skip this test if there are other active admins
  const admins = await User.find({ admin: true, archived: false });
  if (admins.length > 1) {
    M.log.verbose('Skipping noAdminLockout test; additional admins found on the database.');
    this.skip();
  }
  // Create mock request object
  const req = {
    connection: {
      remoteAddress: '::1'
    }
  };

  // Create mock response object
  const res = {};

  const promises = [];
  for (let i = 0; i < 4; i++) {
    // Attempt to authenticate admin user with wrong password
    promises.push(localAuth.handleBasicAuth(req, res, adminUser._id, 'wrongPassword')
    .should.eventually.be.rejectedWith('Invalid password.'));
  }

  // Wait for promises to complete
  await Promise.all(promises);

  // Expect specific error message for the only active admin user exceeding the login attempts
  await localAuth.handleBasicAuth(req, res, adminUser._id, 'wrongPassword')
  .should.eventually.be.rejectedWith('Incorrect login attempts exceeded '
    + 'on only active admin account.');

  // The admin user should not be archived
  const foundAdmin = await User.findOne({ _id: adminUser._id });
  foundAdmin.archived.should.equal(false);
}
