/**
 * @classification UNCLASSIFIED
 *
 * @module auth.ldap-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Jake Ursetta
 *
 * @description This file implements authentication using LDAP Active Directory.
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

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const ldap = require('ldapjs');

// MBEE modules
const Organization = M.require('models.organization');
const User = M.require('models.user');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const errors = M.require('lib.errors');
const mbeeCrypto = M.require('lib.crypto');
const utils = M.require('lib.utils');

// Allocate LDAP configuration variable for convenience
const ldapConfig = M.config.auth.ldap;

/**
 * @description This function implements handleBasicAuth() in lib/auth.js.
 * Implement authentication via LDAP using username/password and
 * configuration in config file.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 * @param {string} username - Username to authenticate via LDAP AD.
 * @param {string} password - Password to authenticate via LDAP AD.
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
  try {
    // Connect to database
    const ldapClient = await ldapConnect();

    // Search for user
    const foundUser = await ldapSearch(ldapClient, username);

    // Authenticate user
    const authUser = await ldapAuth(ldapClient, foundUser, password);

    // Sync user with local database; return authenticated user object
    return await ldapSync(authUser);
  }
  catch (error) {
    throw errors.captureError(error);
  }
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
    throw decryptErr;
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
      throw findUserTokenErr;
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

/* ------------------------( LDAP Helper Functions )--------------------------*/
/**
 * @description Connects to an LDAP server and resolves a client object used
 * to preform search and bind operations.
 *
 * @returns {Promise} An LDAP client object.
 */
function ldapConnect() {
  M.log.debug('Attempting to bind to the LDAP server.');
  // define and return promise
  return new Promise((resolve, reject) => {
    // Initialize arrCaCerts to hold LDAP server certificates
    const arrCaCerts = [];

    let ldapCA = ldapConfig.ca;
    // If the CA contents is a string, make it an array
    if (typeof ldapCA === 'string') {
      ldapCA = [ldapCA];
    }
    // If no CA is provided.
    else if (typeof ldapCA === 'undefined') {
      ldapCA = [];
    }

    // Now if it's not an array, fail
    if (!Array.isArray(ldapCA)) {
      M.log.error('Failed to load LDAP CA certificates (invalid type)');
      return reject(new M.ServerError('An error occurred.', 'error'));
    }

    // If any items in the array are not strings, fail
    if (!ldapCA.every(c => typeof c === 'string')) {
      M.log.error('Failed to load LDAP CA certificates (invalid type in array)');
      return reject(new M.ServerError('An error occurred.', 'error'));
    }

    M.log.verbose('Reading LDAP server CAs ...');

    // Loop  number of certificates in config file
    for (let i = 0; i < ldapCA.length; i++) {
      // Extract certificate filename from config file
      const certName = ldapCA[i];
      // Extract certificate file content
      const file = fs.readFileSync(path.join(M.root, certName));
      // Push file content to arrCaCert
      arrCaCerts.push(file);
    }
    M.log.verbose('LDAP server CAs loaded.');

    // Create ldapClient object with url, credentials, and certificates
    const ldapClient = ldap.createClient({
      url: `${ldapConfig.url}:${ldapConfig.port}`,
      tlsOptions: {
        ca: arrCaCerts
      }
    });
    // Handle any errors in connecting to LDAP server
    ldapClient.on('error', (error) => reject(error));
    // Bind ldapClient object to LDAP server
    ldapClient.bind(ldapConfig.bind_dn, ldapConfig.bind_dn_pass, (bindErr) => {
      // Check if LDAP server bind fails
      if (bindErr) {
        // LDAP serve bind failed, reject bind error
        return reject(bindErr);
      }
      // LDAP serve bind successful, resolve ldapClient object
      return resolve(ldapClient);
    });
  });
}

/**
 * @description Searches for and resolve a user from LDAP server.
 *
 * @param {object} ldapClient - LDAP client.
 * @param {string} username - Username to find LDAP user.
 *
 * @returns {Promise} LDAP user information.
 */
function ldapSearch(ldapClient, username) {
  M.log.debug('Attempting to search for LDAP user.');
  // Define and return promise
  return new Promise((resolve, reject) => {
    // Sanitize username
    const usernameSani = sani.ldapFilter(username);
    // Initialize filter for query based on username attribute and the configuration filter
    // NOTE: Backslashes will be removed twice from filter due to configuration import.
    // Replaces the single backslash with two backlashes
    const filter = '(&'
                 + `(${ldapConfig.attributes.username}=${usernameSani})`
                 + `${ldapConfig.filter.replace('\\', '\\\\')})`;

    // log base and filter used for query
    M.log.debug(`Using LDAP base: ${ldapConfig.base}`);
    M.log.debug(`Using search filter: ${filter}`);
    M.log.debug('Executing search ...');

    // Set filter, scope, and attributes of the search
    const opts = {
      filter: filter,
      scope: 'sub',
      attributes: [
        ldapConfig.attributes.username,
        ldapConfig.attributes.firstName,
        ldapConfig.attributes.lastName,
        ldapConfig.attributes.email
      ]
    };

    // Check preferredName is a property of ldapConfig.attributes
    if (!ldapConfig.attributes.hasOwnProperty('preferredName')) {
      // NOT a property, use ldapConfig firstName attribute
      ldapConfig.attributes.preferredName = ldapConfig.attributes.firstName;
    }
    // Check preferredName is empty string
    else if (ldapConfig.attributes.preferredName === '') {
      // empty string, use ldapConfig firstName attribute
      ldapConfig.attributes.preferredName = ldapConfig.attributes.firstName;
    }
    // Set preferred name as an attribute
    else {
      opts.attributes.push(ldapConfig.attributes.preferredName);
    }

    // Define person
    let person;
    // Execute the search
    ldapClient.search(ldapConfig.base, opts, (err, result) => {
      if (err) {
        return reject(new M.ServerError('LDAP Search Failure.', 'warn'));
      }

      // If search fails, reject error
      result.on('error', (searchErr) => reject(searchErr));
      // If entry found, set person to entry
      result.on('searchEntry', (entry) => {
        M.log.debug('Search complete. Entry found.');
        person = entry;
      });
      // Search complete check results
      result.on('end', (status) => {
        M.log.debug(status);
        // Check person NOT undefined
        if (!person) {
          // Person undefined, reject error
          ldapClient.destroy(); // Disconnect from LDAP server on failure
          return reject(new M.AuthorizationError('Invalid username or password.', 'warn'));
        }
        // Person defined, return results
        return resolve(person.object);
      });
    });
  });
}

/**
 * @description Validates a users password with LDAP server.
 *
 * @param {object} ldapClient - LDAP client.
 * @param {object} user - LDAP user.
 * @param {string} password - Password to verify LDAP user.
 *
 * @returns {Promise} Authenticated user's information.
 */
function ldapAuth(ldapClient, user, password) {
  M.log.debug(`Authenticating ${user[ldapConfig.attributes.username]} ...`);
  // Define and return promise
  return new Promise((resolve, reject) => {
    // Validate user password
    ldapClient.bind(user.dn, password, (authErr) => {
      // If validation fails, reject error
      if (authErr) {
        M.log.error(authErr);
        ldapClient.destroy(); // Disconnect from LDAP server on failure
        return reject(new M.AuthorizationError('Invalid username or password.', 'warn'));
      }
      // Validation successful, resolve authenticated user's information
      M.log.debug(`User [${user[ldapConfig.attributes.username]
      }] authenticated successfully via LDAP.`);
      ldapClient.destroy(); // Disconnect from LDAP server after successful authentication
      return resolve(user);
    });
  });
}

/**
 * @description Synchronizes authenticated user's LDAP information with database.
 *
 * @param {object} ldapUserObj - LDAP user information.
 *
 * @returns {Promise} Synchronized user model object.
 */
async function ldapSync(ldapUserObj) {
  M.log.debug('Synchronizing LDAP user with local database.');

  let userObject;
  let foundUser;
  try {
    // Search for user in database
    foundUser = await User.findOne({ _id: ldapUserObj[ldapConfig.attributes.username] });
  }
  catch (error) {
    throw new M.DatabaseError('Search query on user failed', 'warn');
  }

  try {
    // If the user was found, update with LDAP info
    if (foundUser) {
      // User exists, update database with LDAP information
      const update = {
        fname: ldapUserObj[ldapConfig.attributes.firstName],
        preferredName: ldapUserObj[ldapConfig.attributes.preferredName],
        lname: ldapUserObj[ldapConfig.attributes.lastName],
        email: ldapUserObj[ldapConfig.attributes.email]
      };

      // Save updated user to database
      await User.updateOne({ _id: ldapUserObj[ldapConfig.attributes.username] }, update);

      // Find the updated user
      userObject = await User.findOne({ _id: ldapUserObj[ldapConfig.attributes.username] });
    }
    else {
      // User not found, create a new one
      // Initialize userData with LDAP information
      const initData = {
        _id: ldapUserObj[ldapConfig.attributes.username],
        fname: ldapUserObj[ldapConfig.attributes.firstName],
        preferredName: ldapUserObj[ldapConfig.attributes.preferredName],
        lname: ldapUserObj[ldapConfig.attributes.lastName],
        email: ldapUserObj[ldapConfig.attributes.email],
        provider: 'ldap',
        changePassword: false
      };

      // Save ldap user
      userObject = (await User.insertMany(initData))[0];
    }
  }
  catch (error) {
    M.log.error(error.message);
    throw new M.DatabaseError('Could not save user data to database', 'warn');
  }
  // If user created, emit users-created
  EventEmitter.emit('users-created', [userObject]);

  let defaultOrg;
  try {
    // Find the default org
    defaultOrg = await Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  }
  catch (error) {
    throw new M.DatabaseError('Query operation on default organization failed', 'warn');
  }

  try {
    // Add the user to the default org
    defaultOrg.permissions[userObject._id] = ['read', 'write'];

    // Save the updated default org
    await Organization.updateOne({ _id: M.config.server.defaultOrganizationId },
      { permissions: defaultOrg.permissions });
  }
  catch (saveErr) {
    M.log.error(saveErr.message);
    throw new M.DatabaseError('Could not save new user permissions to database', 'warn');
  }

  // Return the new user
  return userObject;
}

/**
 * @description Validates a users password with set rules.
 *
 * @param {string} password - Password to validate.
 *
 * @returns {boolean} If password is correctly validated.
 */
function validatePassword(password) {
  // LDAP does not require local password validation, return true
  return true;
}
