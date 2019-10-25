/**
 * @classification UNCLASSIFIED
 *
 * @module test.501a-user-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Austin Bieber
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE a user.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const APIController = M.require('controllers.api-controller');
const db = M.require('lib.db');
const jmi = M.require('lib.jmi-conversions');

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
   * Before: Run before all tests. Creates the admin user.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((reqUser) => {
      adminUser = reqUser;
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
   * After: Delete admin user.
   */
  after((done) => {
    // Delete test admin
    testUtils.removeTestAdmin()
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute tests */
  it('should get the requesting users data', whoami);
  it('should POST a user', postUser);
  it('should POST multiple users', postUsers);
  it('should PUT a user', putUser);
  it('should PUT multiple users', putUsers);
  it('should GET a user', getUser);
  it('should GET multiple users', getUsers);
  it('should GET all users', getAllUsers);
  it('should GET users through search text', searchUsers);
  it('should PATCH a user', patchUser);
  it('should PATCH multiple users', patchUsers);
  it('should PATCH a users password', patchUserPassword);
  it('should DELETE a user', deleteUser);
  it('should DELETE multiple users', deleteUsers);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock whoami request to get current user.
 *
 * @param {Function} done - The mocha callback.
 */
function whoami(done) {
  // Create request object
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUser = JSON.parse(_data);

    // Verify expected response
    // NOTE: Test admin does not have a name, custom data or email
    chai.expect(foundUser.username).to.equal(adminUser._id);
    chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs the requesting user
  APIController.whoami(req, res);
}

/**
 * @description Verifies mock POST request to create a single user.
 *
 * @param {Function} done - The mocha callback.
 */
function postUser(done) {
  // Create request object
  const userData = testData.users[0];
  const params = { username: userData.username };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, userData, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const createdUser = JSON.parse(_data);

    // Verify expected response
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);
    chai.expect(createdUser.lname).to.equal(userData.lname);
    chai.expect(createdUser.preferredName).to.equal(userData.preferredName);
    chai.expect(createdUser.email).to.equal(userData.email);
    chai.expect(createdUser.custom).to.deep.equal(userData.custom);
    chai.expect(createdUser.admin).to.equal(userData.admin);
    chai.expect(createdUser).to.not.have.any.keys('password', '_id', '__v');

    // Verify extra properties
    chai.expect(createdUser.createdOn).to.not.equal(null);
    chai.expect(createdUser.updatedOn).to.not.equal(null);
    chai.expect(createdUser.createdBy).to.equal(adminUser._id);
    chai.expect(createdUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdUser.archived).to.equal(false);
    chai.expect(createdUser).to.not.have.any.keys('archivedOn', 'archivedBy');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs a user
  APIController.postUser(req, res);
}

/**
 * @description Verifies mock POST request to create multiple users.
 *
 * @param {Function} done - The mocha callback.
 */
function postUsers(done) {
  // Create request object
  const userData = [
    testData.users[1],
    testData.users[2]
  ];
  const params = {};
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, userData, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const createdUsers = JSON.parse(_data);
    // Expect correct number of users to be created
    chai.expect(createdUsers.length).to.equal(userData.length);

    // Convert createdUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, createdUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const createdUser = jmi2Users[userDataObject.username];

      // Verify expected response
      chai.expect(createdUser.username).to.equal(userDataObject.username);
      chai.expect(createdUser.fname).to.equal(userDataObject.fname);
      chai.expect(createdUser.lname).to.equal(userDataObject.lname);
      chai.expect(createdUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(createdUser.email).to.equal(userDataObject.email);
      chai.expect(createdUser.custom).to.deep.equal(userDataObject.custom);
      chai.expect(createdUser.admin).to.equal(userDataObject.admin);
      chai.expect(createdUser).to.not.have.any.keys('password', '_id', '__v');

      // Verify extra properties
      chai.expect(createdUser.createdOn).to.not.equal(null);
      chai.expect(createdUser.updatedOn).to.not.equal(null);
      chai.expect(createdUser.createdBy).to.equal(adminUser._id);
      chai.expect(createdUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdUser.archived).to.equal(false);
      chai.expect(createdUser).to.not.have.any.keys('archivedOn', 'archivedBy');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs multiple users
  APIController.postUsers(req, res);
}

/**
 * @description Verifies mock PUT request to create/replace a single user.
 *
 * @param {Function} done - The mocha callback.
 */
function putUser(done) {
  // Create request object
  const userData = testData.users[0];
  const params = { username: userData.username };
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, userData, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const replacedUser = JSON.parse(_data);

    // Verify expected response
    chai.expect(replacedUser.username).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(userData.fname);
    chai.expect(replacedUser.lname).to.equal(userData.lname);
    chai.expect(replacedUser.preferredName).to.equal(userData.preferredName);
    chai.expect(replacedUser.email).to.equal(userData.email);
    chai.expect(replacedUser.custom).to.deep.equal(userData.custom);
    chai.expect(replacedUser.admin).to.equal(userData.admin);
    chai.expect(replacedUser).to.not.have.any.keys('password', '_id', '__v');

    // Verify extra properties
    chai.expect(replacedUser.createdOn).to.not.equal(null);
    chai.expect(replacedUser.updatedOn).to.not.equal(null);
    chai.expect(replacedUser.createdBy).to.equal(adminUser._id);
    chai.expect(replacedUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedUser.archived).to.equal(false);
    chai.expect(replacedUser).to.not.have.any.keys('archivedOn', 'archivedBy');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PUTs a user
  APIController.putUser(req, res);
}

/**
 * @description Verifies mock PUT request to create/replace multiple users.
 *
 * @param {Function} done - The mocha callback.
 */
function putUsers(done) {
  // Create request object
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const params = {};
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, userData, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const replacedUsers = JSON.parse(_data);
    // Expect correct number of users to be created
    chai.expect(replacedUsers.length).to.equal(userData.length);

    // Convert replacedUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, replacedUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const replacedUser = jmi2Users[userDataObject.username];

      // Verify expected response
      chai.expect(replacedUser.username).to.equal(userDataObject.username);
      chai.expect(replacedUser.fname).to.equal(userDataObject.fname);
      chai.expect(replacedUser.lname).to.equal(userDataObject.lname);
      chai.expect(replacedUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(replacedUser.email).to.equal(userDataObject.email);
      chai.expect(replacedUser.custom).to.deep.equal(userDataObject.custom);
      chai.expect(replacedUser.admin).to.equal(userDataObject.admin);
      chai.expect(replacedUser).to.not.have.any.keys('password', '_id', '__v');

      // Verify extra properties
      chai.expect(replacedUser.createdOn).to.not.equal(null);
      chai.expect(replacedUser.updatedOn).to.not.equal(null);
      chai.expect(replacedUser.createdBy).to.equal(adminUser._id);
      chai.expect(replacedUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedUser.archived).to.equal(false);
      chai.expect(replacedUser).to.not.have.any.keys('archivedOn', 'archivedBy');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PUTs multiple users
  APIController.putUsers(req, res);
}

/**
 * @description Verifies mock GET request to find a single user.
 *
 * @param {Function} done - The mocha callback.
 */
function getUser(done) {
  // Create request object
  const userData = testData.users[0];
  const params = { username: userData.username };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUser = JSON.parse(_data);

    // Verify expected response
    chai.expect(foundUser.username).to.equal(userData.username);
    chai.expect(foundUser.fname).to.equal(userData.fname);
    chai.expect(foundUser.lname).to.equal(userData.lname);
    chai.expect(foundUser.preferredName).to.equal(userData.preferredName);
    chai.expect(foundUser.email).to.equal(userData.email);
    chai.expect(foundUser.custom).to.deep.equal(userData.custom);
    chai.expect(foundUser.admin).to.equal(userData.admin);
    chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');

    // Verify extra properties
    chai.expect(foundUser.createdOn).to.not.equal(null);
    chai.expect(foundUser.updatedOn).to.not.equal(null);
    chai.expect(foundUser.createdBy).to.equal(adminUser._id);
    chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundUser.archived).to.equal(false);
    chai.expect(foundUser).to.not.have.any.keys('archivedOn', 'archivedBy');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs a user
  APIController.getUser(req, res);
}

/**
 * @description Verifies mock GET request to find multiple users.
 *
 * @param {Function} done - The mocha callback.
 */
function getUsers(done) {
  // Create request object
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const usernames = userData.map(u => u.username);
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, usernames, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUsers = JSON.parse(_data);
    // Expect correct number of users to be found
    chai.expect(foundUsers.length).to.equal(userData.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, foundUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];

      // Verify expected response
      chai.expect(foundUser.username).to.equal(userDataObject.username);
      chai.expect(foundUser.fname).to.equal(userDataObject.fname);
      chai.expect(foundUser.lname).to.equal(userDataObject.lname);
      chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(foundUser.email).to.equal(userDataObject.email);
      chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);
      chai.expect(foundUser.admin).to.equal(userDataObject.admin);
      chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');

      // Verify extra properties
      chai.expect(foundUser.createdOn).to.not.equal(null);
      chai.expect(foundUser.updatedOn).to.not.equal(null);
      chai.expect(foundUser.createdBy).to.equal(adminUser._id);
      chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundUser.archived).to.equal(false);
      chai.expect(foundUser).to.not.have.any.keys('archivedOn', 'archivedBy');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs multiple users
  APIController.getUsers(req, res);
}

/**
 * @description Verifies mock GET request to find all users.
 *
 * @param {Function} done - The mocha callback.
 */
function getAllUsers(done) {
  // Create request object
  const userData = [
    testData.adminUser,
    testData.users[0],
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUsers = JSON.parse(_data);
    // Expect correct number of users to be found
    chai.expect(foundUsers.length).to.be.at.least(userData.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, foundUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];
      // Ensure user was found
      chai.expect(foundUser).to.not.equal(undefined);

      if (foundUser.username !== adminUser._id) {
        // Verify expected response
        chai.expect(foundUser.username).to.equal(userDataObject.username);
        chai.expect(foundUser.fname).to.equal(userDataObject.fname);
        chai.expect(foundUser.lname).to.equal(userDataObject.lname);
        chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
        chai.expect(foundUser.email).to.equal(userDataObject.email);
        chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);
        chai.expect(foundUser.admin).to.equal(userDataObject.admin);
        chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');

        // Verify extra properties
        chai.expect(foundUser.createdOn).to.not.equal(null);
        chai.expect(foundUser.updatedOn).to.not.equal(null);
        chai.expect(foundUser.createdBy).to.equal(adminUser._id);
        chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(foundUser.archived).to.equal(false);
        chai.expect(foundUser).to.not.have.any.keys('archivedOn', 'archivedBy');
      }
      // Admin user special cases
      else {
        chai.expect(foundUser.username).to.equal(userDataObject.username);
        chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');
      }
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs all users
  APIController.getUsers(req, res);
}

/**
 * @description Verifies mock GET request to search users.
 *
 * @param {Function} done - The mocha callback.
 */
function searchUsers(done) {
  // Create request object
  const userData = [
    testData.users[0],
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const params = {};
  const body = [];
  const method = 'GET';
  const query = { q: `"${userData[0].fname}"` };
  const req = testUtils.createRequest(adminUser, params, body, method, query);

  // Create response object
  const res = [];
  testUtils.createResponse(res);

  // Verify the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const foundUsers = JSON.parse(_data);

    // Expect the search to find the users (currently all given the same first name)
    chai.expect(foundUsers.length).to.equal(userData.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, foundUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];
      // Ensure user was found
      chai.expect(foundUser).to.not.equal(undefined);

      // Verify expected response
      chai.expect(foundUser.username).to.equal(userDataObject.username);
      chai.expect(foundUser.fname).to.equal(userDataObject.fname);
      chai.expect(foundUser.lname).to.equal(userDataObject.lname);
      chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(foundUser.email).to.equal(userDataObject.email);
      chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);
      chai.expect(foundUser.admin).to.equal(userDataObject.admin);
      chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');

      // Verify extra properties
      chai.expect(foundUser.createdOn).to.not.equal(null);
      chai.expect(foundUser.updatedOn).to.not.equal(null);
      chai.expect(foundUser.createdBy).to.equal(adminUser._id);
      chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundUser.archived).to.equal(false);
      chai.expect(foundUser).to.not.have.any.keys('archivedOn', 'archivedBy');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // Searches for a user
  APIController.searchUsers(req, res);
}

/**
 * @description Verifies mock PATCH request to update a single user.
 *
 * @param {Function} done - The mocha callback.
 */
function patchUser(done) {
  // Create request object
  const userData = testData.users[0];
  const updateObj = {
    username: userData.username,
    fname: 'Updated First Name'
  };
  const params = { username: userData.username };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, updateObj, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const updatedUser = JSON.parse(_data);

    // Verify expected response
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(updateObj.fname);
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.preferredName).to.equal(userData.preferredName);
    chai.expect(updatedUser.email).to.equal(userData.email);
    chai.expect(updatedUser.custom).to.deep.equal(userData.custom);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser).to.not.have.any.keys('password', '_id', '__v');

    // Verify extra properties
    chai.expect(updatedUser.createdOn).to.not.equal(null);
    chai.expect(updatedUser.updatedOn).to.not.equal(null);
    chai.expect(updatedUser.createdBy).to.equal(adminUser._id);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedUser.archived).to.equal(false);
    chai.expect(updatedUser).to.not.have.any.keys('archivedOn', 'archivedBy');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs a user
  APIController.patchUser(req, res);
}

/**
 * @description Verifies mock PATCH request to update multiple users.
 *
 * @param {Function} done - The mocha callback.
 */
function patchUsers(done) {
  // Create request object
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const updateObj = userData.map(u => ({
    username: u.username,
    fname: 'Updated First Name'
  }));
  const params = {};
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, updateObj, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const updatedUsers = JSON.parse(_data);
    // Expect correct number of users to be updated
    chai.expect(updatedUsers.length).to.equal(userData.length);

    // Convert updatedUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, updatedUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const updatedUser = jmi2Users[userDataObject.username];

      // Verify expected response
      chai.expect(updatedUser.username).to.equal(userDataObject.username);
      chai.expect(updatedUser.fname).to.equal('Updated First Name');
      chai.expect(updatedUser.lname).to.equal(userDataObject.lname);
      chai.expect(updatedUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(updatedUser.email).to.equal(userDataObject.email);
      chai.expect(updatedUser.custom).to.deep.equal(userDataObject.custom);
      chai.expect(updatedUser.admin).to.equal(userDataObject.admin);
      chai.expect(updatedUser).to.not.have.any.keys('password', '_id', '__v');

      // Verify extra properties
      chai.expect(updatedUser.createdOn).to.not.equal(null);
      chai.expect(updatedUser.updatedOn).to.not.equal(null);
      chai.expect(updatedUser.createdBy).to.equal(adminUser._id);
      chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedUser.archived).to.equal(false);
      chai.expect(updatedUser).to.not.have.any.keys('archivedOn', 'archivedBy');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs multiple users
  APIController.patchUsers(req, res);
}

/**
 * @description Verifies mock PATCH request to update a users password.
 *
 * @param {Function} done - The mocha callback.
 */
function patchUserPassword(done) {
  // Create request object
  const userData = testData.users[0];
  userData._id = userData.username;
  const body = {
    password: 'NewPass1234?',
    confirmPassword: 'NewPass1234?',
    oldPassword: userData.password
  };
  const params = { username: userData.username };
  const method = 'PATCH';
  const req = testUtils.createRequest(userData, params, body, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const updatedUser = JSON.parse(_data);

    // Verify expected response
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal('Updated First Name');
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.preferredName).to.equal(userData.preferredName);
    chai.expect(updatedUser.email).to.equal(userData.email);
    chai.expect(updatedUser.custom).to.deep.equal(userData.custom);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser).to.not.have.any.keys('password', '_id', '__v');

    // Verify extra properties
    chai.expect(updatedUser.createdOn).to.not.equal(null);
    chai.expect(updatedUser.updatedOn).to.not.equal(null);
    chai.expect(updatedUser.createdBy).to.equal(adminUser._id);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedUser.archived).to.equal(false);
    chai.expect(updatedUser).to.not.have.any.keys('archivedOn', 'archivedBy');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs a users password
  APIController.patchPassword(req, res);
}

/**
 * @description Verifies mock DELETE request to delete a single user.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteUser(done) {
  // Create request object
  const userData = testData.users[0];
  const params = { username: userData.username };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const deletedUsername = JSON.parse(_data);

    // Verify expected response
    chai.expect(deletedUsername).to.equal(userData.username);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs a user
  APIController.deleteUser(req, res);
}

/**
 * @description Verifies mock DELETE request to delete multiple user.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteUsers(done) {
  // Create request object
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const params = {};
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, userData.map(u => u.username), method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const deletedUsernames = JSON.parse(_data);
    chai.expect(deletedUsernames.length).to.equal(userData.length);

    // Verify expected response
    chai.expect(deletedUsernames).to.have.members(userData.map(u => u.username));

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs multiple users
  APIController.deleteUsers(req, res);
}
