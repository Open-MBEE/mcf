/**
 * @classification UNCLASSIFIED
 *
 * @module test.303a-project-model-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Leah De Laurell
 * @author Austin Bieber
 *
 * @description This tests the Project Model functionality. The project
 * model tests, create, find, update, and delete projects. THe tests also
 * test the max character limit on the ID field.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Project = M.require('models.project');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const adminUser = testData.adminUser;
const org = testData.orgs[0];

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: runs before all tests. Opens database connection.
   */
  before((done) => {
    db.connect()
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: runs after all tests. Closes database connection.
   */
  after((done) => {
    db.disconnect()
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  it('should create a project', createProject);
  it('should find a project', findProject);
  it('should update a project', updateProject);
  it('should delete a project', deleteProject);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a project using the project model and saves it to the
 * database.
 */
async function createProject() {
  // Create a project model object
  const newProject = {
    _id: utils.createID(org.id, testData.projects[0].id),
    name: testData.projects[0].name,
    org: org.id,
    permissions: {},
    visibility: 'private'
  };

  // Add the admin user to the permissions
  newProject.permissions[adminUser.username] = ['read', 'write', 'admin'];

  try {
    // Save project model object to database
    await Project.insertMany(newProject);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Finds a previously created project.
 */
async function findProject() {
  let proj;
  try {
    // Find the project
    proj = await Project.findOne({ _id: utils.createID(org.id, testData.projects[0].id) });
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Ensure project data is correct
  proj._id.should.equal(utils.createID(org.id, testData.projects[0].id));
  proj.name.should.equal(testData.projects[0].name);
}

/**
 * @description Updates a projects name.
 */
async function updateProject() {
  try {
    const projID = utils.createID(org.id, testData.projects[0].id);
    // Update the name of the project created in the createProject() test
    await Project.updateOne({ _id: projID }, { name: 'Updated Name' });

    // Find the updated project
    const foundProject = await Project.findOne({ _id: projID });

    // Verify project is updated correctly
    foundProject._id.should.equal(projID);
    foundProject.name.should.equal('Updated Name');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Deletes the project previously created in createProject test.
 */
async function deleteProject() {
  try {
    const projID = utils.createID(org.id, testData.projects[0].id);

    // Remove the project
    await Project.deleteMany({ _id: projID });

    // Attempt to find the project
    const foundProject = await Project.findOne({ _id: projID });

    // foundProject should be null
    should.not.exist(foundProject);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
