/**
 * @classification UNCLASSIFIED
 *
 * @module lib.errors
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Austin Bieber
 *
 * @description Defines the custom error class.
 */

class CustomError extends Error {

  /**
   * @description The CustomError constructor. It requires a description
   * and can optionally take a level.
   *
   * @param {string} message - The custom error description.
   * @param {string} level - The level to log the error at.
   */
  constructor(message, level) {
    // Call parent constructor
    super();
    this.message = message;

    if (level) {
      this.log(level);
    }

    // Ensure to capture the errors stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * @description Logs the error message based on the provided log level.
   *
   * @param {string} level - The level to log the error message at.
   */
  log(level) {
    switch (level) {
      case 'debug': M.log.debug(this.message); break;
      case 'verbose': M.log.verbose(this.message); break;
      case 'info': M.log.info(this.message); break;
      case 'warn': M.log.warn(this.message); break;
      case 'error': M.log.error(this.message); break;
      case 'critical': M.log.critical(this.message); break;
      default: break;
    }
  }

}

// 400
class DataFormatError extends CustomError {}

// 401
class AuthorizationError extends CustomError {}

// 403
class PermissionError extends CustomError {}
class OperationError extends CustomError {}

// 404
class NotFoundError extends CustomError {}

// 500
class ServerError extends CustomError {}
class DatabaseError extends CustomError {}

// 501
class NotImplementedError extends CustomError {}

/**
 * @description Returns an HTTP status code depending on what error is passed in.
 *
 * @param {object} error - The error to parse and return a status code for.
 *
 * @returns {number} An HTTP status code.
 */
function getStatusCode(error) {
  // If not an error, throw an error
  if (!(error instanceof Error)) {
    throw new M.ServerError('Invalid Error Format');
  }

  // Return an HTTP status code based on the error type
  switch (error.constructor.name) {
    case 'DataFormatError': return 400;
    case 'AuthorizationError': return 401;
    case 'PermissionError': return 403;
    case 'OperationError': return 403;
    case 'NotFoundError': return 404;
    case 'BrewingError': return 418;
    case 'ServerError': return 500;
    case 'DatabaseError': return 500;
    case 'NotImplementedError': return 501;
    default: return 500;
  }
}

/**
 * @description A utility to ensure that all errors get turned into custom errors.
 * To be used on returned errors in .catch statements.
 *
 * @param {object} error - The error to check.
 *
 * @returns {CustomError|ServerError} An instance of either the MBEE CustomError or ServerError.
 */
function captureError(error) {
  // If the error isn't already a custom error, make it one
  if (!(error instanceof CustomError)) {
    // Create a new server error
    const newErr = new ServerError(error.message, 'warn');
    // Capture stack trace
    newErr.stack = error.stack;
    // Return the new custom error
    return newErr;
  }
  else {
    return error;
  }
}

// Export error Classes and functions
module.exports = {
  CustomError,
  getStatusCode,
  captureError,
  DataFormatError,
  OperationError,
  AuthorizationError,
  PermissionError,
  NotFoundError,
  ServerError,
  DatabaseError,
  NotImplementedError
};
