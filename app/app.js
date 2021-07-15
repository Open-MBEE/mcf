/* eslint-disable no-case-declarations */
/**
 * @classification UNCLASSIFIED
 *
 * @module app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Josh Kaplan
 * @author Austin Bieber
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
const flash = require('express-flash');
const compression = require('compression');
const Redis = require('ioredis');
const cors = require('cors');

// MBEE modules
const db = M.require('db');
const utils = M.require('lib.utils');
const middleware = M.require('lib.middleware');
const migrate = M.require('lib.migrate');
const Artifact = M.require('models.artifact');
const Branch = M.require('models.branch');
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const ServerData = M.require('models.server-data');
const User = M.require('models.user');
const Webhook = M.require('models.webhook');
const UIController = M.require('controllers.ui-controller');
const allowlist = M.config.server.corsAllowList;

// Cors options
const corsOptions = {
  credentials: true, // This is important.
  origin: (origin, callback) => {
    if (!origin || allowlist.includes(origin)) {
      return callback(null, true);
    }
    else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// Publisher
const publisher = require('./lib/pubsub/publisher');
const subscriber = require('./lib/pubsub/subscriber');

// Initialize Redis
const redisClient = new Redis(M.config.auth.session.redis_port, M.config.auth.session.redis_host);
const RedisStore = require('connect-redis')(session);

// Initialize express app and export the object
const app = express();
module.exports = app;

/**
 * Connect to database, initialize application, and create default admin and
 * default organization if needed.
 */
db.connect()
.then(() => initModels())
.then(() => migrate.getVersion())
.then(() => createDefaultOrganization())
.then(() => createDefaultAdmin())
.then(() => initApp())
.then(() => initIntegratedServices())
.catch(err => {
  M.log.critical(err.stack);
  process.exit(1);
});

redisClient.on('connect', () => {
  M.log.info('Redis successfully connected');
});

redisClient.on('end', () => {
  M.log.critical('Redis disconnected');
});

redisClient.on('error', (err) => {
  M.log.critical('Redis error: ', err);
});

redisClient.on('reconnecting', () => {
  M.log.info('Reconnecting Redis');
});

/**
 * @description Initializes the application and exports app.js.
 *
 * @returns {Promise} Resolves an empty promise upon completion.
 */
function initApp() {
  return new Promise((resolve) => {
    // Compress responses
    app.use(compression());

    // Configure the static/public directory
    const staticDir = path.join(__dirname, '..', 'build', 'public');
    app.use(express.static(staticDir));
    app.use('/favicon.ico', express.static('build/public/img/favicon.ico'));

    // for parsing application/json
    app.use(bodyParser.json({ limit: M.config.server.requestSize || '50mb' }));
    app.use(bodyParser.text());
    app.options('*', cors(corsOptions));
    app.use(cors(corsOptions));

    // for parsing application/xwww-form-urlencoded
    app.use(bodyParser.urlencoded({ limit: M.config.server.requestSize || '50mb',
      extended: true }));

    // Trust proxy for IP logging
    app.enable('trust proxy');

    // Remove powered-by from headers
    app.disable('x-powered-by');

    // Configures ejs views/templates
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(expressLayouts);

    // Configure sessions. Uses Redis
    const units = utils.timeConversions[M.config.auth.session.units];
    app.use(session({
      name: 'SESSION_ID',
      secret: M.config.server.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: M.config.auth.session.expires * units,
        secure: M.config.auth.session.cookie.secure,
        httpOnly: M.config.auth.session.cookie.httpOnly,
        sameSite: M.config.auth.session.cookie.sameSite
      },
      store: new RedisStore({
        host: M.config.auth.session.redis_host,
        port: M.config.auth.session.redis_port,
        client: redisClient,
        ttl: 86400
      })
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
      const PluginRoutesPath = path.join(M.root, 'plugins', 'routes.js');
      const PluginRouter = require(PluginRoutesPath).router; // eslint-disable-line global-require
      app.use('/plugins', PluginRouter);
      M.log.verbose('Plugins initialized.');
    }

    // Load the UI/other routes
    if (M.config.server.ui.enabled) {
      app.get('/doc/api',
        middleware.logRoute,
        UIController.swaggerDoc);
      app.get('/doc/flight-manual',
        middleware.logRoute,
        UIController.flightManual);
      app.use(M.config.server.ui.basePath, middleware.logRoute, (req, res) => {
        res.sendFile(path.join(M.root, 'build', 'public', 'index.html'));
      });
    }
    return resolve();
  });
}

/**
 * @description Creates a default organization if one does not already exist.
 * @async
 *
 * @returns {Promise} Resolves an empty promise upon completion.
 */
async function createDefaultOrganization() {
  try {
    // Find all users
    const users = await User.find({});
    // Set userIDs to the _id of the users array
    const userIDs = users.map(u => u._id);

    // Find the default organization
    const defaultOrgQuery = { _id: M.config.server.defaultOrganizationId };
    const org = await Organization.findOne(defaultOrgQuery);

    // Check if org is NOT null
    if (org !== null) {
      // Default organization exists, prune user permissions to only include
      // users currently in the database.
      Object.keys(org.permissions)
      .forEach((user) => {
        if (!userIDs.includes(user)) {
          delete org.permissions.user;
        }
      });

      // Save the updated organization
      await Organization.updateOne(defaultOrgQuery, { permissions: org.permissions });
    }
    else {
      // Default organization does NOT exist, create it and add all active users
      // to permissions list
      const defaultOrg = {
        _id: M.config.server.defaultOrganizationId,
        name: M.config.server.defaultOrganizationName,
        permissions: {}
      };

      // Add each existing user to default org
      userIDs.forEach((user) => {
        defaultOrg.permissions[user] = ['read', 'write'];
      });

      // Save new default organization
      await Organization.insertMany(defaultOrg);

      M.log.info('Default Organization Created');
    }
  }
  catch (error) {
    throw new M.ServerError('Failed to create the default organization.', 'error');
  }
}

/**
 * @description Creates a default admin if a global admin does not already exist.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function createDefaultAdmin() {
  try {
    // Search for a user who is a global admin
    const user = await User.findOne({ admin: true });

    // If user is null, create the admin user
    if (user === null) {
      // No global admin exists, create local user as global admin
      const adminUserData = {
        // Set username and password of global admin user from configuration.
        _id: M.config.server.defaultAdminUsername,
        password: M.config.server.defaultAdminPassword,
        provider: 'local',
        admin: true,
        changePassword: false
      };

      User.hashPassword(adminUserData);

      // Save the admin user
      await User.insertMany(adminUserData);

      // Find the default org
      const defaultOrgQuery = { _id: M.config.server.defaultOrganizationId };
      const defaultOrg = await Organization.findOne(defaultOrgQuery);

      // Add default admin to default org
      defaultOrg.permissions[M.config.server.defaultAdminUsername] = ['read', 'write'];

      // Save the updated default org
      await Organization.updateOne(defaultOrgQuery, { permissions: defaultOrg.permissions });

      M.log.info('Default Admin Created');
    }
  }
  catch (error) {
    throw new M.ServerError('Failed to create the default admin.', 'error');
  }
}

/**
 * @description Initializes all models asynchronously.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function initModels() {
  await Promise.all([Artifact.init(), Branch.init(), Element.init(),
    Organization.init(), Project.init(), ServerData.init(), User.init(),
    Webhook.init()]);
}

/**
 * @description Initializes all integrated services.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function initIntegratedServices() {
  // Get list of integration services
  const allServices = await publisher.get('INTEGRATED_SERVICES');
  M.config.integratedServices = JSON.parse(allServices);
  M.log.info('Integrated services initialized.');

  // Subscribe to Redis channels
  const channels = ['NEW_AUTH_INTEGRATION_KEY'];
  subscriber.subscribe(channels, (err, count) => {
    M.log.info(`Subscribed to ${count} of Redis channels`);
  });

  // Listen to all messages from all channels
  subscriber.on('message', async function(channel, message) {
    const parsedMessage = JSON.parse(message);

    switch (channel) {
      case 'NEW_AUTH_INTEGRATION_KEY':
        const user = await User.findOne({ _id: parsedMessage.user });

        // integration key
        const integrationKey = {
          name: parsedMessage.name,
          key: parsedMessage.key
        };

        // store user password as integration key
        user.integration_keys.push(integrationKey);
        await User.updateOne({ _id: parsedMessage.user }, { integration_keys: [integrationKey] });
        break;
      default:
    }
  });
}
