/**
 * @classification UNCLASSIFIED
 *
 * @module test.505b-element-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests for expected errors in mock requests of element endpoints in the API
 * controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const APIController = M.require('controllers.api-controller');
const db = M.require('db');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org;
let project;
let projID;
const branchID = 'master';

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Connects to the database, creates a test admin user,
   * a test non admin user, a test org, and a test project.
   */
  before(async () => {
    try {
      await db.connect();
      adminUser = await testUtils.createTestAdmin();
      await testUtils.createNonAdminUser();
      org = await testUtils.createTestOrg(adminUser);
      project = await testUtils.createTestProject(adminUser, org._id);
      projID = project._id;
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Removes the test users and org and disconnects from the
   * database.
   */
  after(async () => {
    try {
      await testUtils.removeTestAdmin();
      await testUtils.removeNonAdminUser();
      await testUtils.removeTestOrg();
      await db.disconnect();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  // ------------- No Requesting User -------------
  it('should reject a GET elements request with no requesting user', noReqUser('getElements'));
  it('should reject a GET element request with no requesting user', noReqUser('getElement'));
  it('should reject a GET (Search) elements request with no requesting user', noReqUser('searchElements'));
  it('should reject a POST elements request with no requesting user', noReqUser('postElements'));
  it('should reject a POST element request with no requesting user', noReqUser('postElement'));
  it('should reject a PATCH elements request with no requesting user', noReqUser('patchElements'));
  it('should reject a PATCH element request with no requesting user', noReqUser('patchElement'));
  it('should reject a PUT elements request with no requesting user', noReqUser('putElements'));
  it('should reject a PUT element request with no requesting user', noReqUser('putElement'));
  it('should reject a DELETE elements request with no requesting user', noReqUser('deleteElements'));
  it('should reject a DELETE element request with no requesting user', noReqUser('deleteElement'));
  // ------------- Invalid options -------------
  it('should reject a GET elements request with invalid options', invalidOptions('getElements'));
  it('should reject a GET element request with invalid options', invalidOptions('getElement'));
  it('should reject a GET (Search) elements request with invalid options', invalidOptions('searchElements'));
  it('should reject a POST elements request with invalid options', invalidOptions('postElements'));
  it('should reject a POST element request with invalid options', invalidOptions('postElement'));
  it('should reject a PATCH elements request with invalid options', invalidOptions('patchElements'));
  it('should reject a PATCH element request with invalid options', invalidOptions('patchElement'));
  it('should reject a PUT elements request with invalid options', invalidOptions('putElements'));
  it('should reject a PUT element request with invalid options', invalidOptions('putElement'));
  it('should reject a DELETE elements request with invalid options', invalidOptions('deleteElements'));
  it('should reject a DELETE element request with invalid options', invalidOptions('deleteElement'));
  // ------- Non matching ids in body vs url -------
  it('should reject a POST element request with conflicting ids in the body and url', conflictingIDs('postElement'));
  it('should reject a PATCH element request with conflicting ids in the body and url', conflictingIDs('patchElement'));
  it('should reject a PUT element request with conflicting ids in the body and url', conflictingIDs('putElement'));
  // ------------- 404 Not Found -------------
  it('should return 404 for a GET elements request that returned no results', notFound('getElements'));
  it('should return 404 for a GET element request that returned no results', notFound('getElement'));
  it('should return 404 for a GET (Search) elements request for nonexistent branches', notFound('searchElements'));
  it('should return 404 for a PATCH elements request for nonexistent branches', notFound('patchElements'));
  it('should return 404 for a PATCH element request for a nonexistent branch', notFound('patchElement'));
  it('should return 404 for a PUT elements request for nonexistent branches', notFound('putElements'));
  it('should return 404 for a PUT element request for a nonexistent branch', notFound('putElement'));
  it('should return 404 for a DELETE elements request for nonexistent branches', notFound('deleteElements'));
  it('should return 404 for a DELETE element request for a nonexistent branch', notFound('deleteElement'));
  // ------------- No arrays in singular endpoints -------------
  it('should reject a POST singular element request containing an array in the body', noArrays('postElement'));
  it('should reject a PATCH singular element request containing an array in the body', noArrays('patchElement'));
  it('should reject a PUT singular element request containing an array in the body', noArrays('putElement'));
});

/* --------------------( Tests )-------------------- */
/**
 * @description A test factory function that generates a mocha-compatible test function that can
 * test the response of any api endpoint to a request missing a requestingUser.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function noReqUser(endpoint) {
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  const params = {};
  const body = {};

  // Create the customized mocha function
  return function(done) {
    // Create request object
    const req = testUtils.createRequest(null, params, body, method);

    // Create response object
    const res = {};
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Expect an error message
      _data.should.equal('Request Failed');

      // Expect the statusCode to be 500
      res.statusCode.should.equal(500);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // Sends the mock request
    APIController[endpoint](req, res);
  };
}

/**
 * @description A test factory function that generates a mocha-compatible test function that can
 * test the response of any api endpoint to a request that has invalid options.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function invalidOptions(endpoint) {
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  const params = {};
  const body = {};

  // Create the customized mocha function
  return function(done) {
    // Create request object
    const req = testUtils.createRequest(adminUser, params, body, method);
    req.query = { invalid: 'invalid option' };

    // Create response object
    const res = {};
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Expect an error message
      _data.should.equal('Invalid parameter: invalid');

      // Expect the statusCode to be 400
      res.statusCode.should.equal(400);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // Sends the mock request
    APIController[endpoint](req, res);
  };
}

/**
 * @description A test factory function that generates a mocha-compatible test function that can
 * test the response of singular api endpoints to a request that has conflicting ids in the body and
 * params.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function conflictingIDs(endpoint) {
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  const body = { id: 'testelem001' };
  const params = { elementid: 'testelem01' };

  // Create the customized mocha function
  return function(done) {
    // Create request object
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Create response object
    const res = {};
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Expect an error message
      _data.should.equal('Element ID in the body does not match ID in the params.');

      // Expect the statusCode to be 400
      res.statusCode.should.equal(400);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // Sends the mock request
    APIController[endpoint](req, res);
  };
}

/**
 * @description A test factory function that generates a mocha-compatible test function that can
 * test the response of any api endpoint to a request for an item that doesn't exist.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function notFound(endpoint) {
  return function(done) {
    // Get an unused element id
    const id = testData.elements[3].id;
    // Parse the method
    const method = testUtils.parseMethod(endpoint);
    // Body must be an array of ids for get and delete; key-value pair for anything else
    const body = (endpoint === 'deleteElements' || endpoint === 'getElements')
      ? [id] : { id: id };
    const params = { orgid: org._id, projectid: projID, branchid: branchID };
    // Add in a params field for singular element endpoints
    if (!endpoint.includes('Elements') && endpoint.includes('Element')) {
      params.elementid = id;
    }

    // Create request object
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Create response object
    const res = {};
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Expect the statusCode to be 404
      res.statusCode.should.equal(404);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // Sends the mock request
    APIController[endpoint](req, res);
  };
}

/**
 * @description A test factory function that generates a mocha-compatible test function that can
 * test the response of singular api endpoints given an array in the body.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function noArrays(endpoint) {
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  const body = [];
  const params = {};

  return function(done) {
    // Create request object
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Create response object
    const res = {};
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Expect an error message
      _data.should.equal('Input cannot be an array');

      // Expect the statusCode to be 400
      res.statusCode.should.equal(400);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // Sends the mock request
    APIController[endpoint](req, res);
  };
}
