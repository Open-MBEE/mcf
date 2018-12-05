/**
 * Classification: UNCLASSIFIED
 *
 * @module app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the MBEE App. Allows MBEE app to be imported by other modules.
 * This app is imported by start.js script which then runs the server.
 */

// Node modules
const path = require('path');

// NPM modules
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');

// MBEE modules
const db = M.require('lib.db');
const utils = M.require('lib.utils');
const middleware = M.require('lib.middleware');
const UserController = M.require('controllers.user-controller');
const Organization = M.require('models.organization');
const User = M.require('models.user');

// Initialize express app and export the object
const app = express();
module.exports = app;

/**
 * Connect to database, initialize application, and create
 * default admin and default organization if needed.
 */
db.connect()
.then(() => createDefaultAdmin())
.then(() => createDefaultOrganization())
.then(() => initApp())
.catch(err => {
  M.log.critical(err.stack);
  process.exit(1);
});

/**
 * @description Initializes the application and exports app.js
 */
function initApp() {
  return new Promise((resolve, reject) => {
    // Configure the static/public directory
    const staticDir = path.join(__dirname, '..', 'build', 'public');
    app.use(express.static(staticDir));
    app.use('/favicon.ico', express.static('build/public/img/favicon.ico'));

    // Allows receiving JSON in the request body
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Trust proxy for IP logging
    app.enable('trust proxy');

    // Configures ejs views/templates
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(expressLayouts);

    // Configure sessions
    const units = utils.timeConversions[M.config.auth.session.units];
    app.use(session({
      name: 'SESSION_ID',
      secret: M.config.server.secret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: M.config.auth.session.expires * units },
      store: new MongoStore({ mongooseConnection: mongoose.connection })
    }));

    // Enable flash messages
    app.use(flash());

    // Log IP address of all incoming requests
    app.use(middleware.logIP);

    // Load the API Routes
    if (M.config.server.api.enabled) {
      app.use('/api', M.require('api-routes'));
    }

    // Load the plugin routes
    if (M.config.server.plugins.enabled) {
      M.log.verbose('Initializing plugins ...');
      const PluginRoutesPath = path.join(__dirname, '..', 'plugins', 'routes.js');
      const PluginRouter = require(PluginRoutesPath).router; // eslint-disable-line global-require
      app.use('/plugins', PluginRouter);
      M.log.verbose('Plugins initialized.');
    }

    // Load the UI/other routes
    if (M.config.server.ui.enabled) {
      app.use('/', M.require('routes'));
    }
    return resolve();
  });
}

// Create default organization if it does not exist
function createDefaultOrganization() {
  return new Promise((resolve, reject) => {
    // Initialize createdOrg
    let createdOrg = false;
    // Initialize userIDs
    let userIDs = null;

    // Find all users
    UserController.findUsers({ admin: true })
    .then(users => {
      // Set userIDs to the _id of the users array
      userIDs = users.map(u => u._id);
      // Find the default organization
      return Organization.findOne({ id: M.config.server.defaultOrganizationId });
    })
    .then(org => {
      // Check if org is NOT null
      if (org !== null) {
        // Default organization exists, prune user permissions to only include
        // active users.
        org.permissions.read = userIDs;
        org.permissions.write = userIDs;
        return org.save();
      }
      // Set createdOrg to true
      createdOrg = true;
      // Default organization does NOT exist, create it and add all active users
      // to permissions list
      const defaultOrg = new Organization({
        id: M.config.server.defaultOrganizationId,
        name: M.config.server.defaultOrganizationName,
        permissions: {
          read: userIDs,
          write: userIDs
        }
      });
      // Save new default organization
      return defaultOrg.save();
    })
    // Resolve on success of saved organization
    .then(() => {
      if (createdOrg) {
        M.log.info('Default Organization Created');
      }
      return resolve();
    })
    // Catch and reject error
    .catch(error => reject(error));
  });
}

// Create default admin if a global admin does not exist
function createDefaultAdmin() {
  return new Promise((resolve, reject) => {
    // Initialize userCreated
    let userCreated = false;
    // Search for a user who is a global admin
    User.findOne({ admin: true })
    .then(user => {
      // Check if the user is NOT null
      if (user !== null) {
        // Global admin already exists, resolve
        return resolve();
      }
      // set userCreated to true
      userCreated = true;
      // No global admin exists, create local user as global admin
      const adminUserData = new User({
        // Set username and password of global admin user from configuration.
        username: M.config.server.defaultAdminUsername,
        password: M.config.server.defaultAdminPassword,
        provider: 'local',
        admin: true
      });
      // Save new global admin user
      return adminUserData.save();
    })
    // Resolve on success of saved admin
    .then(() => {
      if (userCreated) {
        M.log.info('Default Admin Created');
      }
      return resolve();
    })
    // Catch and reject error
    .catch(error => reject(error));
  });
}
