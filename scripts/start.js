#!/usr/bin/env node
/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.start
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
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
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// NPM Modules
const express = require('express');
const spdy = require('spdy');

// MBEE modules
const app = M.require('app');
const startup = M.require('lib.startup');


/**
 * @description Starts the MBEE server using the configuration file.
 *
 * @param {string} args - Additional arguments to pass in when starting the MBEE server.
 */
function start(args) {
  M.log.debug(`${`+ mbee.js executed as ${process.argv.join(' ')} `
  + `with env=${M.env} and configuration: `}${JSON.stringify(M.config)}`);

  startup(); // Print startup banner

  // Create command to check if dependencies are up-to-date
  let cmd = 'yarn check --verify-tree';
  if (process.env.NODE_ENV === 'production') {
    cmd += ' --production';
  }

  try {
    // Run the command
    execSync(cmd);
  }
  catch (error) {
    // If failed, warn user and exit
    M.log.warn('Dependencies out of date! Please run \'yarn install\' or \'npm'
      + ' install\' to update the dependencies.');
    process.exit(1);
  }


  // Initialize httpServer and http2Server objects
  let httpServer = null;
  let http2Server = null;

  // Create HTTP Server
  // Note: The server is not being run until both the http and http/2 objects
  // have been successfully created
  if (M.config.server.http.enabled) {
    // If set to redirect to HTTPS
    // create an app that redirects all routes to HTTPS
    if (M.config.server.http.redirectToHTTPS) {
      if (M.config.server.https.enabled) {
        const redirectApp = express();
        redirectApp.use('*', (req, res) => {
          const host = req.hostname;
          const port = M.config.server.https.port;
          const originalRoute = req.originalUrl;
          res.redirect(`https://${host}:${port}${originalRoute}`);
        });
        httpServer = http.createServer(redirectApp);
      }
      else {
        // Warn the user that says HTTPS redirect is enabled but HTTPS is disabled.
        M.log.warn('HTTPS redirect is enabled but HTTPS is disabled.'
          + '  Continuing with HTTP instead.');
        httpServer = http.createServer(app);
      }
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

  // Create HTTP/2 Server
  // Note: The server is not being run until both the http and http/2 objects
  // have been successfully created
  if (M.config.server.https.enabled) {
    // Set http/2 options
    const privateKey = fs.readFileSync(path.join(M.root, M.config.server.https.sslKey), 'utf8');
    const certificate = fs.readFileSync(path.join(M.root, M.config.server.https.sslCert), 'utf8');
    const options = {
      key: privateKey,
      cert: certificate,
      protocol: ['h2']
    };
    http2Server = spdy.createServer(options, app);

    // If a timeout is defined in the config, set it
    if (M.config.server.requestTimeout) {
      http2Server.setTimeout(M.config.server.requestTimeout);
    }
  }

  // Run HTTP Server
  if (M.config.server.http.enabled) {
    httpServer.listen(M.config.server.http.port, () => {
      const port = M.config.server.http.port;
      M.log.info(`MBEE server listening on port ${port}!`);
    });
  }

  // Run HTTP/2 Server
  if (M.config.server.https.enabled) {
    http2Server.listen(M.config.server.https.port, () => {
      const port = M.config.server.https.port;
      M.log.info(`MBEE server listening on port ${port}!`);
    });
  }
}

module.exports = start;
