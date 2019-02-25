/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.auth
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file loads and instantiates the authentication strategy
 * defined in the configuration file.
 */

// MBEE modules
const AuthModule = M.require(`auth.${M.config.auth.strategy}`);
const sani = M.require('lib.sanitization');

// Error Check - Verify AuthModule is imported and implements required functions
if (!AuthModule.hasOwnProperty('handleBasicAuth')) {
  M.log.critical(`Error: Strategy (${M.config.auth.strategy}) does not implement handleBasicAuth`);
  process.exit(0);
}
if (!AuthModule.hasOwnProperty('handleTokenAuth')) {
  M.log.critical(`Error: Strategy (${M.config.auth.strategy}) does not implement handleTokenAuth`);
  process.exit(0);
}
if (!AuthModule.hasOwnProperty('doLogin')) {
  M.log.critical(`Error: Strategy (${M.config.auth.strategy}) does not implement doLogin`);
  process.exit(0);
}

/**
 * @description This function is the main authenticate function used to handle
 * supported type of authentication: basic, token, and form.
 *
 * This function implements different types of authentication according to
 * the strategy set up in the configuration file.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {function} next - Callback to express authentication
 */
function authenticate(req, res, next) {
  // Extract authorization metadata
  const authorization = req.headers.authorization;
  let username = null;
  let password = null;

  // Check if Authorization header exist
  if (authorization) {
    M.log.debug('Authorization header found');
    // Check it is a valid auth header
    const parts = authorization.split(' ');

    // Error Check - make sure two credentials were passed in
    if (parts.length < 2) {
      M.log.debug('Parts length < 2');

      // Return proper error for API route or redirect for UI
      return (req.originalUrl.startsWith('/api'))
        ? res.status(400).send('Bad Request')
        : res.redirect('/login');
    }
    // Get the auth scheme and check auth scheme is basic
    const scheme = parts[0];

    /**********************************************************************
     * Handle Basic Authentication
     **********************************************************************
     * This section authenticates a user via a basic auth.
     * This is primarily used with the API. While it can be used for any
     * API endpoint, the common approach is to pass credentials via
     * basic auth only for the "/api/login" route to retrieve a session
     * token.
     */
    // Check for basic authentication
    if (RegExp('Basic').test(scheme)) {
      // Scheme using basic token
      M.log.verbose('Authenticating user via Basic Token ...');

      // Extract credentials from auth header
      const credentials = Buffer.from(parts[1], 'base64').toString().split(':');

      // Error Check - make sure two credentials were passed in
      if (credentials.length < 2) {
        M.log.debug('Credentials length < 2');

        // return proper error for API route or redirect for UI
        return (req.originalUrl.startsWith('/api'))
          ? res.status(400).send('Bad Request')
          : res.redirect('/login');
      }

      // Sanitize username
      username = sani.sanitize(credentials[0]);
      password = credentials[1];

      // Error check - username/password not empty
      if (!username || !password || username === '' || password === '') {
        M.log.debug('Username or password not provided.');
        // return proper error for API route or redirect for UI
        return (req.originalUrl.startsWith('/api'))
          ? res.status(401).send('Unauthorized')
          : res.redirect('back');
      }
      // Handle Basic Authentication
      AuthModule.handleBasicAuth(req, res, username, password)
      .then(user => {
        // Successfully authenticated basic auth!
        M.log.info(`Authenticated [${user.username}] via Basic Auth`);

        // Set user req object
        req.user = user;

        // Move to the next function
        next();
      })
      .catch(err => {
        // Log the error
        M.log.error(err.stack);
        if (err.description === 'Invalid username or password.') {
          req.flash('loginError', err.message);
        }
        else {
          req.flash('loginError', 'Internal Server Error');
        }

        // return proper error for API route or redirect for UI
        return (req.originalUrl.startsWith('/api'))
          ? res.status(401).send(err)
          : res.redirect(`/login?next=${req.originalUrl}`);
      });
    }

    /**********************************************************************
     * Handle Token Authentication
     **********************************************************************
     * This section authenticates a user via a bearer token.
     * This is primarily used when the API is being called via a script
     * or some other external method such as a microservice.
     */
    // Check for token authentication
    else if (RegExp('Bearer').test(scheme)) {
      M.log.verbose('Authenticating user via Token Auth ...');

      // Convert token to string
      const token = Buffer.from(parts[1], 'utf8').toString();

      // Handle Token Authentication
      AuthModule.handleTokenAuth(req, res, token)
      .then(user => {
        // Successfully authenticated token auth!
        M.log.info(`Authenticated [${user.username}] via Token Auth`);

        // Set user req object
        req.user = user;

        // Move to the next function
        next();
      })
      .catch(err => {
        M.log.error(err.stack);
        if (err.description === 'Invalid username or password.') {
          req.flash('loginError', err.description);
        }
        else {
          req.flash('loginError', 'Internal Server Error');
        }
        // return proper error for API route or redirect for UI
        return (req.originalUrl.startsWith('/api'))
          ? res.status(401).send('Unauthorized')
          : res.redirect(`/login?next=${req.originalUrl}`);
      });
    }
    // Other authorization header
    else {
      M.log.verbose('Invalid authorization scheme.');
      // return proper error for API route or redirect for UI
      return (req.originalUrl.startsWith('/api'))
        ? res.status(401).send('Unauthorized')
        : res.redirect(`/login?next=${req.originalUrl}`);
    }
  } /* end if (authorization) */

  /**********************************************************************
   * Handle Form Input Authentication
   **********************************************************************
   * This section authenticates a user via form input. This is used
   * when users log in via the login form.
   *
   * The user's credentials are passed to the handleBasicAuth function.
   */
  // Check input credentials
  else if (req.body.username && req.body.password) {
    M.log.verbose('Authenticating user via Form Input Auth ...');

    // Sanitize username
    username = sani.sanitize(req.body.username);
    password = req.body.password;

    // Handle Basic Authentication
    AuthModule.handleBasicAuth(req, res, username, password)
    .then(user => {
      // Successfully authenticate credentials!
      M.log.info(`Authenticated [${user.username}] via Form Input`);

      // Set user req object
      req.user = user;

      // Move to the next function. Explicitly set error to null.
      next(null);
    })
    .catch(err => {
      M.log.error(err.stack);
      req.flash('loginError', 'Invalid username or password.');

      // return proper error for API route or redirect for UI
      // 'back' returns to the original login?next=originalUrl
      return (req.originalUrl.startsWith('/api'))
        ? res.status(401).send('Unauthorized')
        : res.redirect('back');
    });
  }

  /**********************************************************************
   * Handle Session Token Authentication
   **********************************************************************
   * This section authenticates a user via a stored session token.
   * The user's credentials are passed to the handleTokenAuth function.
   */
  // Check for token session
  else if (req.session.token) {
    M.log.verbose('Authenticating user via Session Token Auth...');
    const token = req.session.token;

    // Handle Token Authentication
    AuthModule.handleTokenAuth(req, res, token)
    .then(user => {
      // Successfully authenticated token session!
      M.log.info(`Authenticated [${user.username}] via Session Token Auth`);

      // Set user req object
      req.user = user;

      // Move to the next function
      next();
    })
    .catch(err => {
      // log the error
      M.log.warn(err.stack);
      req.flash('loginError', 'Session Expired');

      // return proper error for API route or redirect for UI
      return (req.originalUrl.startsWith('/api'))
        ? res.status(401).send('Unauthorized')
        : res.redirect(`/login?next=${req.originalUrl}`);
    });
  }

  // Verify if credentials are empty or null
  else {
    M.log.debug('Username or password not provided.');

    // return proper error for API route or redirect for UI
    return (req.originalUrl.startsWith('/api'))
      ? res.status(401).send('Unauthorized')
      : res.redirect(`/login?next=${req.originalUrl}`);
  }
}

/**
 * @description Validates a users password with set rules.
 * Note: If validatePassword() function is NOT defined in custom strategy then
 * validation will fail.
 *
 * @param {string} password - Password to validate
 * @param {string} provider - the type of authentication strategy (ldap, local,
 * etc.)
 *
 * @returns {boolean} - If password is correctly validated
 */
function validatePassword(password, provider) {
  // Check if custom validate password rules exist in auth strategy
  if (AuthModule.hasOwnProperty('validatePassword')) {
    return AuthModule.validatePassword(password, provider);
  }

  // Unknown provider, failed validation
  // Explicitly NOT logging error to avoid password logging
  return false;
}

// Export above functions
module.exports.authenticate = authenticate;
module.exports.doLogin = AuthModule.doLogin;
module.exports.handleBasicAuth = AuthModule.handleBasicAuth;
module.exports.handleTokenAuth = AuthModule.handleTokenAuth;
module.exports.validatePassword = validatePassword;
