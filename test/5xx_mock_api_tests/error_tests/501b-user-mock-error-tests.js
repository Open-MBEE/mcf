/**
 * @classification UNCLASSIFIED
 *
 * @module test.501b-user-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests for expected errors in mock requests of user endpoints in the API
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
   * Before: Runs before all tests. Creates the admin user.
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
   * After: Runs after all tests. Deletes the admin user.
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
  it('should reject a GET users request with no requesting user', noReqUser('getUsers'));
  it('should reject a POST users request with no requesting user', noReqUser('postUsers'));
  it('should reject a PATCH users request with no requesting user', noReqUser('patchUsers'));
  it('should reject a PUT users request with no requesting user', noReqUser('putUsers'));
  it('should reject a PATCH password request with no requesting user', noReqUser('patchPassword'));
  it('should reject a DELETE users request with no requesting user', noReqUser('deleteUsers'));
  it('should reject a GET whoami user request with no requesting user', noReqUser('whoami'));
  it('should reject a GET search user request with no requesting user', noReqUser('searchUsers'));
  // ------------- Invalid options -------------
  it('should reject a GET users request with invalid options', invalidOptions('getUsers'));
  it('should reject a POST users request with invalid options', invalidOptions('postUsers'));
  it('should reject a PATCH users request with invalid options', invalidOptions('patchUsers'));
  it('should reject a PUT users request with invalid options', invalidOptions('putUsers'));
  it('should reject a DELETE users request with invalid options', invalidOptions('deleteUsers'));
  it('should reject a GET whoami request with invalid options', invalidOptions('whoami'));
  it('should reject a GET search user request with invalid options', invalidOptions('searchUsers'));
  // ------- Non matching ids in body vs url -------
  it('should reject a POST user request with conflicting ids in the body and url', conflictingIDs('postUsers'));
  it('should reject a PATCH user request with conflicting ids in the body and url', conflictingIDs('patchUsers'));
  it('should reject a PUT user request with conflicting ids in the body and url', conflictingIDs('putUsers'));
  // ------------- 404 Not Found -------------
  it('should return 404 for a GET users request that returned no results', notFound('getUsers'));
  it('should return 404 for a PATCH users request for a nonexistent user', notFound('patchUsers'));
  it('should return 404 for a DELETE users request for a nonexistent user', notFound('deleteUsers'));
  it('should return 404 for a GET search users request that returned no results', notFound('searchUsers'));
  //  ------------- Passwords -------------
  it('should reject a PATCH request to patchPassword if the old password is not provided in the body',
    badPasswordInput('Old'));
  it('should reject a PATCH request to patchPassword if the new password is not provided in the body',
    badPasswordInput('New'));
  it('should reject a PATCH request to patchPassword if the confirm password is not provided in the body',
    badPasswordInput('Confirmed'));
});

/* --------------------( Tests )-------------------- */
/**
 * @description A constructor for a dynamic mocha-compatible function that can test the response of
 * any api endpoint to a request missing a requestingUser.
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
 * @description A constructor for a dynamic mocha-compatible function that can test the response of
 * any api endpoint to a request that has invalid options.
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
 * @description A constructor for a dynamic mocha-compatible function that can test the response of
 * singular api endpoint to a request that has conflicting ids in the body and params.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function conflictingIDs(endpoint) {
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  const body = { username: 'testuser001' };
  const params = { username: 'testuser01' };

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
      _data.should.equal('Username in body does not match username in params.');

      // Expect the statusCode to be 400
      res.statusCode.should.equal(400);

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that can test the response of
 * any api endpoint to a request for an item that doesn't exist.
 *
 * @param {string} endpoint - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function notFound(endpoint) {
  // Get an unused username
  const name = testData.users[4].username;
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  // Body must be an array of ids for get and delete; key-value pair for anything else
  const body = (endpoint === 'deleteUsers' || endpoint === 'getUsers')
    ? [name] : { username: name };
  // Add in a params field for singular user endpoints
  let params = {};
  if (!endpoint.includes('Users') && endpoint.includes('User')) {
    params = { username: name };
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
 * @description A constructor for a dynamic mocha-compatible function that tests various error
 * cases for the PATCH password api endpoint.
 *
 * @param {string} type - The particular api endpoint to test.
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function badPasswordInput(type) {
  // Parse the method
  const method = 'PATCH';
  // Set up the body of the request
  const body = {
    oldPassword: 'pass',
    password: 'pass',
    confirmPassword: 'pass'
  };
  const endpoint = 'patchPassword';
  // Initialize expected message and status code
  let message = `${type} password not in request body.`;
  let code = 400;
  // Delete the old password field so that an error is thrown
  if (type === 'Old') {
    delete body.oldPassword;
  }
  // Delete the new password field so that an error is thrown
  else if (type === 'New') {
    delete body.password;
  }
  // Delete the confirm password field so that an error is thrown
  else if (type === 'Confirmed') {
    delete body.confirmPassword;
  }
  // The user error has a different message and status code
  else if (type === 'user') {
    message = 'Cannot change another user\'s password.';
    code = 403;
  }

  return function(done) {
    const params = { username: adminUser._id };

    // Create request object
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Create response object
    const res = {};
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Expect an error message
      _data.should.equal(message);

      // Expect a specific status code
      res.statusCode.should.equal(code);

      done();
    };

    // Sends the mock request
    APIController[endpoint](req, res, next(req, res));
  };
}
