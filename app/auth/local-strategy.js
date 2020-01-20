/**
 * @classification UNCLASSIFIED
 *
 * @module auth.local-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Jake Ursetta
 * @author Josh Kaplan
 * @author Connor Doyle
 *
 * @description This implements an authentication strategy for local
 * authentication. This should be the default authentication strategy for MBEE.
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
const User = M.require('models.user');
const mbeeCrypto = M.require('lib.crypto');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');
const EventEmitter = M.require('lib.events');

/**
 * @description This function implements handleBasicAuth() in lib/auth.js.
 * Function is called with basic auth header or login form input.
 *
 * Note: Uses username/password and configuration in config file.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 * @param {string} username - Username to authenticate.
 * @param {string} password - Password to authenticate.
 *
 * @returns {Promise} Authenticated user object.
 *
 * @example
 * AuthController.handleBasicAuth(req, res, username, password)
 *   .then(user => {
 *   // do something with authenticated user
 *   })
 *   .catch(err => {
 *     console.log(err);
 *   })
 */
async function handleBasicAuth(req, res, username, password) {
  let user;
  try {
    user = await User.findOne({ _id: username, archived: false });
  }
  catch (findUserErr) {
    throw new M.DatabaseError(findUserErr.message, 'warn');
  }
  // Check for empty user
  if (!user) {
    throw new M.NotFoundError(`User ${username} not found.`, 'warn');
  }

  let result = null;
  try {
    // Compute the password hash on given password
    result = await User.verifyPassword(user, password);
  }
  catch (verifyErr) {
    throw new M.ServerError(verifyErr.message, 'warn');
  }

  // Check password is valid
  if (!result) {
    // Add login failure to user's failed logins
    if (!user.failedlogins) user.failedlogins = [];
    const loginInfo = {
      ipaddress: req.connection.remoteAddress,
      timestamp: Date.now()
    };
    user.failedlogins.push(loginInfo);

    // Update the user
    try {
      await User.updateOne({ _id: username }, { failedlogins: user.failedlogins });
    }
    catch (e) {
      throw new M.DatabaseError('Failed to update failedLogins', 'critical');
    }

    // Check if user has entered an incorrect password five times in the past 15 minutes
    if (user.failedlogins[user.failedlogins.length - 5]
      && user.failedlogins[user.failedlogins.length - 5].timestamp
      > Date.now() - 15 * utils.timeConversions.MINUTES) {
      // Count the number of non-archived admins in the database
      const admins = await User.find({ admin: true, archived: false }, null);
      // Check if the user is the only admin
      if (user.admin && admins.length === 1) {
        // It is recommended that a listener be registered for this event to notify the proper
        // administrators/authorities
        EventEmitter.emit('sole-admin-failed-login-exceeded', user._id);
        // Throw a critical error
        throw new M.AuthorizationError('Incorrect login attempts exceeded '
        + 'on only active admin account.', 'critical');
      }
      // Archive the user and throw an error
      else {
        User.updateOne({ _id: username }, { archived: true }, (err) => {
          if (err) {
            throw new M.DatabaseError('Could not lock user after failed login attempts exceeded',
              'critical');
          }
        });
        EventEmitter.emit('user-account-locked', user._id);
        throw new M.AuthorizationError(`Account '${user._id}' has been locked after `
          + 'exceeding allowed number of failed login attempts. '
          + 'Please contact your local administrator.', 'warn');
      }
    }
    // User is within allowed number of failed attempts; throw an error
    else {
      throw new M.AuthorizationError('Invalid password.', 'warn');
    }
  }
  // Authenticated, return user
  return user;
}

/**
 * @description This function implements handleTokenAuth() in lib/auth.js.
 * Authenticates user with passed in token.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 * @param {string} token - User authentication token, encrypted.
 *
 * @returns {Promise} Local user object.
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
async function handleTokenAuth(req, res, token) {
  // Define and initialize token
  let decryptedToken = null;
  try {
    // Decrypt the token
    decryptedToken = mbeeCrypto.inspectToken(token);
  }
  // If NOT decrypted, not valid and the
  // user is not authorized
  catch (decryptErr) {
    throw new M.AuthorizationError(decryptErr.message, 'warn');
  }

  // Ensure token not expired
  if (Date.now() < Date.parse(decryptedToken.expires)) {
    let user = null;
    // Not expired, find user
    try {
      user = await User.findOne({
        _id: sani.sanitize(decryptedToken.username),
        archivedOn: null
      });
    }
    catch (findUserTokenErr) {
      throw new M.AuthorizationError(findUserTokenErr.message, 'warn');
    }
    // A valid session was found in the request but the user no longer exists
    if (!user) {
      // Logout user
      req.user = null;
      req.session.destroy();
      // Return error
      throw new M.NotFoundError('No user found.', 'warn');
    }
    // return User object if authentication was successful
    return user;
  }
  // If token is expired user is unauthorized
  else {
    throw new M.AuthorizationError('Token is expired or session is invalid.', 'warn');
  }
}

/**
 * @description This function implements doLogin() in lib/auth.js.
 * This function generates the session token for user login.
 * Upon successful login, generate token and set to session.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 * @param {Function} next - Callback to express authentication.
 */
function doLogin(req, res, next) {
  // Compute token expiration time
  const timeDelta = M.config.auth.token.expires
                  * utils.timeConversions[M.config.auth.token.units];

  // Generate and set the token
  req.session.token = mbeeCrypto.generateToken({
    type: 'user',
    username: (req.user.username || req.user._id),
    created: (new Date(Date.now())),
    expires: (new Date(Date.now() + timeDelta))
  });
  M.log.info(`${req.originalUrl} Logged in ${(req.user.username || req.user._id)}`);
  // Callback
  next();
}

/**
 * @description Validates a users password with set rules.
 *
 * @param {string} password - Password to validate.
 *
 * @returns {boolean} If password is correctly validated.
 */
function validatePassword(password) {
  // No defined password validator, use default
  try {
    // At least 8 characters
    const lengthValidator = (password.length >= 8);
    // At least 1 digit
    const digitsValidator = (password.match(/[0-9]/g).length >= 1);
    // At least 1 lowercase letter
    const lowercaseValidator = (password.match(/[a-z]/g).length >= 1);
    // At least 1 uppercase letter
    const uppercaseValidator = (password.match(/[A-Z]/g).length >= 1);
    // At least 1 special character
    const specialCharValidator = (password.match(/[-`~!@#$%^&*()_+={}[\]:;'",.<>?/|\\]/g).length >= 1);
    // Validate the password
    return (lengthValidator
      && digitsValidator
      && lowercaseValidator
      && uppercaseValidator
      && specialCharValidator);
  }
  catch (error) {
    // Explicitly NOT logging error to avoid password logging
    return false;
  }
}
