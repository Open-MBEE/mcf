/**
 * Classification: UNCLASSIFIED
 *
 * @module test.404c-branch-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description These tests test for specific use cases within the branch
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const BranchController = M.require('controllers.branch-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
let adminUser = null;
let org = null;
let proj = null;
let projID = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * After: Connect to database. Create an admin user, organization, and project
   */
  before((done) => {
    // Open the database connection
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      // Set global admin user
      adminUser = _adminUser;

      // Create organization
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      // Set global organization
      org = retOrg;

      // Create project
      return testUtils.createTestProject(adminUser, org.id);
    })
    .then((retProj) => {
      // Set global project
      proj = retProj;
      projID = utils.parseID(proj.id).pop();
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
   * After: Remove Organization and project.
   * Close database connection.
   */
  after((done) => {
    // Remove organization
    // Note: Projects under organization will also be removed
    testUtils.removeTestOrg(adminUser)
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
  // Create the test branch objects
  const testBranches = [
    {
      id: 'testbranch00',
      name: 'b',
      source: 'master'
    },
    {
      id: 'testbranch01',
      name: 'c',
      source: 'master'
    },
    {
      id: 'testbranch02',
      name: 'a',
      source: 'master'
    }];
  // Create sort options
  const sortOption = { sort: 'name' };
  const sortOptionReverse = { sort: '-name' };

  // Create the branches
  BranchController.create(adminUser, org.id, projID, testBranches)
  .then((createdBranches) => {
    // Expect createdBranches array to contain 3 projects
    chai.expect(createdBranches.length).to.equal(3);

    return BranchController.find(adminUser, org.id, projID,
      testBranches.map((p) => p.id), sortOption);
  })
  .then((foundProjects) => {
    // Expect to find 3 branches
    chai.expect(foundProjects.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundProjects[0].name).to.equal('a');
    chai.expect(foundProjects[0].id).to.equal(utils.createID(org.id, projID, 'testbranch02'));
    chai.expect(foundProjects[1].name).to.equal('b');
    chai.expect(foundProjects[1].id).to.equal(utils.createID(org.id, projID, 'testbranch00'));
    chai.expect(foundProjects[2].name).to.equal('c');
    chai.expect(foundProjects[2].id).to.equal(utils.createID(org.id, projID, 'testbranch01'));

    // Find the branches and return them sorted in reverse
    return BranchController.find(adminUser, org.id, projID, testBranches.map((b) => b.id),
      sortOptionReverse);
  })
  .then((foundBranches) => {
    // Expect to find 3 branches
    chai.expect(foundBranches.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundBranches[0].name).to.equal('c');
    chai.expect(foundBranches[0].id).to.equal(utils.createID(org.id, projID, 'testbranch01'));
    chai.expect(foundBranches[1].name).to.equal('b');
    chai.expect(foundBranches[1].id).to.equal(utils.createID(org.id, projID, 'testbranch00'));
    chai.expect(foundBranches[2].name).to.equal('a');
    chai.expect(foundBranches[2].id).to.equal(utils.createID(org.id, projID, 'testbranch02'));
  })
  .then(() => BranchController.remove(adminUser, org.id, projID, testBranches.map((b) => b.id)))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
