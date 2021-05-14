/**
 * @classification UNCLASSIFIED
 *
 * @module test.init
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Runs asynchronous initialization functions before any tests are
 * run.
 */

// MBEE modules
const Artifact = M.require('models.artifact');
const Branch = M.require('models.branch');
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const ServerData = M.require('models.server-data');
const User = M.require('models.user');
const Webhook = M.require('models.webhook');
const db = M.require('db');

// Before function, is run before any tests are run
before(async () => {
  try {
    // Connect to the database
    await db.connect();

    // Initialize all models
    await Promise.all([Artifact.init(), Branch.init(), Element.init(),
      Organization.init(), Project.init(), ServerData.init(), User.init(),
      Webhook.init()]);
  }
  catch (error) {
    M.log.error(error);
    process.exit(1);
  }
});

// After function, is run after all tests are run
after(async () => {
  try {
    // Disconnect from the database
    await db.disconnect();
  }
  catch (error) {
    M.log.error(error);
    process.exit(1);
  }
});
