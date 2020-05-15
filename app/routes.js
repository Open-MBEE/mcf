/**
 * @classification UNCLASSIFIED
 *
 * @module routes
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 *
 * @description Defines the MBEE routes mounted at '/'.
 */

// NPM modules
const express = require('express');
const router = express.Router();

// MBEE modules
const APIController = M.require('controllers.api-controller');
const UIController = M.require('controllers.ui-controller');
const AuthController = M.require('lib.auth');
const Middleware = M.require('lib.middleware');
const Validators = M.require('lib.validators');

/* ---------- Unauthenticated Routes ----------*/
/**
 * @description This renders the swagger doc page for the API routes.
 */
router.route('/doc/api')
.get(Middleware.logRoute, UIController.swaggerDoc);

/**
 * @description Both routes map to the same controller. The controller method handles
 * the logic of checking for the page parameter.
 */
router.route('/doc/developers')
.get(Middleware.logRoute, ((req, res) => res.redirect('/doc/index.html')));

/**
 * @description This renders the MBEE flight manual page.
 */
router.route('/doc/flight-manual')
.get(Middleware.logRoute, UIController.flightManual);

/* This renders the about page */
router.route('/about')
.get(
  Middleware.logRoute,
  UIController.showAboutPage
);

/* ---------- Authenticated Routes ----------*/
/**
 * @description GET shows the login page.
 * POST is the route that actually logs in the user.
 * It's the login form's submit action.
 */
router.route('/login')
.get(
  Middleware.logRoute,
  UIController.showLoginPage
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  AuthController.doLogin,
  APIController.login,
  UIController.login
);

/**
 * @description This renders the home page for logged in users.
 **/
router.route('/')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.home
);

/**
 * @description This renders the admin console to view user management
 * page for admins ONLY.
 **/
router.route('/admin')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.adminConsole
);

/**
 * @description This renders the admin console to view all organizations
 * for admins ONLY.
 **/
router.route('/admin/orgs')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.adminConsole
);

/**
 * @description This renders the admin console to view all projects
 * for admins ONLY.
 **/
router.route('/admin/projects')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.adminConsole
);

/**
 * @description This renders the user page for logged in users.
 **/
router.route('/profile')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  UIController.profile
);

// Parameter validation for the 'username' param
// eslint-disable-next-line consistent-return
router.param('username', (req, res, next, username) => {
  next();
});

/**
 * @description This renders the user page for logged in users.
 **/
router.route('/profile/:username')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.profile
);

/**
 * @description  Logs the user out by unsetting the req.user and req.session.token objects.
 */
router.route('/logout')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  UIController.logout
);

// Parameter validation for the 'orgid' param
// eslint-disable-next-line consistent-return
router.param('orgid', (req, res, next, orgid) => {
  if (RegExp(Validators.org.id).test(orgid)) {
    next();
  }
  else {
    return UIController.notFound();
  }
});

// Parameter validation for the 'projectid' param
// eslint-disable-next-line consistent-return
router.param('projectid', (req, res, next, project) => {
  next();
});

// Parameter validation for the 'projectid' param
// eslint-disable-next-line consistent-return
router.param('branchid', (req, res, next, branch) => {
  next();
});

// Parameter validation for the 'projectid' param
// eslint-disable-next-line consistent-return
router.param('elementid', (req, res, next, branch) => {
  next();
});

/**
 * @description This renders an organization for a user.
 **/
router.route('/orgs/:orgid')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.organization
);

/**
 * @description This renders an organization's member page for a user.
 **/
router.route('/orgs/:orgid/users')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.organization
);

/**
 * @description This renders an organization's projects page for a user.
 **/
router.route('/orgs/:orgid/projects')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.organization
);

/**
 * @description This renders a project for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/info')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project members page form for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/users')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project's element page for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/branches')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project's element page for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/branches/:branchid')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project's element page for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/branches/:branchid/elements')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project's element page for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/branches/:branchid/elements#:elementid')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project's artifacts page for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

/**
 * @description This renders a project's search page for a user.
 **/
router.route('/orgs/:orgid/projects/:projectid/branches/:branchid/search')
.get(
  AuthController.authenticate,
  Middleware.expiredPassword,
  Middleware.logRoute,
  UIController.project
);

module.exports = router;
