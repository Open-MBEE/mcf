/**
 * Classification: UNCLASSIFIED
 *
 * @module test.402c-org-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description These tests test for specific use cases within the org
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const OrgController = M.require('controllers.organization-controller');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create admin user.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set global admin user
      adminUser = user;
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
   * After: Delete admin user.
   */
  after((done) => {
    // Removing admin user
    testUtils.removeTestAdmin()
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
  it('should sort the find results', optionSortFind);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the returned search results
 * from findOrg can be sorted
 */
function optionSortFind(done) {
  // Create the test org objects
  const testOrg0 = testData.orgs[0];
  testOrg0.name = 'b';
  const testOrg1 = testData.orgs[1];
  testOrg1.name = 'c';
  const testOrg2 = testData.orgs[2];
  testOrg2.name = 'a';
  // Create sort options
  const sortOption = { sort: 'name' };
  const sortOptionReverse = { sort: '-name' };

  // Create the orgs
  OrgController.create(adminUser, [testOrg0, testOrg1, testOrg2])
  .then((createdOrgs) => {
    // Expect createdOrgs array to contain 3 orgs
    chai.expect(createdOrgs.length).to.equal(3);

    return OrgController.find(adminUser, [testOrg0.id, testOrg1.id, testOrg2.id], sortOption);
  })
  .then((foundOrgs) => {
    // Expect to find 3 orgs
    chai.expect(foundOrgs.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundOrgs[0].name).to.equal('a');
    chai.expect(foundOrgs[0].id).to.equal('testorg02');
    chai.expect(foundOrgs[1].name).to.equal('b');
    chai.expect(foundOrgs[1].id).to.equal('testorg00');
    chai.expect(foundOrgs[2].name).to.equal('c');
    chai.expect(foundOrgs[2].id).to.equal('testorg01');

    // Find the orgs and return them sorted in reverse
    return OrgController.find(adminUser, [testOrg0.id, testOrg1.id, testOrg2.id],
      sortOptionReverse);
  })
  .then((foundOrgs) => {
    // Expect to find 3 orgs
    chai.expect(foundOrgs.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundOrgs[0].name).to.equal('c');
    chai.expect(foundOrgs[0].id).to.equal('testorg01');
    chai.expect(foundOrgs[1].name).to.equal('b');
    chai.expect(foundOrgs[1].id).to.equal('testorg00');
    chai.expect(foundOrgs[2].name).to.equal('a');
    chai.expect(foundOrgs[2].id).to.equal('testorg02');
  })
  .then(() => OrgController.remove(adminUser, [testOrg0.id, testOrg1.id, testOrg2.id]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
