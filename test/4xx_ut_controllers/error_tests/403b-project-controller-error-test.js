/**
 * Classification: UNCLASSIFIED
 *
 * @module test.403b-project-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests for expected errors within the project controller.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const ProjectController = M.require('controllers.project-controller');
const db = M.require('lib.db');

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
      return ProjectController.create(adminUser, org.id,
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
    ProjectController.remove(adminUser, org.id,
      [testData.projects[0].id, testData.projects[1].id])
    // Removing the organization created
    .then(() => testUtils.removeTestOrg(adminUser))
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
  it('should reject put proj with invalid id', putInvalidId);
  it('should reject put proj without id', putWithoutId);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies invalid Id PUT call does not delete existing projects.
 */
function putInvalidId(done) {
  // Create the test project objects
  const testProjObj0 = testData.projects[0];
  const testProjObj1 = testData.projects[1];
  const invalidProjObj = { id: 'INVALID_ID', name: 'proj name' };

  ProjectController.createOrReplace(adminUser, org.id,
    [testProjObj0, testProjObj1, invalidProjObj])
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Project put successfully.'));
  })
  .catch((error) => {
    // Verify the error message
    chai.expect(error.message).to.equal('Project validation failed: _id: Path `_id` is invalid (testorg00:INVALID_ID).');

    // Expected error, find valid projects
    return ProjectController.find(adminUser, org.id, [testProjObj0.id, testProjObj1.id]);
  })
  .then((foundProjs) => {
    // Expect to find 2 projects
    chai.expect(foundProjs.length).to.equal(2);
    done();
  })
  .catch((error) => {
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies PUT call without Id does not delete existing projects.
 * Note: This test should fail prior to deletion of existing projects.
 */
function putWithoutId(done) {
  // Create the test projects
  const testProjObj0 = testData.projects[0];
  const testProjObj1 = testData.projects[1];
  const invalidProjObj = { name: 'missing id' };

  ProjectController.createOrReplace(adminUser, org.id,
    [testProjObj0, testProjObj1, invalidProjObj])
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Project put successfully.'));
  })
  .catch((error) => {
    // Expected error, find valid projects
    ProjectController.find(adminUser, org.id, [testProjObj0.id, testProjObj1.id])
    .then((foundProjs) => {
      // Verify the error message
      chai.expect(error.message).to.equal('Project #3 does not have an id.');

      // Expect to find 2 projects
      chai.expect(foundProjs.length).to.equal(2);
      done();
    })
    .catch((err) => {
      chai.expect(err.message).to.equal(null);
      done();
    });
  });
}
