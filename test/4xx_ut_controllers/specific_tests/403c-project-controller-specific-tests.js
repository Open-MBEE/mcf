/**
 * Classification: UNCLASSIFIED
 *
 * @module test.403c-project-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description These tests test for specific use cases within the project
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const ProjectController = M.require('controllers.project-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
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
   * Before: Create admin and create organization.
   */
  before((done) => {
    // Connect db
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      // Set global admin user
      adminUser = _adminUser;
      // Create a global organization
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      // Set global org
      org = retOrg;
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
   * After: Remove admin and organization.
   */
  after((done) => {
    // Removing the organization created
    testUtils.removeTestOrg(adminUser)
    // Remove the admin user
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
  it('should sort find results', optionSortFind);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the find results can be sorted
 */
function optionSortFind(done) {
  // Create the test project objects
  const testProjects = [
    {
      id: 'testproject00',
      name: 'b'
    },
    {
      id: 'testproject01',
      name: 'c'
    },
    {
      id: 'testproject02',
      name: 'a'
    }];
  // Create sort options
  const sortOption = { sort: 'name' };
  const sortOptionReverse = { sort: '-name' };

  // Create the projects
  ProjectController.create(adminUser, org.id, testProjects)
  .then((createdProjects) => {
    // Expect createdProjects array to contain 3 projects
    chai.expect(createdProjects.length).to.equal(3);

    return ProjectController.find(adminUser, org.id, testProjects.map((p) => p.id), sortOption);
  })
  .then((foundProjects) => {
    // Expect to find 3 projects
    chai.expect(foundProjects.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundProjects[0].name).to.equal('a');
    chai.expect(foundProjects[0].id).to.equal(utils.createID(org.id, 'testproject02'));
    chai.expect(foundProjects[1].name).to.equal('b');
    chai.expect(foundProjects[1].id).to.equal(utils.createID(org.id, 'testproject00'));
    chai.expect(foundProjects[2].name).to.equal('c');
    chai.expect(foundProjects[2].id).to.equal(utils.createID(org.id, 'testproject01'));

    // Find the projects and return them sorted in reverse
    return ProjectController.find(adminUser, org.id, testProjects.map((p) => p.id),
      sortOptionReverse);
  })
  .then((foundProjects) => {
    // Expect to find 3 projects
    chai.expect(foundProjects.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundProjects[0].name).to.equal('c');
    chai.expect(foundProjects[0].id).to.equal(utils.createID(org.id, 'testproject01'));
    chai.expect(foundProjects[1].name).to.equal('b');
    chai.expect(foundProjects[1].id).to.equal(utils.createID(org.id, 'testproject00'));
    chai.expect(foundProjects[2].name).to.equal('a');
    chai.expect(foundProjects[2].id).to.equal(utils.createID(org.id, 'testproject02'));
  })
  .then(() => ProjectController.remove(adminUser, org.id, testProjects.map((p) => p.id)))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
