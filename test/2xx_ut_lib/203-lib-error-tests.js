/**
 * @classification UNCLASSIFIED
 *
 * @module  test.203-lib-error
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description This file tests basic CustomError functionality.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const errors = M.require('lib.errors');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should test the getStatusCode() function', getStatusCode);
  it('should create a new custom error with the same stack trace', capturedError);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Tests that the get status code function returns all the proper
 * status codes for all MBEE errors.
 */
async function getStatusCode() {
  // Create all types of errors and get their status codes
  const format = errors.getStatusCode(new M.DataFormatError('This is a format error.'));
  const auth = errors.getStatusCode(new M.AuthorizationError('This is an auth error.'));
  const perm = errors.getStatusCode(new M.PermissionError('This is a permission error.'));
  const find = errors.getStatusCode(new M.NotFoundError('This is a not found error.'));
  const server = errors.getStatusCode(new M.ServerError('This is a server error.'));
  const database = errors.getStatusCode(new M.DatabaseError('This is a database error.'));
  const normal = errors.getStatusCode(new Error('This is a normal error.'));

  // Ensure status codes are correct
  chai.expect(format).to.equal(400);
  chai.expect(auth).to.equal(401);
  chai.expect(perm).to.equal(403);
  chai.expect(find).to.equal(404);
  chai.expect(server).to.equal(500);
  chai.expect(database).to.equal(500);
  chai.expect(normal).to.equal(500);
}

/**
 * @description Tests that the captureError function creates a new custom error and preserves
 * the stack trace.
 */
async function capturedError() {
  // Create an error
  const originalError = new Error();
  // Run the error through the captureError function
  const newError = errors.captureError(originalError);

  // Expect the captureError function to turn the error into a customError and preserve the stack
  chai.expect(originalError instanceof errors.CustomError).to.equal(false);
  chai.expect(newError.stack).to.equal(originalError.stack);
  chai.expect(newError instanceof errors.CustomError).to.equal(true);
}
