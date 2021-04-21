/**
 * @classification UNCLASSIFIED
 *
 * @module test.500a-general-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests the general API endpoints using mock Express request and
 * response objects.
 */

// Node Modules
const fs = require('fs');
const path = require('path');

// NPM modules
const chai = require('chai');

// MBEE modules
const APIController = M.require('controllers.api-controller');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const next = testUtils.next;
let adminUser = null;
const logFilePath = path.join(M.root, 'logs', M.config.log.file);

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
   * After: Delete admin user.
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
  it('should get the server logs', getLogs);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock GET request to get the server logs.
 *
 * @param {Function} done - The mocha callback.
 */
function getLogs(done) {
  // Ensure there is enough memory to run this test
  if (!utils.readFileCheck(logFilePath)) {
    M.log.verbose('Skipping this test due to a lack of sufficient memory.');
    this.skip();
  }

  // Store this, used in res.send() if need to skip test due to possible heap
  // overflow of additional file read
  const testThis = this;

  // Create request object
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Create response object
  const res = {};
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Ensure there is enough memory to test the response
    if (!utils.readFileCheck(logFilePath)) {
      M.log.verbose('Skipping this test due to a lack of sufficient memory.');
      testThis.skip();
    }

    // Read log file content
    if (fs.existsSync(logFilePath)) {
      const logContent = fs.readFileSync(logFilePath);

      // Ensure that the content returned is part of the main server log
      chai.expect(logContent.toString()).to.include(_data);
    }

    done();
  };

  // GET the system logs
  APIController.getLogs(req, res, next(req, res));
}
