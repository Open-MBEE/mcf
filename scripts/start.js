#!/usr/bin/env node
/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.start
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Initializes and starts the http/https servers and listens
 * for incoming requests.
 */

// Error Check - Check if file was run directly or global M object is undefined
if (module.parent == null || typeof M === 'undefined') {
  // File was run directly, print error message and exit process
  // eslint-disable-next-line no-console
  console.log('\nError: please use mbee to run this script by using the '
    + 'following command. \n\nnode mbee start\n');
  process.exit(-1);
}

// Node modules
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// NPM Modules
const express = require('express');

// MBEE modules
const app = M.require('app');
const startup = M.require('lib.startup');


/**
 * @description Starts the MBEE server using the configuration file
 */
function start(args) {
  M.log.debug(`${`+ mbee.js executed as ${process.argv.join(' ')} `
  + `with env=${M.env} and configuration: `}${JSON.stringify(M.config)}`);

  startup(); // Print startup banner

  // Initialize httpServer and httpsServer objects
  let httpServer = null;
  let httpsServer = null;

  // Create HTTP Server
  // Note: The server is not being run until both the http and https objects
  // have been successfully created
  if (M.config.server.http.enabled) {
    // If set to redirect to HTTPS
    // create an app that redirects all routes to HTTPS
    if (M.config.server.http.redirectToHTTPS) {
      const redirectApp = express();
      redirectApp.use('*', (req, res) => {
        const host = req.hostname;
        const port = M.config.server.https.port;
        const originalRoute = req.originalUrl;
        res.redirect(`https://${host}:${port}${originalRoute}`);
      });
      httpServer = http.createServer(redirectApp);
    }
    // Otherwise, use the imported app for HTTP
    else {
      httpServer = http.createServer(app);
    }

    // If a timeout is defined in the config, set it
    if (M.config.server.requestTimeout) {
      httpServer.setTimeout(M.config.server.requestTimeout);
    }
  }

  // Create HTTPS Server
  // Note: The server is not being run until both the http and https objects
  // have been successfully created
  if (M.config.server.https.enabled) {
    // Set https credentials
    const privateKey = fs.readFileSync(path.join(M.root, M.config.server.https.sslKey), 'utf8');
    const certificate = fs.readFileSync(path.join(M.root, M.config.server.https.sslCert), 'utf8');
    const credentials = {
      key: privateKey,
      cert: certificate
    };
    httpsServer = https.createServer(credentials, app);

    // If a timeout is defined in the config, set it
    if (M.config.server.requestTimeout) {
      httpsServer.setTimeout(M.config.server.requestTimeout);
    }
  }

  // Run HTTP Server
  if (M.config.server.http.enabled) {
    httpServer.listen(M.config.server.http.port, () => {
      const port = M.config.server.http.port;
      M.log.info(`MBEE server listening on port ${port}!`);
    });
  }

  // Run HTTPS Server
  if (M.config.server.https.enabled) {
    httpsServer.listen(M.config.server.https.port, () => {
      const port = M.config.server.https.port;
      M.log.info(`MBEE server listening on port ${port}!`);
    });
  }
}

module.exports = start;
