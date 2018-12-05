/**
 * Classification: UNCLASSIFIED
 *
 * @module  lib.middleware
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines middleware functions which can be used by
 * express to perform actions during requests.
 */

/**
 * @description Log the route and method requested by a user.
 *
 * @param {Object} req - Request object from express
 * @param {Object} res - Response object from express
 * @param {callback} next - Callback to express authentication flow.
 */
module.exports.logRoute = function logRoute(req, res, next) {
  // Set username to anonymous if req.user is not defined
  const username = (req.user) ? req.user.username : 'anonymous';
  // Log the method, url, and username for the request
  M.log.info(`${req.method} "${req.originalUrl}" requested by ${username}`);
  next();
};

/**
 * @description Log the IP address where the request originated from
 *
 * @param {Object} req - Request object from express
 * @param {Object} res - Response object from express
 * @param {callback} next - Callback to express authentication flow.
 */
module.exports.logIP = function logIP(req, res, next) {
  // Log the method, url, and ip address for the request
  M.log.verbose(`${req.method} "${req.originalUrl}" requested from ${req.ip}`);
  next();
};

/**
 * @description Disables specific user api methods using the configuration
 * server.api.userAPI
 *
 * @param {Object} req - Request object from express
 * @param {Object} res - Response object from express
 * @param {callback} next - Callback to express authentication flow.
 */
// eslint-disable-next-line consistent-return
module.exports.disableUserAPI = function disableUserAPI(req, res, next) {
  // Check if the request method is disabled
  if (!M.config.server.api.userAPI[req.method.toLowerCase()]) {
    // Create error message '<method> <url> is disabled'
    const message = `${req.method} ${req.originalUrl} is disabled.`;
    // Create custom error 403 Forbidden
    const error = new M.CustomError(message, 403);
    // Log custom error
    M.log.error(error);
    // Return error to user
    return res.status(403).send(error);
  }
  next();
};
