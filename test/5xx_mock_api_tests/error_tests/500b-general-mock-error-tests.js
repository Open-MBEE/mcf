/**
 * @classification UNCLASSIFIED
 *
 * @module test.500b-general-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests that errors occur when expected from general API
 * endpoints.
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
const next = testUtils.next;
let adminUser = null;
let nonAdminUser = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Creates a global admin user and non-admin user.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
      nonAdminUser = await testUtils.createNonAdminUser();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Delete test users.
   */
  after(async () => {
    try {
      await testUtils.removeTestAdmin();
      await testUtils.removeNonAdminUser();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  it('should reject a GET logs request with no requesting user', noReqUser('getLogs'));
  it('should reject a GET logs request with invalid options', invalidOptions('getLogs'));
  it('should reject a GET logs request when a non-admin user makes the request', getLogsNonAdmin);
  it('should reject a GET logs request with a limit of 0', limit0);
});

/* --------------------( Tests )-------------------- */
/**
 * @description A constructor for a dynamic mocha-compatible function that can
 * test the response of any api endpoint to a request missing a requestingUser.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api
 * endpoint.
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
 * @description A constructor for a dynamic mocha-compatible function that can
 * test the response of any api endpoint to a request that has invalid options.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api
 * endpoint.
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
 * @description Verifies that a GET logs request made by a non admin user
 * returns the correct error response.
 *
 * @param {Function} done - The mocha callback.
 */
function getLogsNonAdmin(done) {
  // Create request object
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(nonAdminUser, params, {}, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Expect a 403 status and specific error message
    res.statusCode.should.equal(403);
    _data.should.equal('User does not have permission to view system logs.');

    done();
  };

  // GET the system logs
  APIController.getLogs(req, res, next(req, res));
}

/**
 * @description Verifies that a GET logs request with a limit of 0 returns the
 * correct error response.
 *
 * @param {Function} done - The mocha callback.
 */
function limit0(done) {
  // Create request object
  const params = {};
  const method = 'GET';
  const query = { limit: 0 };
  const req = testUtils.createRequest(adminUser, params, {}, method, query);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Expect a 400 status and specific error message
    res.statusCode.should.equal(400);
    _data.should.equal('A limit of 0 is not allowed.');

    done();
  };

  // GET the system logs
  APIController.getLogs(req, res, next(req, res));
}
