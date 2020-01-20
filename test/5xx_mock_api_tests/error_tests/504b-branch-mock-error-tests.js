/**
 * @classification UNCLASSIFIED
 *
 * @module test.504b-branch-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests for expected errors in mock requests of branch endpoints in the API
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
let project;
let projID;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Creates a test admin user, org, and project.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
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
   * After: Runs after all tests. Removes the test user and org.
   */
  after(async () => {
    try {
      await testUtils.removeTestAdmin();
      await testUtils.removeTestOrg();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  // ------------- No Requesting User -------------
  it('should reject a GET branches request with no requesting user', noReqUser('getBranches'));
  it('should reject a GET branch request with no requesting user', noReqUser('getBranch'));
  it('should reject a POST branches request with no requesting user', noReqUser('postBranches'));
  it('should reject a POST branch request with no requesting user', noReqUser('postBranch'));
  it('should reject a PATCH branches request with no requesting user', noReqUser('patchBranches'));
  it('should reject a PATCH branch request with no requesting user', noReqUser('patchBranch'));
  it('should reject a DELETE branches request with no requesting user', noReqUser('deleteBranches'));
  it('should reject a DELETE branch request with no requesting user', noReqUser('deleteBranch'));
  // ------------- Invalid options -------------
  it('should reject a GET branches request with invalid options', invalidOptions('getBranches'));
  it('should reject a GET branch request with invalid options', invalidOptions('getBranch'));
  it('should reject a POST branches request with invalid options', invalidOptions('postBranches'));
  it('should reject a POST branch request with invalid options', invalidOptions('postBranch'));
  it('should reject a PATCH branches request with invalid options', invalidOptions('patchBranches'));
  it('should reject a PATCH branch request with invalid options', invalidOptions('patchBranch'));
  it('should reject a DELETE branches request with invalid options', invalidOptions('deleteBranches'));
  it('should reject a DELETE branch request with invalid options', invalidOptions('deleteBranch'));
  // ------- Non matching ids in body vs url -------
  it('should reject a POST branch request with conflicting ids in the body and url', conflictingIDs('postBranch'));
  it('should reject a PATCH branch request with conflicting ids in the body and url', conflictingIDs('patchBranch'));
  // ------------- 404 Not Found -------------
  it('should return 404 for a GET branches request that returned no results', notFound('getBranches'));
  it('should return 404 for a GET branch request that returned no results', notFound('getBranch'));
  it('should return 404 for a PATCH branches request for nonexistent branches', notFound('patchBranches'));
  it('should return 404 for a PATCH branch request for a nonexistent branch', notFound('patchBranch'));
  it('should return 404 for a DELETE branches request for nonexistent branches', notFound('deleteBranches'));
  it('should return 404 for a DELETE branch request for a nonexistent branch', notFound('deleteBranch'));
  // ------------- No arrays in singular endpoints -------------
  it('should reject a POST singular branch request containing an array in the body', noArrays('postBranch'));
  it('should reject a PATCH singular branch request containing an array in the body', noArrays('patchBranch'));
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
  const body = { id: 'testbranch001' };
  const params = { branchid: 'testbranch01' };

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
      _data.should.equal('Branch ID in the body does not match ID in the params.');

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
    // Get an unused branch id
    const id = testData.branches[3].id;
    // Parse the method
    const method = testUtils.parseMethod(endpoint);
    // Body must be an array of ids for get and delete; key-value pair for anything else
    const body = (endpoint === 'deleteBranches' || endpoint === 'getBranches')
      ? [id] : { id: id };
    const params = { orgid: org._id, projectid: projID };
    // Add in a params field for singular branch endpoints
    if (!endpoint.includes('Branches') && endpoint.includes('Branch')) {
      params.branchid = id;
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

/**
 * @description A test factory function that generates a mocha-compatible test function that can
 * test the response of singular api endpoint given an array in the body.
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
