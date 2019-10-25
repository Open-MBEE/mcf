/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.ui-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Leah De Laurell
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 * @author Jake Ursetta
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
  adminConsole,
  profile,
  organization,
  project,
  swaggerDoc,
  showAboutPage,
  showLoginPage,
  login,
  logout,
  notFound
};

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const swaggerJSDoc = require('swagger-jsdoc');

// MBEE modules
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');

/**
 * @description Renders the home page.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function home(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical('/ executed with invalid req.user object');
    // redirect to the login screen
    res.redirect('/login');
  }
  // Render the MBEE home screen
  return utils.render(req, res, 'home', {
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the admin console.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 */
function adminConsole(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical('/admin executed with invalid req.user object');

    // redirect to the login screen
    res.redirect('/login');
  }
  utils.render(req, res, 'admin-console', {
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the current user's page.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 */
function profile(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical('/profile executed with invalid req.user object');
    // redirect to the login screen
    res.redirect('/login');
  }
  utils.render(req, res, 'profile', {
    name: 'profile',
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the organization page.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function organization(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical('/ executed with invalid req.user object');
    // redirect to the login screen
    res.redirect('/login');
  }
  // Render the MBEE home screen
  return utils.render(req, res, 'organization', {
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the project page.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function project(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical('/ executed with invalid req.user object');
    // redirect to the login screen
    res.redirect('/login');
  }
  // Render the MBEE home screen
  return utils.render(req, res, 'project', {
    title: 'MBEE | Model-Based Engineering Environment'
  });
}

/**
 * @description Renders the flight manual.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
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
 * @description Generates the Swagger specification based on the Swagger JSDoc
 * in the API routes file.
 *
 * @returns {Function} The swaggerJSDoc function.
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
 * @description Renders the swagger doc.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
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
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function showAboutPage(req, res) {
  return utils.render(req, res, 'about', {
    info: {
      version: M.version,
      build: M.build,
      commit: M.commit
    },
    title: 'About | Model-Based Engineering Environment'
  });
}

/**
 * @description This page renders the login screen. If a get query parameter
 * called "next" is passed in the URL, the next url rendered as a hidden input
 * to tell the login process where to redirect the user after a successful
 * login.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
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
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
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
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 */
function logout(req, res) {
  // Sanity check: confirm req.user exists
  if (!req.user) {
    M.log.critical('/logout executed with invalid req.user object');
    // redirect to the login screen
    res.redirect('/login');
  }
  // destroy the session
  req.user = null;
  req.session.destroy();

  // redirect to the login screen
  res.redirect('/login');
}

/**
 * @description This is  for pages that were not found.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function notFound(req, res) {
  // render the 404 not found page
  return utils.render(req, res, '404');
}
