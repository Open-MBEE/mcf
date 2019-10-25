/**
 * @classification UNCLASSIFIED
 *
 * @module test.210-lib-logger
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests the logger library functions.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const chai = require('chai');

// MBEE modules
const logger = M.require('lib.logger');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should log a response to a mock request', logMockResponse);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a mock request and response object, and calls the
 * logger.logResponse() function. Reads the log file to verify the request was
 * properly logged.
 *
 * @param {Function} done - The Mocha callback.
 */
function logMockResponse(done) {
  // Create mock request object
  const mockRequest = {
    method: 'POST',
    originalUrl: 'ThisIsATest',
    ip: '127.0.0.1',
    user: testData.adminUser
  };

  // Create mock response object
  const mockResponse = {
    statusCode: 403
  };

  const payload = 'This is a test response!';

  // Log the response
  logger.logResponse(payload.length, mockRequest, mockResponse);

  // Wait at least 100ms to ensure response was logged to file
  setTimeout(() => {
    const filePath = path.join(M.root, 'logs', M.config.log.file);

    // Read the log file and filter out non response logs
    const logData = fs.readFileSync(filePath).toString().split('\n')
    .filter(e => e.includes('RESPONSE: '));
    // Get the last response entry and remove initial timestamps
    const latestEntry = logData.pop().split('RESPONSE: ')[1];

    // Get the parts to inspect
    const logParts = latestEntry.split(' ');

    // Validate log parts
    chai.expect(logParts[0]).to.equal(mockRequest.ip);
    chai.expect(logParts[1]).to.equal(mockRequest.user.username);
    chai.expect(logParts[3]).to.equal(`"${mockRequest.method}`);
    chai.expect(logParts[4]).to.equal(`${mockRequest.originalUrl}"`);
    chai.expect(logParts[5]).to.equal(mockResponse.statusCode.toString());
    chai.expect(logParts[6]).to.equal(payload.length.toString());
    done();
  }, 100);
}
