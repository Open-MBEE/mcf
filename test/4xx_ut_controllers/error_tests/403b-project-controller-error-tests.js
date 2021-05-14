/**
 * @classification UNCLASSIFIED
 *
 * @module test.403b-project-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
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
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create the test org
      org = await testUtils.createTestOrg(adminUser);
      // Create the projects
      const createdProjects = await ProjectController.create(adminUser, org._id,
        [testData.projects[0], testData.projects[1]]);
      // Expect array to contain 2 projects
      chai.expect(createdProjects.length).to.equal(2);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Delete admin user. Deletes the two test projects.
   */
  after(async () => {
    try {
      // Removing the organization created
      await testUtils.removeTestOrg();
      // Removing admin user
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  // ------------- Create -------------
  // ------------- Update -------------
  // ------------- Replace ------------
  it('should reject an attempt to replace a project with an invalid id', replaceInvalidId);
  it('should reject an attempt to replace a project without an id', replaceWithoutId);
  // ------------- Remove -------------
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies createOrReplace() call with an invalid id does not delete existing
 * projects.
 */
async function replaceInvalidId() {
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
 * @description Verifies createOrReplace() call without an id does not delete existing projects.
 * Note: This test should fail prior to deletion of existing projects.
 */
async function replaceWithoutId() {
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
