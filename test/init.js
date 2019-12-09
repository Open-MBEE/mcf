/**
 * @classification UNCLASSIFIED
 *
 * @module test.init
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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
const db = M.require('db');

// Before function, is run before any tests are run
before(async () => {
  try {
    // Connect to the database
    await db.connect();

    // Initialize all models
    await Artifact.init();
    await Branch.init();
    await Element.init();
    await Organization.init();
    await Project.init();
    await ServerData.init();
    await User.init();

    // Disconnect from the database
    await db.disconnect();
  }
  catch (error) {
    M.log.error(error);
    process.exit(1);
  }
});
