/**
 * @classification UNCLASSIFIED
 *
 * @module test.503b-project-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests for expected errors in mock requests of project endpoints in the API
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

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
let adminUser = null;
let org;

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
   * a test non admin user, and a test org.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
      org = await testUtils.createTestOrg(adminUser);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Removes the test user and org.
   */
  after(async () => {
    try {
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  // ------------- No Requesting User -------------
  it('should reject a GET projects request with no requesting user', noReqUser('getProjects'));
  it('should reject a GET all projects request with no requesting user', noReqUser('getAllProjects'));
  it('should reject a POST projects request with no requesting user', noReqUser('postProjects'));
  it('should reject a PATCH projects request with no requesting user', noReqUser('patchProjects'));
  it('should reject a PUT projects request with no requesting user', noReqUser('putProjects'));
  it('should reject a DELETE projects request with no requesting user', noReqUser('deleteProjects'));
  // ------------- Invalid options -------------
  it('should reject a GET projects request with invalid options', invalidOptions('getProjects'));
  it('should reject a GET all projects request with invalid options', invalidOptions('getAllProjects'));
  it('should reject a POST projects request with invalid options', invalidOptions('postProjects'));
  it('should reject a PATCH projects request with invalid options', invalidOptions('patchProjects'));
  it('should reject a PUT projects request with invalid options', invalidOptions('putProjects'));
  it('should reject a DELETE projects request with invalid options', invalidOptions('deleteProjects'));
  // ------- Non matching ids in body vs url -------
  it('should reject a POST project request with conflicting ids in the body and url', conflictingIDs('postProjects'));
  it('should reject a PATCH project request with conflicting ids in the body and url', conflictingIDs('patchProjects'));
  it('should reject a PUT project request with conflicting ids in the body and url', conflictingIDs('putProjects'));
  // ------------- 404 Not Found -------------
  it('should return 404 for a GET projects request that returned no results', notFound('getProjects'));
  it('should return 404 for a GET all projects request that returned no results', notFound('getAllProjects'));
  it('should return 404 for a PATCH projects request for nonexistent projects', notFound('patchProjects'));
  it('should return 404 for a DELETE projects request for nonexistent projects', notFound('deleteProjects'));
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

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
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

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
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
  const body = { id: 'testproject001' };
  const params = { projectid: 'testproject01' };

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
      _data.should.equal('Project ID in the body does not match ID in the params.');

      // Expect the statusCode to be 400
      res.statusCode.should.equal(400);

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
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
    // Get an unused project id
    const id = testData.projects[3].id;
    // Parse the method
    const method = testUtils.parseMethod(endpoint);
    // Body must be an array of ids for get and delete; key-value pair for anything else
    const body = (endpoint === 'deleteProjects' || endpoint === 'getProjects')
      ? [id] : { id: id };
    const params = { orgid: org._id };
    // Add in a params field for singular project endpoints
    if (!endpoint.includes('Projects') && endpoint.includes('Project')) {
      params.projectid = id;
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

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
  };
}
