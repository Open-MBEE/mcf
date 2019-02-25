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
const migrate = M.require('lib.migrate');
const Organization = M.require('models.organization');
const User = M.require('models.user');

// Initialize express app and export the object
const app = express();
module.exports = app;

/**
 * Connect to database, initialize application, and create default admin and
 * default organization if needed.
 */
db.connect()
.then(() => getSchemaVersion())
.then(() => createDefaultOrganization())
.then(() => createDefaultAdmin())
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

    // for parsing application/json
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.text());

    // for parsing application/xwww-form-urlencoded
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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
    User.find({})
    .then(users => {
      // Set userIDs to the _id of the users array
      userIDs = users.map(u => u._id);
      // Find the default organization
      return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
    })
    .then(org => {
      // Check if org is NOT null
      if (org !== null) {
        // Default organization exists, prune user permissions to only include
        // users currently in the database.
        Object.keys(org.permissions).forEach((user) => {
          if (!userIDs.includes(user)) {
            delete org.permissions.user;
          }
        });

        // Mark the permissions field modified, require for 'mixed' fields
        org.markModified('permissions');

        // Save the update organization
        return org.save();
      }
      // Set createdOrg to true
      createdOrg = true;
      // Default organization does NOT exist, create it and add all active users
      // to permissions list
      const defaultOrg = new Organization({
        _id: M.config.server.defaultOrganizationId,
        name: M.config.server.defaultOrganizationName
      });

      // Add each existing user to default org
      userIDs.forEach((user) => {
        defaultOrg.permissions[user] = ['read', 'write'];
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
        _id: M.config.server.defaultAdminUsername,
        password: M.config.server.defaultAdminPassword,
        provider: 'local',
        admin: true
      });
      // Save new global admin user
      return adminUserData.save();
    })
    .then(() => Organization.findOne({ _id: M.config.server.defaultOrganizationId }))
    .then((defaultOrg) => {
      // Add default admin to default org
      defaultOrg.permissions[M.config.server.defaultAdminUsername] = ['read', 'write'];

      defaultOrg.markModified('permissions');

      // Save the updated default org
      return defaultOrg.save();
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

/**
 * @description Gets the schema version from the database. Runs the migrate
 * function if no schema version exists.
 */
function getSchemaVersion() {
  return new Promise((resolve, reject) => {
    // Get all collections in the DB
    mongoose.connection.db.collections()
    .then((collections) => {
      // Get all collection names
      const existingCollections = collections.map(c => c.s.name);
      // Create the server_data collection if it doesn't exist
      if (!existingCollections.includes('server_data')) {
        return mongoose.connection.db.createCollection('server_data');
      }
    })
    // Get all documents from the server data
    .then(() => mongoose.connection.db.collection('server_data').find({}).toArray())
    .then((serverData) => {
      // Restrict collection to one document
      if (serverData.length > 1) {
        throw new Error('Cannot have more than one document in the server_data collection.');
      }
      // No server data found, automatically upgrade versions
      if (serverData.length === 0) {
        M.log.info('No server data found, automatically migrating.');
        return migrate.migrate([]);
      }
      // One document exists, read and compare versions
      if (serverData.length === 0 || serverData[0].version !== M.schemaVersion) {
        throw new Error('Please run \'node mbee migrate\' to migrate the '
          + 'database.');
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
