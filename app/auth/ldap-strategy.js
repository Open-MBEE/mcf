/**
 * Classification: UNCLASSIFIED
 *
 * @module auth.ldap-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines an MBEE authentication module for using
 * LDAP / Active Directory to authenticate users.
 */

// Expose auth strategy functions
// Note: The export is being done before the import to avoid issues caused by
// circular references.
module.exports = {
  handleBasicAuth,
  handleTokenAuth,
  doLogin
};

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const ldap = require('ldapjs');

// MBEE modules
const LocalStrategy = M.require('auth.local-strategy');
const User = M.require('models.user');
const UserController = M.require('controllers.user-controller');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');

// Allocate LDAP configuration variable for convenience
const ldapConfig = M.config.auth.ldap;

/**
 * @description This function implements handleBasicAuth() in lib/auth.js.
 * Implement authentication via LDAP using username/password and
 * configuration in config file.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @param {String} username - Username to authenticate via LDAP AD
 * @param {String} password - Password to authenticate via LDAP AD
 * @returns {Promise} resolve - authenticated user object
 *                    reject - an error
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
 * @description Authenticates user via provided token.
 * Implements handleTokenAuth() provided by the Local Strategy.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @param {String} token - Token user authentication token, encrypted
 * @returns {Promise} resolve - local user object
 *                    reject - an error
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
 * @param {callback} next - Callback to continue express authentication
 */
function doLogin(req, res, next) {
  LocalStrategy.doLogin(req, res, next);
}


/* ------------------------( LDAP Helper Functions )--------------------------*/

/**
 * @description Connects to an LDAP server and resolves a client object used
 * to preform search and bind operations.
 *
 * @returns {Promise} resolve - an LDAP client object
 *                    reject - an error
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

    // Error check: ensure ldapCA is an array
    if (!Array.isArray(ldapCA)) {
      M.log.error('Failed to load LDAP CA certificates (invalid type)');
      return reject(new M.CustomError('An error occurred.', 500));
    }

    // If any items in the array are not strings, fail
    if (!utils.checkType(ldapCA, 'string')) {
      M.log.error('Failed to load LDAP CA certificates (invalid type in array)');
      return reject(new M.CustomError('An error occurred.', 500));
    }

    M.log.verbose('Reading LDAP server CAs...');

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
 * @description Searches for a user from LDAP server. Returns a promise that
 * resolves the user information on success.
 *
 * @param {Object} ldapClient - LDAP client
 * @param {String} username - Username to find LDAP user
 * @returns {Promise} resolve - LDAP user information
 *                    reject - an error
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
 * @description Authenticates a user against an LDAP server.
 *
 * @param {Object} ldapClient - LDAP client
 * @param {Object} user - LDAP user
 * @param {String} password - Password to verify LDAP user
 * @returns {Promise} resolve - authenticated user's information
 *                    reject - an error
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
 * @description Synchronizes authenticated user's LDAP information with the local
 * MBEE database.
 *
 * @param {Object} ldapUserObj - LDAP user information
 * @returns {Promise} resolve - synchronized user model object
 *                    reject - an error
 */
function ldapSync(ldapUserObj) {
  M.log.debug('Synchronizing LDAP user with local database.');
  // Define and return promise
  return new Promise((resolve, reject) => {
    // Search for user in database
    UserController.findUser({ admin: true }, ldapUserObj[ldapConfig.attributes.username])
    .then(foundUser => {
      // User exists, update database with LDAP information
      const userSave = foundUser;
      userSave.fname = ldapUserObj[ldapConfig.attributes.firstName];
      userSave.preferredName = ldapUserObj[ldapConfig.attributes.preferredName];
      userSave.lname = ldapUserObj[ldapConfig.attributes.lastName];
      userSave.email = ldapUserObj[ldapConfig.attributes.eMail];

      // Save updated user to database
      foundUser.save()
      // Save successful, resolve user model object
      .then(userSaveUpdate => resolve(userSaveUpdate))
      // Save failed, reject error
      .catch(saveErr => reject(saveErr));
    })
    .catch(findUserErr => {
      // Find user failed, check error message NOT 'Not Found'
      if (findUserErr.message !== 'Not Found') {
        // Error message NOT 'Not Found', reject error
        return reject(findUserErr);
      }
      // Error message 'Not Found', create user in database
      // Initialize userData with LDAP information
      const initData = new User({
        username: ldapUserObj[ldapConfig.attributes.username],
        fname: ldapUserObj[ldapConfig.attributes.firstName],
        preferredName: ldapUserObj[ldapConfig.attributes.preferredName],
        lname: ldapUserObj[ldapConfig.attributes.lastName],
        email: ldapUserObj[ldapConfig.attributes.eMail],
        provider: 'ldap'
      });

      // Save ldap user
      return initData.save()
      // Save successful, resolve user model object
      .then(userSaveNew => resolve(userSaveNew))
      // Save failed, reject error
      .catch(saveErr => reject(saveErr));
    });
  });
}
