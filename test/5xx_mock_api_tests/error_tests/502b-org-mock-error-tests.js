/**
 * @classification UNCLASSIFIED
 *
 * @module test.502b-org-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests for expected errors in mock requests of org endpoints in the API
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

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Creates test admin user.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Removes test admin user.
   */
  after(async () => {
    try {
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
  it('should reject a GET orgs request with no requesting user', noReqUser('getOrgs'));
  it('should reject a GET org request with no requesting user', noReqUser('getOrg'));
  it('should reject a POST orgs request with no requesting user', noReqUser('postOrgs'));
  it('should reject a POST org request with no requesting user', noReqUser('postOrg'));
  it('should reject a PATCH orgs request with no requesting user', noReqUser('patchOrgs'));
  it('should reject a PATCH org request with no requesting user', noReqUser('patchOrg'));
  it('should reject a PUT orgs request with no requesting user', noReqUser('putOrgs'));
  it('should reject a PUT org request with no requesting user', noReqUser('putOrg'));
  it('should reject a DELETE orgs request with no requesting user', noReqUser('deleteOrgs'));
  it('should reject a DELETE org request with no requesting user', noReqUser('deleteOrg'));
  // ------------- Invalid options -------------
  it('should reject a GET orgs request with invalid options', invalidOptions('getOrgs'));
  it('should reject a GET org request with invalid options', invalidOptions('getOrg'));
  it('should reject a POST orgs request with invalid options', invalidOptions('postOrgs'));
  it('should reject a POST org request with invalid options', invalidOptions('postOrg'));
  it('should reject a PATCH orgs request with invalid options', invalidOptions('patchOrgs'));
  it('should reject a PATCH org request with invalid options', invalidOptions('patchOrg'));
  it('should reject a PUT orgs request with invalid options', invalidOptions('putOrgs'));
  it('should reject a PUT org request with invalid options', invalidOptions('putOrg'));
  it('should reject a DELETE orgs request with invalid options', invalidOptions('deleteOrgs'));
  it('should reject a DELETE org request with invalid options', invalidOptions('deleteOrg'));
  // ------- Non matching ids in body vs url -------
  it('should reject a POST org request with conflicting ids in the body and url', conflictingIDs('postOrg'));
  it('should reject a PATCH org request with conflicting ids in the body and url', conflictingIDs('patchOrg'));
  it('should reject a PUT org request with conflicting ids in the body and url', conflictingIDs('putOrg'));
  // ------------- 404 Not Found -------------
  it('should return 404 for a GET orgs request that returned no results', notFound('getOrgs'));
  it('should return 404 for a GET org request for a nonexistent org', notFound('getOrg'));
  it('should return 404 for a PATCH orgs request for nonexistent orgs', notFound('patchOrgs'));
  it('should return 404 for a PATCH org request for a nonexistent org', notFound('patchOrg'));
  it('should return 404 for a DELETE orgs request for nonexistent orgs', notFound('deleteOrgs'));
  it('should return 404 for a DELETE org request for a nonexistent org', notFound('deleteOrg'));
  // ------------- No arrays in singular endpoints -------------
  it('should reject a POST singular org request containing an array in the body', noArrays('postOrg'));
  it('should reject a PATCH singular org request containing an array in the body', noArrays('patchOrg'));
  it('should reject a PUT singular org request containing an array in the body', noArrays('putOrg'));
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
  const body = { id: 'testorg001' };
  const params = { orgid: 'testorg01' };

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
      _data.should.equal('Organization ID in the body does not match ID in the params.');

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
  // Get an unused org id
  const id = testData.orgs[3].id;
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  // Body must be an array of ids for get and delete; key-value pair for anything else
  const body = (endpoint === 'deleteOrgs' || endpoint === 'getOrgs')
    ? [id] : { id: id };
  // Add in a params field for singular org endpoints
  let params = {};
  if (!endpoint.includes('Orgs') && endpoint.includes('Org')) {
    params = { orgid: id };
  }

  return function(done) {
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

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
  };
}
