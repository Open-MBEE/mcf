/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.ui-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This implements the behavior and logic for the user interface.
 * All UI routes map to this controller which in turn uses other controllers to
 * handle other object behaviors.
 */

// Expose UI controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  home,
  flightManual,
  organizations,
  projects,
  whoami,
  swaggerDoc,
  showAboutPage,
  showLoginPage,
  login,
  logout
};

// Node modules
const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

// MBEE modules
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');

/**
 * @description Renders the home page.
 */
function home(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical(new M.CustomError('/ executed with invalid req.user object'));
    // redirect to the login screen
    res.redirect('/login');
  }
  // Render the MBEE home screen
  return utils.render(req, res, 'home', {
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the flight manual.
 */
function flightManual(req, res) {
  // Read the flight manual sections from the doc directory
  fs.readdir(`${M.root}/build/fm`, (err, files) => {
    if (err) {
      M.log.error(err);
      return res.status(500).send('Internal Server Error.');
    }

    // Turn the file names into section IDs and titles
    const sections = [];
    files.filter(fname => fname.endsWith('.html')).forEach(section => {
      const sectionID = section.replace('.html', '');
      const sectionTitle = sectionID.replace(/-/g, ' ');
      sections.push({
        id: sectionID.replace(/\./g, '-').replace(':', ''),
        title: utils.toTitleCase(sectionTitle, true),
        content: fs.readFileSync(`${M.root}/build/fm/${section}`)
      });
    });
    // Render the flight manual
    return utils.render(req, res, 'flight-manual', {
      sections: sections
    });
  });
}

/**
 * @description Renders an organization page.
 */
function organizations(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical(new M.CustomError('/:orgid executed with invalid req.user object'));
    // redirect to the login screen
    res.redirect('/login');
  }
  utils.render(req, res, 'organizations', {
    name: 'organizations',
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the project list page.
 */
function projects(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical(new M.CustomError('/:orgid/:projectid executed with invalid req.user object'));
    // redirect to the login screen
    res.redirect('/login');
  }
  utils.render(req, res, 'projects', {
    name: 'projects',
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the current user's page.
 */
function whoami(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical(new M.CustomError('/whoami executed with invalid req.user object'));
    // redirect to the login screen
    res.redirect('/login');
  }
  utils.render(req, res, 'user', {
    name: 'user',
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Generates the Swagger specification based on the Swagger JSDoc
 * in the API routes file.
 */
function swaggerSpec() {
  return swaggerJSDoc({
    swaggerDefinition: {
      info: {
        title: 'MBEE API Documentation',       // Title (required)
        version: M.version                     // Version (required)
      }
    },
    apis: [
      path.join(M.root, 'app', 'api-routes.js') // Path to the API docs
    ]
  });
}

/**
 * GET /api/doc
 *
 * @description Renders the swagger doc.
 */
function swaggerDoc(req, res) {
  return utils.render(req, res, 'swagger', {
    swagger: swaggerSpec(),
    title: 'API Documentation | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the about page. This page is accessible even when users are not
 * signed in. Therefore, this function has some logic to identify whether
 * or not the user is logged in.
 */
function showAboutPage(req, res) {
  return utils.render(req, res, 'about', {
    info: {
      version: M.version
    },
    title: 'About | Model-Based Engineering Environment'
  });
}

/**
 * @description This page renders the login screen. If a get query parameter
 * called "next" is passed in the URL, the next url rendered as a hidden input
 * to tell the login process where to redirect the user after a successful
 * login.
 */
function showLoginPage(req, res) {
  let next = '';
  // make sure the passed in "next" parameter is valid
  if (RegExp(validators.url.next).test(req.query.next)) {
    next = req.query.next;
  }

  // render the login page
  return utils.render(req, res, 'login', {
    title: 'Login | Model-Based Engineering Environment',
    next: next,
    err: req.flash('loginError')
  });
}

/**
 * @description This is the final function in the UI authentication chain. First,
 * the authentication controller's authenticate() and doLogin() functions
 * are called. This function should only get called once login was
 * successful. It handles the appropriate redirect for the user.
 */
function login(req, res) {
  // make sure the passed in "next" parameter is valid
  let next = null;
  if (RegExp(validators.url.next).test(req.body.next)) {
    next = req.body.next;
  }
  else if (req.user.custom.hasOwnProperty('homepage')) {
    next = req.user.custom.homepage;
  }
  else {
    next = '/';
  }

  // handle the redirect
  M.log.info(`Redirecting to ${next} ...`);
  res.redirect(next);
}

/**
 * @description Logs out the user by un-setting the req.user object and the
 * req.session.token object.
 */
function logout(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical(new M.CustomError('/logout executed with invalid req.user object'));
    // redirect to the login screen
    res.redirect('/login');
  }
  // destroy the session
  req.user = null;
  req.session.destroy();

  // redirect to the login screen
  res.redirect('/login');
}
