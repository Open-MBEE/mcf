/**
 * Classification: UNCLASSIFIED
 *
 * @module test.601a-user-api-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests the user API controller functionality:
 * GET, POST, PATCH, and DELETE a user.
 */

// Node modules
const chai = require('chai');
const request = require('request');
const path = require('path');

// MBEE modules
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
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
   * Before: Run before all tests. Find
   * non-admin user and elevate to admin user.
   */
  before((done) => {
    // Open the database connection
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      adminUser = _adminUser;
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
  it('should GET the requesting users data', whoami);
  it('should POST a user', postUser);
  it('should POST multiple users', postUsers);
  it('should GET a user', getUser);
  it('should GET multiple users', getUsers);
  it('should GET all users', getAllUsers);
  it('should PATCH a user', patchUser);
  it('should PATCH multiple users', patchUsers);
  it('should PATCH a users password', patchUserPassword);
  it('should DELETE a user', deleteUser);
  it('should DELETE multiple users', deleteUsers);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Makes a GET request to /api/users/whoami. Verifies return of
 * requesting user from API.
 */
function whoami(done) {
  const userData = testData.adminUser;
  request({
    url: `${test.url}/api/users/whoami`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundUser = JSON.parse(body);

    // NOTE: Test admin does not have a name, custom data or email
    chai.expect(foundUser.username).to.equal(userData.username);
    chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');
    done();
  });
}

/**
 * @description Verifies POST /api/users/:username creates a user.
 */
function postUser(done) {
  const userData = testData.users[0];
  request({
    url: `${test.url}/api/users/${userData.username}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(userData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdUser = JSON.parse(body);

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
    chai.expect(createdUser.createdBy).to.equal(adminUser.username);
    chai.expect(createdUser.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(createdUser).to.not.have.any.key('archived', 'archivedOn', 'archivedBy');
    done();
  });
}

/**
 * @description Verifies POST /api/users creates multiple users.
 */
function postUsers(done) {
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  request({
    url: `${test.url}/api/users`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(userData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdUsers = JSON.parse(body);
    // Expect correct number of users to be created
    chai.expect(createdUsers.length).to.equal(userData.length);

    // Convert createdUsers to JMI type 2 for easier lookup
    const jmi2Users = utils.convertJMI(1, 2, createdUsers, 'username');
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
      chai.expect(createdUser.createdBy).to.equal(adminUser.username);
      chai.expect(createdUser.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(createdUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
    });
    done();
  });
}

/**
 * @description Verifies GET /api/users/:username finds a user.
 */
function getUser(done) {
  const userData = testData.users[0];
  request({
    url: `${test.url}/api/users/${userData.username}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundUser = JSON.parse(body);

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
    chai.expect(foundUser.createdBy).to.equal(adminUser.username);
    chai.expect(foundUser.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(foundUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
    done();
  });
}

/**
 * @description Verifies GET /api/users finds multiple users.
 */
function getUsers(done) {
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  request({
    url: `${test.url}/api/users`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET',
    body: JSON.stringify(userData.map(u => u.username))
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundUsers = JSON.parse(body);
    // Expect correct number of users to be found
    chai.expect(foundUsers.length).to.equal(userData.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = utils.convertJMI(1, 2, foundUsers, 'username');
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
      chai.expect(foundUser.createdBy).to.equal(adminUser.username);
      chai.expect(foundUser.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
    });
    done();
  });
}

/**
 * @description Verifies GET /api/users finds all users if no ids are provided.
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
  request({
    url: `${test.url}/api/users`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundUsers = JSON.parse(body);
    // Expect correct number of users to be found
    chai.expect(foundUsers.length).to.be.at.least(userData.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = utils.convertJMI(1, 2, foundUsers, 'username');
    // Loops through each user data object
    userData.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];
      // Ensure user was found
      chai.expect(foundUser).to.not.equal(undefined);

      if (foundUser.username !== adminUser.username) {
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
        chai.expect(foundUser.createdBy).to.equal(adminUser.username);
        chai.expect(foundUser.lastModifiedBy).to.equal(adminUser.username);
        chai.expect(foundUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
      }
      // Admin user special cases
      else {
        chai.expect(foundUser.username).to.equal(userDataObject.username);
        chai.expect(foundUser).to.not.have.any.keys('password', '_id', '__v');
      }
    });
    done();
  });
}

/**
 * @description Verifies PATCH /api/users/:username updates a user.
 */
function patchUser(done) {
  const userData = testData.users[0];
  const updateObj = {
    username: userData.username,
    fname: 'Updated First Name'
  };
  request({
    url: `${test.url}/api/users/${userData.username}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(updateObj)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedUser = JSON.parse(body);

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
    chai.expect(updatedUser.createdBy).to.equal(adminUser.username);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(updatedUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
    done();
  });
}

/**
 * @description Verifies PATCH /api/users updates multiple users.
 */
function patchUsers(done) {
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  const updateObj = userData.map(u => ({
    username: u.username,
    fname: 'Updated First Name'
  }));
  request({
    url: `${test.url}/api/users`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(updateObj)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedUsers = JSON.parse(body);
    // Expect correct number of users to be updated
    chai.expect(updatedUsers.length).to.equal(userData.length);

    // Convert updatedUsers to JMI type 2 for easier lookup
    const jmi2Users = utils.convertJMI(1, 2, updatedUsers, 'username');
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
      chai.expect(updatedUser.createdBy).to.equal(adminUser.username);
      chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(updatedUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
    });
    done();
  });
}

/**
 * @description Verifies mock PATCH request to update a users password.
 */
function patchUserPassword(done) {
  // Create request object
  const userData = testData.users[0];
  const updateObj = {
    password: 'NewPass1234?',
    confirmPassword: 'NewPass1234?',
    oldPassword: userData.password
  };
  request({
    url: `${test.url}/api/users/${userData.username}/password`,
    headers: testUtils.getHeaders('application/json', userData),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(updateObj)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedUser = JSON.parse(body);

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
    chai.expect(updatedUser.createdBy).to.equal(adminUser.username);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(updatedUser).to.not.have.any.keys('archived', 'archivedOn', 'archivedBy');
    done();
  });
}

/**
 * @description Verifies DELETE /api/users/:username deletes a user.
 */
function deleteUser(done) {
  const userData = testData.users[0];
  request({
    url: `${test.url}/api/users/${userData.username}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedUsername = JSON.parse(body);

    // Verify expected response
    chai.expect(deletedUsername).to.equal(userData.username);
    done();
  });
}

/**
 * @description Verifies DELETE /api/users/ deletes multiple users.
 */
function deleteUsers(done) {
  const userData = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];
  request({
    url: `${test.url}/api/users`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE',
    body: JSON.stringify(userData.map(u => u.username))
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedUsernames = JSON.parse(body);
    chai.expect(deletedUsernames.length).to.equal(userData.length);

    // Verify expected response
    chai.expect(deletedUsernames).to.have.members(userData.map(u => u.username));
    done();
  });
}
