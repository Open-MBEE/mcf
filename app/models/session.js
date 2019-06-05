/**
 * Classification: UNCLASSIFIED
 *
 * @module models.session
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the session model.
 */

// NPM modules
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);

// Creates a new session model using connect-mongo
module.exports = new MongoStore({ mongooseConnection: mongoose.connection });
