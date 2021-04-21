/**
 * @classification UNCLASSIFIED
 *
 * @module test.507b-webhook-mock-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests for expected errors in mock requests of webhook endpoints in the API
 * controller.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const APIController = M.require('controllers.api-controller');
const WebhookController = M.require('controllers.webhook-controller');
const Webhook = M.require('models.webhook');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
let adminUser = null;
let webhookID;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Creates an admin user and a test webhook.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();

      // Create an incoming webhook for the trigger tests
      const webhookData = testData.webhooks[1];
      const webhooks = await WebhookController.create(adminUser, webhookData);
      webhookID = webhooks[0]._id;
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Removes any remaining test webhooks and deletes the admin user.
   */
  after(async () => {
    try {
      await Webhook.deleteMany({ _id: webhookID });
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
  it('should reject a GET webhooks request with no requesting user', noReqUser('getWebhooks'));
  it('should reject a POST webhooks request with no requesting user', noReqUser('postWebhooks'));
  it('should reject a PATCH webhooks request with no requesting user', noReqUser('patchWebhooks'));
  it('should reject a DELETE webhooks request with no requesting user', noReqUser('deleteWebhooks'));
  // ------------- Invalid options -------------
  it('should reject a GET webhooks request with invalid options', invalidOptions('getWebhooks'));
  it('should reject a POST webhook request with invalid options', invalidOptions('postWebhooks'));
  it('should reject a PATCH webhooks request with invalid options', invalidOptions('patchWebhooks'));
  it('should reject a DELETE webhooks request with invalid options', invalidOptions('deleteWebhooks'));
  // ------- Non matching ids in body vs url -------
  it('should reject a PATCH webhook request with conflicting ids in the body and url', conflictingIDs('patchWebhooks'));
  // ------------- 404 Not Found -------------
  it('should return 404 for a GET webhooks request that returned no results', notFound('getWebhooks'));
  //  ------------- Trigger -------------
  it('should reject a POST request to trigger a webhook if the token cannot be found', tokenNotFound);
  it('should reject a POST request to trigger a webhook if the token is invalid', tokenInvalid);
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
  const body = { id: 'testwebhook001' };
  const params = { webhookid: 'testwebhook01' };

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
      _data.should.equal('Webhook ID in body does not match webhook ID in params.');

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
  // Get an unused webhook id
  const id = 'definitely not a webhook id';
  // Parse the method
  const method = testUtils.parseMethod(endpoint);
  // Body must be an array of ids for get and delete; key-value pair for anything else
  const body = (endpoint === 'deleteWebhooks' || endpoint === 'getWebhooks')
    ? [id] : { id: id };
  // Add in a params field for singular endpoints
  let params = {};
  if (!endpoint.includes('Webhooks') && endpoint.includes('Webhook')) {
    params = { webhookid: id };
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
 * @description Verifies that the API Controller throws an error when it can not find the token
 * in the request for triggering a webhook.
 *
 * @param {Function} done - The Mocha callback.
 */
function tokenNotFound(done) {
  // Get the base 64 encoded id of the incoming webhook
  const encodedID = Buffer.from(webhookID).toString('base64');

  const method = 'POST';
  const body = { notToken: 'no token' };
  const params = { encodedid: encodedID };

  // Create request object
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Expect an error message
    _data.should.equal('Token could not be found in the request.');

    // Expect the statusCode to be 400
    res.statusCode.should.equal(400);

    done();
  };

  // Sends the mock request
  APIController.triggerWebhook(req, res, next(req, res));
}

/**
 * @description Verifies that the API Controller throws an error when the token provided to trigger
 * a webhook is invalid.
 *
 * @param {Function} done - The Mocha callback.
 */
function tokenInvalid(done) {
  // Get the base 64 encoded id of the incoming webhook
  const encodedID = Buffer.from(webhookID).toString('base64');

  const method = 'POST';
  const body = { test: { token: 'invalid token' } };
  const params = { encodedid: encodedID };

  // Create request object
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Expect an error message
    _data.should.equal('Invalid token');

    // Expect the statusCode to be 400
    res.statusCode.should.equal(400);

    done();
  };

  // Sends the mock request
  APIController.triggerWebhook(req, res, next(req, res));
}
