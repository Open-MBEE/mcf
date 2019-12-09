/**
 * @classification UNCLASSIFIED
 *
 * @module test.403b-project-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Phillip Lee
 *
 * @description This tests for expected errors within the project controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const ProjectController = M.require('controllers.project-controller');
const db = M.require('db');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create admin user. Creates two test projects.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set global admin user
      adminUser = user;
      // Create the test org
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      org = retOrg;

      // Create the projects
      return ProjectController.create(adminUser, org._id,
        [testData.projects[0], testData.projects[1]]);
    })
    .then((createdProj) => {
      // Expect array to contain 2 projects
      chai.expect(createdProj.length).to.equal(2);
      done();
    })
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: Delete admin user. Deletes the two test projects.
   */
  after((done) => {
    ProjectController.remove(adminUser, org._id,
      [testData.projects[0].id, testData.projects[1].id])
    // Removing the organization created
    .then(() => testUtils.removeTestOrg())
    // Removing admin user
    .then(() => testUtils.removeTestAdmin())
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  // -------------- Find --------------
  // ------------- Create -------------
  // ------------- Update -------------
  // ------------- Replace ------------
  it('should reject put proj with invalid id', putInvalidId);
  it('should reject put proj without id', putWithoutId);
  // ------------- Remove -------------
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies invalid Id PUT call does not delete existing projects.
 */
async function putInvalidId() {
  // Create the test project objects
  const testProjObj0 = testData.projects[0];
  const testProjObj1 = testData.projects[1];
  const invalidProjObj = { id: '!!', name: 'proj name' };

  await ProjectController.createOrReplace(adminUser, org._id,
    [testProjObj0, testProjObj1, invalidProjObj])
  .should.eventually.be.rejectedWith(
    `Project validation failed: _id: Invalid project ID [${invalidProjObj.id}].`
  );

  let foundProjs;
  try {
    // Expected error, find valid projects
    foundProjs = await ProjectController.find(adminUser,
      org._id, [testProjObj0.id, testProjObj1.id]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 projects
  foundProjs.length.should.equal(2);
}

/**
 * @description Verifies PUT call without Id does not delete existing projects.
 * Note: This test should fail prior to deletion of existing projects.
 */
async function putWithoutId() {
  // Create the test projects
  const testProjObj0 = testData.projects[0];
  const testProjObj1 = testData.projects[1];
  const invalidProjObj = { name: 'missing id' };

  await ProjectController.createOrReplace(adminUser, org._id,
    [testProjObj0, testProjObj1, invalidProjObj])
  .should.eventually.be.rejectedWith('Project #3 does not have an id.');

  let foundProjs;
  try {
    foundProjs = await ProjectController.find(adminUser,
      org._id, [testProjObj0.id, testProjObj1.id]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 projects
  foundProjs.length.should.equal(2);
}
