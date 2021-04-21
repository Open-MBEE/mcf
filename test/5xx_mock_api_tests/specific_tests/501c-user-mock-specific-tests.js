/**
 * @classification UNCLASSIFIED
 *
 * @module test.501c-user-mock-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE users.
 */

// Node modules
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// NPM modules
const chai = require('chai');

// MBEE modules
const UserController = M.require('controllers.user-controller');
const APIController = M.require('controllers.api-controller');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
const filepath = path.join(M.root, '/test/testzip.json');
let adminUser = null;
let nonAdminUser = null;
let org = null;


/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Creates an admin user and org.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create test user
      nonAdminUser = await testUtils.createNonAdminUser();
      // Create organization
      org = await testUtils.createTestOrg(adminUser);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove test org, admin, and the test file.
   */
  after(async () => {
    try {
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
      await testUtils.removeNonAdminUser();
      await fs.unlinkSync(filepath);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  it('should PATCH another user\'s password as admin', patchOtherPassword);
  it('should post users from an uploaded gzip file', postGzip);
  it('should put users from an uploaded gzip file', putGzip);
  it('should patch users from an uploaded gzip file', patchGzip);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock PATCH request to update another user's password as
 * an admin.
 *
 * @param {Function} done - The mocha callback.
 */
function patchOtherPassword(done) {
  // Create request object
  const userData = testData.users[1];

  const body = {
    password: 'NewPass123456?',
    confirmPassword: 'NewPass123456?',
    oldPassword: userData.password
  };
  const params = { username: userData.username };
  const method = 'PATCH';
  const req = testUtils.createRequest(nonAdminUser, params, body, method);

  req.user = adminUser;

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Convert response to JSON
    const updatedUser = JSON.parse(_data);

    // Verify expected response
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(userData.fname);
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser).to.not.have.any.keys('password', '_id', '__v');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PATCH a user's password
  APIController.patchPassword(req, res, next(req, res));
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create users.
 *
 * @param {Function} done - The mocha callback.
 */
function postGzip(done) {
  const userData = testData.users[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(userData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org.id
  };
  const body = {};
  const method = 'POST';
  const query = {};
  const headers = 'application/gzip';

  // Create a read stream of the zip file and give it request-like attributes
  const req = testUtils.createReadStreamRequest(adminUser, params, body, method, query,
    filepath, headers);
  req.headers['accept-encoding'] = 'gzip';

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const createdUsers = JSON.parse(_data);
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);
    chai.expect(createdUser.lname).to.equal(userData.lname);
    chai.expect(createdUser.custom || {}).to.deep.equal(userData.custom);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Remove the test user
    UserController.remove(adminUser, userData.username)
    .then(() => {
      done();
    });
  };

  // POST a user
  APIController.postUsers(req, res, next(req, res));
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create or replace users.
 *
 * @param {Function} done - The mocha callback.
 */
function putGzip(done) {
  const userData = testData.users[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(userData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org.id
  };
  const body = {};
  const method = 'PUT';
  const query = {};
  const headers = 'application/gzip';

  // Create a read stream of the zip file and give it request-like attributes
  const req = testUtils.createReadStreamRequest(adminUser, params, body, method, query,
    filepath, headers);
  req.headers['accept-encoding'] = 'gzip';

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const createdUsers = JSON.parse(_data);
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);
    chai.expect(createdUser.lname).to.equal(userData.lname);
    chai.expect(createdUser.custom || {}).to.deep.equal(userData.custom);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Remove the test user
    UserController.remove(adminUser, userData.username)
    .then(() => {
      done();
    });
  };

  // PUTs a user
  APIController.putUsers(req, res, next(req, res));
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to update users.
 *
 * @param {Function} done - The mocha callback.
 */
function patchGzip(done) {
  const userData = testData.users[0];

  // Create the user to be patched
  UserController.create(adminUser, userData)
  .then(() => {
    // create updates to the user
    userData.fname = 'updated';
    userData.password = undefined;

    // Create a gzip file for testing
    const zippedData = zlib.gzipSync(JSON.stringify(userData));
    fs.appendFileSync((filepath), zippedData);

    // Initialize the request attributes
    const params = {
      orgid: org.id
    };
    const body = {};
    const method = 'PATCH';
    const query = {};
    const headers = 'application/gzip';

    // Create a read stream of the zip file and give it request-like attributes
    const req = testUtils.createReadStreamRequest(adminUser, params, body, method, query,
      filepath, headers);
    req.headers['accept-encoding'] = 'gzip';

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const createdUsers = JSON.parse(_data);
      const createdUser = createdUsers[0];

      // Verify user updated properly
      chai.expect(createdUser.username).to.equal(userData.username);
      chai.expect(createdUser.fname).to.equal(userData.fname);
      chai.expect(createdUser.lname).to.equal(userData.lname);
      chai.expect(createdUser.custom || {}).to.deep.equal(userData.custom);

      // Clear the data used for testing
      fs.truncateSync(filepath);

      // Remove the test user
      UserController.remove(adminUser, userData.username)
      .then(() => {
        done();
      });
    };

    // PATCH a user
    APIController.patchUsers(req, res, next(req, res));
  });
}
