/**
 * Classification: UNCLASSIFIED
 *
 * @module auth.ldap-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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
const ldap = require('ldapjs');

// MBEE modules
const LocalStrategy = M.require('auth.local-strategy');
const Organization = M.require('models.organization');
const User = M.require('models.user');
const sani = M.require('lib.sanitization');

// Allocate LDAP configuration variable for convenience
const ldapConfig = M.config.auth.ldap;

/**
 * @description This function implements handleBasicAuth() in lib/auth.js.
 * Implement authentication via LDAP using username/password and
 * configuration in config file.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @param {string} username - Username to authenticate via LDAP AD
 * @param {string} password - Password to authenticate via LDAP AD
 *
 * @returns {Promise} Authenticated user object
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
function handleBasicAuth(req, res, username, password) {
  // Return a promise
  return new Promise((resolve, reject) => {
    // Define LDAP client handler
    let ldapClient = null;

    // Connect to database
    ldapConnect()
    .then(_ldapClient => {
      ldapClient = _ldapClient;

      // Search for user
      return ldapSearch(ldapClient, username);
    })

    // Authenticate user
    .then(foundUser => ldapAuth(ldapClient, foundUser, password))
    // Sync user with local database
    .then(authUser => ldapSync(authUser))
    // Return authenticated user object
    .then(syncedUser => resolve(syncedUser))
    .catch(ldapConnectErr => reject(ldapConnectErr));
  });
}

/**
 * @description Authenticates user with passed in token.
 * Implements handleTokenAuth() provided by the Local Strategy.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @param {string} token - Token user authentication token, encrypted
 *
 * @returns {Promise} Local user object
 *
 * @example
 * AuthController.handleTokenAuth(req, res, token)
 *   .then(user => {
 *   // do something with authenticated user
 *   })
 *   .catch(err => {
 *     console.log(err);
 *   })
 */
function handleTokenAuth(req, res, token) {
  return new Promise((resolve, reject) => {
    LocalStrategy.handleTokenAuth(req, res, token)
    .then(user => resolve(user))
    .catch(handleTokenAuthErr => reject(handleTokenAuthErr));
  });
}

/**
 * @description  This function generates the session token for user login.
 * Implements the Local Strategy doLogin function.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @param {function} next - Callback to continue express authentication
 */
function doLogin(req, res, next) {
  LocalStrategy.doLogin(req, res, next);
}

/* ------------------------( LDAP Helper Functions )--------------------------*/
/**
 * @description Connects to an LDAP server and resolves a client object used
 * to preform search and bind operations.
 *
 * @returns {Promise} An LDAP client object
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
      return reject(new M.CustomError('An error occurred.', 500));
    }

    // If any items in the array are not strings, fail
    if (!ldapCA.every(c => typeof c === 'string')) {
      M.log.error('Failed to load LDAP CA certificates (invalid type in array)');
      return reject(new M.CustomError('An error occurred.', 500));
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
 * @param {Object} ldapClient - LDAP client
 * @param {string} username - Username to find LDAP user
 *
 * @returns {Promise} LDAP user information
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
        return reject(new M.CustomError('LDAP Search Failure.', 500, 'warn'));
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
          return reject(new M.CustomError('Invalid username or password.', 401));
        }
        // Person defined, return results
        return resolve(person.object);
      });
    });
  });
}

/**
 * @description Validates a users password with LDAP server
 *
 * @param {Object} ldapClient - LDAP client
 * @param {Object} user - LDAP user
 * @param {string} password - Password to verify LDAP user
 *
 * @returns {Promise} Authenticated user's information
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
        return reject(new M.CustomError('Invalid username or password.', 401));
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
 * @param {Object} ldapUserObj - LDAP user information
 *
 * @returns {Promise} Synchronized user model object
 */
function ldapSync(ldapUserObj) {
  M.log.debug('Synchronizing LDAP user with local database.');
  // Define and return promise
  return new Promise((resolve, reject) => {
    // Store user object function-wide
    let userObject = {};

    // Search for user in database
    User.findOne({ _id: ldapUserObj[ldapConfig.attributes.username] })
    .then(foundUser => {
      // If the user was found, update with LDAP info
      if (foundUser) {
        // User exists, update database with LDAP information
        foundUser.fname = ldapUserObj[ldapConfig.attributes.firstName];
        foundUser.preferredName = ldapUserObj[ldapConfig.attributes.preferredName];
        foundUser.lname = ldapUserObj[ldapConfig.attributes.lastName];
        foundUser.email = ldapUserObj[ldapConfig.attributes.email];

        // Save updated user to database
        return foundUser.save();
      }
      // User not found, create a new one

      // Initialize userData with LDAP information
      const initData = new User({
        _id: ldapUserObj[ldapConfig.attributes.username],
        fname: ldapUserObj[ldapConfig.attributes.firstName],
        preferredName: ldapUserObj[ldapConfig.attributes.preferredName],
        lname: ldapUserObj[ldapConfig.attributes.lastName],
        email: ldapUserObj[ldapConfig.attributes.email],
        provider: 'ldap'
      });

        // Save ldap user
      return initData.save();
    })
    .then(savedUser => {
      // Save user to function-wide variable
      userObject = savedUser;

      // Find the default org
      return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
    })
    .then((defaultOrg) => {
      // Add the user to the default org
      defaultOrg.permissions[userObject._id] = ['read', 'write'];

      // Mark permissions as modified, required for 'mixed' fields
      defaultOrg.markModified('permissions');

      // Save the updated default org
      return defaultOrg.save();
    })
    // Return the new user
    .then(() => resolve(userObject))
    // Save failed, reject error
    .catch(saveErr => reject(saveErr));
  });
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
