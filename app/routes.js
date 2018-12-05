/**
 * Classification: UNCLASSIFIED
 *
 * @module routes
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the MBEE routes mounted at '/'.
 */

// Node modules
const express = require('express');
const router = express.Router();

// MBEE modules
const UIController = M.require('controllers.ui-controller');
const AuthController = M.require('lib.auth');
const Middleware = M.require('lib.middleware');

/* ---------- Unauthenticated Routes ----------*/
/**
 * This renders the swagger doc page for the API routes
 */
router.route('/doc/api')
.get(Middleware.logRoute, UIController.swaggerDoc);

/**
 * Both routes map to the same controller. The controller method handles
 * the logic of checking for the page parameter.
 */
router.route('/doc/developers')
.get(Middleware.logRoute, ((req, res) => res.redirect('/doc/index.html')));

/* This renders the about page */
router.route('/about')
.get(
  Middleware.logRoute,
  UIController.showAboutPage
);

/* ---------- Authenticated Routes ----------*/
/**
 * GET shows the login page.
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
  UIController.login
);

/* This renders the home page for logged in users */
router.route('/')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  UIController.home
);

/**
 * Logs the user out by unsetting the req.user and req.session.token objects.
 */
router.route('/logout')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  UIController.logout
);

module.exports = router;
