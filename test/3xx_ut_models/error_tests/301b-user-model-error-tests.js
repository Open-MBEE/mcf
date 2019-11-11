/**
 * @classification UNCLASSIFIED
 *
 * @module test.301b-user-model-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests for expected errors within the user model.
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
const db = M.require('lib.db');
const validators = M.require('lib.validators');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const customValidators = M.config.validators || {};

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: runs before all tests. Open database connection.
   */
  before(async () => {
    try {
      db.connect();
    }
    catch (error) {
      chai.expect(error.message).to.equal(null);
    }
  });

  /**
   * After: runs after all tests. Close database connection.
   */
  after(async () => {
    try {
      db.disconnect();
    }
    catch (error) {
      chai.expect(error.message).to.equal(null);
    }
  });

  /* Execute the tests */
  it('should reject when a username is too short', usernameTooShort);
  it('should reject when a username is too long', usernameTooLong);
  it('should reject with an invalid username', usernameInvalid);
  it('should reject with an invalid first name', fnameInvalid);
  it('should reject with an invalid last name', lnameInvalid);
  it('should reject with an invalid preferred name', preferredNameInvalid);
  it('should reject if the admin field is not a boolean', adminNotBoolean);
  it('should reject if the provider field is not a string', providerNotString);
  it('should reject if no username (_id) is provided', usernameNotProvided);
  it('should reject with an invalid email', emailInvalid);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create a user with a username that is too short.
 */
async function usernameTooShort() {
  try {
    const userData = Object.assign({}, testData.users[0]);

    // Change username to be too short.
    userData._id = 'ab';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + `validation failed: _id: Username length [${userData._id.length}] must `
      + 'not be less than 3 characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with a username that is too long.
 */
async function usernameTooLong() {
  try {
    const userData = Object.assign({}, testData.users[0]);

    // Change username to be too long.
    userData._id = 'usernamewiththirtysevencharacters1234';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + `validation failed: _id: Username length [${userData._id.length}] must `
      + `not be more than ${validators.user.usernameLength} characters.`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with an invalid username.
 */
async function usernameInvalid() {
  if (customValidators.hasOwnProperty('user_username')) {
    M.log.verbose('Skipping valid username test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const userData = Object.assign({}, testData.users[0]);

    // Change username to be invalid
    userData._id = 'Inva3l!d_UserN&me';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + `validation failed: _id: Invalid username [${userData._id}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with an invalid first name.
 */
async function fnameInvalid() {
  if (customValidators.hasOwnProperty('user_fname')) {
    M.log.verbose('Skipping valid first name test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const userData = Object.assign({}, testData.users[0]);
    userData._id = userData.username;

    // Change first name to be invalid
    userData.fname = 'Inva3l!d_FirstN&me';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + `validation failed: fname: Invalid first name [${userData.fname}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with an invalid last name.
 */
async function lnameInvalid() {
  if (customValidators.hasOwnProperty('user_lname')) {
    M.log.verbose('Skipping valid last name test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const userData = Object.assign({}, testData.users[0]);
    userData._id = userData.username;

    // Change last name to be invalid
    userData.lname = 'Inva3l!d_LastN&me';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + `validation failed: lname: Invalid last name [${userData.lname}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}


/**
 * @description Attempts to create a user with an invalid preferred name.
 */
async function preferredNameInvalid() {
  if (customValidators.hasOwnProperty('user_fname')) {
    M.log.verbose('Skipping valid preferred name test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const userData = Object.assign({}, testData.users[0]);
    userData._id = userData.username;

    // Change preferred name to be invalid
    userData.preferredName = 'Inva3l!d_PreferredN&me';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + 'validation failed: preferredName: Invalid preferred name '
      + `[${userData.preferredName}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with an admin that's not a boolean.
 */
async function adminNotBoolean() {
  try {
    const userData = Object.assign({}, testData.users[0]);
    userData._id = userData.username;

    // Change admin to not be a boolean.
    userData.admin = 123;
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + 'validation failed: admin: Cast to Boolean failed for value "123" at '
      + 'path "admin"');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with a provider that's not a string.
 */
async function providerNotString() {
  try {
    const userData = Object.assign({}, testData.users[0]);
    userData._id = userData.username;

    // Change provider to not be a string.
    userData.provider = {};
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + 'validation failed: provider: Cast to String failed for value "{}" at '
      + 'path "provider"');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with no username (_id).
 */
async function usernameNotProvided() {
  try {
    const userData = Object.assign({}, testData.users[0]);
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + 'validation failed: _id: Username is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a user with an invalid email.
 */
async function emailInvalid() {
  if (customValidators.hasOwnProperty('user_email')) {
    M.log.verbose('Skipping valid email test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const userData = Object.assign({}, testData.users[0]);
    userData._id = userData.username;

    // Change email to be invalid
    userData.email = 'invalid_email';
    delete userData.id;

    // Expect insertMany() to fail with specific error message
    await User.insertMany(userData).should.eventually.be.rejectedWith('User '
      + `validation failed: email: Invalid email [${userData.email}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
