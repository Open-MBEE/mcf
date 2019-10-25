/**
 * @classification UNCLASSIFIED
 *
 * @module auth.local-ldap-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Josh Kaplan
 *
 * @description Implements authentication strategy for local and ldap.
 */

// Expose auth strategy functions
// Note: The export is being done before the import to solve the issues of
// circular references.
module.exports = {
  handleBasicAuth,
  handleTokenAuth,
  doLogin,
  validatePassword
};

// MBEE modules
const errors = M.require('lib.errors');
const LocalStrategy = M.require('auth.local-strategy');
const LDAPStrategy = M.require('auth.ldap-strategy');
const User = M.require('models.user');

/**
 * @description Handles basic-style authentication. This function gets called both for
 * the case of a basic auth header or for login form input. Either way
 * the username and password is provided to this function for auth.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 * @param {string} username - Username authenticate via locally or LDAP AD.
 * @param {string} password - Password to authenticate via locally or LDAP AD.
 *
 * @returns {Promise} Authenticated user object.
 */
async function handleBasicAuth(req, res, username, password) {
  try {
    // Search locally for the user
    const users = await User.find({ _id: username, archived: false });

    // If user found and their provider is local,
    // do local authentication
    if (users.length === 1 && users[0].provider === 'local') {
      return await LocalStrategy.handleBasicAuth(req, res, username, password);
    }

    // User is not found locally or is found and provider is LDAP
    // try LDAP authentication
    else if (users.length === 0 || (users.length === 1 && users[0].provider === 'ldap')) {
      return await LDAPStrategy.handleBasicAuth(req, res, username, password);
    }
    else {
      // More than 1 user found or provider not set to ldap/local
      throw new M.ServerError('More than one user found or invalid provider.', 'error');
    }
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function implements handleTokenAuth called in the auth.js library file.
 * The purpose of this function is to implement authentication of a user who has
 * passed in a session token or bearer token. This particular instance just implements the same
 * tokenAuth provided by the Local Strategy.
 *
 * @param {object} req - Request object from express.
 * @param {object} res - Response object from express.
 * @param {string} _token -  Token user is attempting to authenticate with.
 *
 * @returns {Promise} Token authenticated user object.
 *
 * @example
 * AuthController.handleTokenAuth(req, res, _token)
 *   .then(user => {
 *   // do something with authenticated user
 *   })
 *   .catch(err => {
 *     console.log(err);
 *   })
 */
async function handleTokenAuth(req, res, _token) {
  return LocalStrategy.handleTokenAuth(req, res, _token);
}

/**
 * @description This function implements doLogin called in the auth.js library file.
 * The purpose of this function is to preform session or token setup for the node
 * application so that users can be authorized via token after logging in. This particular
 * implementation uses the Local Strategy doLogin function.
 *
 * @param {object} req - Request object from express.
 * @param {object} res - Response object from express.
 * @param {Function} next - Callback to express authentication flow.
 */
function doLogin(req, res, next) {
  LocalStrategy.doLogin(req, res, next);
}

/**
 * @description Validates a users password with set rules.
 *
 * @param {string} password - Password to validate.
 * @param {string} provider - The type of authentication strategy (ldap, local, etc).
 *
 * @returns {boolean} If password is correctly validated.
 */
function validatePassword(password, provider) {
  // Use the appropriate provider rules
  switch (provider) {
    case 'local':
      // Use default for local provider
      return LocalStrategy.validatePassword(password);
    case 'ldap':
      // LDAP does not require validation locally
      return LDAPStrategy.validatePassword(password);
    default:
      // Unknown provider, failed validation
      // Explicitly NOT logging error to avoid password logging
      throw new M.ServerError(`Unknown provider: ${provider}`, 'warn');
  }
}
