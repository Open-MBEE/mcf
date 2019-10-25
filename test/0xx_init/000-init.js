/**
 * @classification UNCLASSIFIED
 *
 * @module test.000-init
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 * @author Austin Bieber
 *
 * @description This "test" is used to clean out the database before other
 * tests. It SHOULD NOT be run if testing against production databases. It
 * is intended for use in CI/CD testing to ensure the database is empty and
 * improve CI testing.
 */

// NPM modules
const chai = require('chai');

// Node.js Modules
const { execSync } = require('child_process');
const path = require('path');

// MBEE modules
const Artifact = M.require('models.artifact');
const Branch = M.require('models.branch');
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const ServerData = M.require('models.server-data');
const User = M.require('models.user');
const db = M.require('lib.db');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), function() {
  /**
   * Runs before all tests . Opens the database connection.
   */
  before((done) => {
    db.connect()
    .then(() => done())
    .catch((error) => {
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /**
   * Runs after all tests. Close database connection.
   */
  after((done) => {
    db.disconnect()
    .then(() => done())
    .catch((error) => {
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /**
   * Execute the tests.
   */
  it('clean database', cleanDB);
  it('should initialize the models', initModels);
  it('should create the default org if it doesn\'t exist', createDefaultOrg);
  it('should clear local artifact storage folder', clearArtifactStorage);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Cleans out the database by removing all items from all
 * collections.
 *
 * @returns {Promise} Resolves upon successful deletion of all contents
 * from the database.
 */
async function cleanDB() {
  try {
    await db.clear();
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Initializes all models asynchronously. Adds the single server
 * data document to the database, and ensures the element and user indexes are
 * created for 4xx search tests.
 * @async
 *
 * @returns {Promise} Resolves upon successful initiation of models.
 */
async function initModels() {
  try {
    // Initialize all models
    await Artifact.init();
    await Branch.init();
    await Element.init();
    await Organization.init();
    await Project.init();
    await ServerData.init();
    await User.init();

    // Insert server data
    await ServerData.insertMany([{ _id: 'server_data', version: M.schemaVersion }]);
  }
  catch (error) {
    M.log.critical('Failed to initialize models.');
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Creates the default org if it doesn't already exist.
 */
async function createDefaultOrg() {
  try {
    const org = await Organization.findOne({ _id: M.config.server.defaultOrganizationId });
    // Verify return statement
    chai.expect(org).to.equal(null);

    // Create default org object
    const defOrg = Organization.createDocument({
      _id: M.config.server.defaultOrganizationId,
      name: M.config.server.defaultOrganizationName,
      createdBy: null,
      lastModifiedBy: null
    });

    // Save the default org
    await defOrg.save();
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Clears the local artifact storage folder.
 */
function clearArtifactStorage() {
  const artifactPath = path.join(M.root, '/storage');
  // Remove artifacts
  const rmd = (process.platform === 'win32') ? 'RMDIR /S /Q' : 'rm -rf';
  execSync(`${rmd} ${artifactPath}/*`);
}
