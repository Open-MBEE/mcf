/**
 * @classification UNCLASSIFIED
 *
 * @module test.402b-org-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Phillip Lee
 *
 * @description This tests for expected errors within the org controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const OrgController = M.require('controllers.organization-controller');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let testOrg0 = null;
let testOrg1 = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create admin user. Creates two test orgs.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set global admin user
      adminUser = user;

      // Create the orgs
      return OrgController.create(adminUser,
        [testData.orgs[0], testData.orgs[1]]);
    })
    .then((createdOrgs) => {
      testOrg0 = createdOrgs[0];
      testOrg1 = createdOrgs[1];

      // Expect createdOrgs array to contain 2 orgs
      chai.expect(createdOrgs.length).to.equal(2);
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
   * After: Delete admin user. Deletes the two test orgs.
   */
  after((done) => {
    // Removing admin user
    testUtils.removeTestAdmin()
    .then(() => OrgController.remove(adminUser, [testOrg0.id, testOrg1.id]))
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
  it('should reject put org with invalid id', putInvalidId);
  it('should reject put org without id', putWithoutId);
  // ------------- Remove -------------
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies invalid Id PUT call does not delete existing orgs.
 */
async function putInvalidId() {
  // Create the test org objects
  const testOrgObj0 = testData.orgs[0];
  const testOrgObj1 = testData.orgs[1];
  const invalidOrgObj = { id: 'INVALID_ID', name: 'org name' };

  await OrgController.createOrReplace(adminUser, [testOrgObj0, testOrgObj1, invalidOrgObj])
  .should.eventually.be.rejectedWith(
    `Organization validation failed: _id: Invalid org ID [${invalidOrgObj.id}].`
  );

  let foundOrgs;
  try {
    // Expected error, find valid orgs
    foundOrgs = await OrgController.find(adminUser, [testOrgObj0.id, testOrgObj1.id]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 orgs
  foundOrgs.length.should.equal(2);
}

/**
 * @description Verifies PUT call without Id does not delete existing orgs.
 * Note: This test should fail prior to deletion of existing orgs.
 */
async function putWithoutId() {
  // Create the test org objects
  const testOrgObj0 = testData.orgs[0];
  const testOrgObj1 = testData.orgs[1];
  const invalidOrgObj = { name: 'missing id' };

  // Expect operation to be rejected with specific error message.
  await OrgController.createOrReplace(adminUser,
    [testOrgObj0, testOrgObj1, invalidOrgObj])
  .should.eventually.be.rejectedWith('Org #3 does not have an id.');

  let foundOrgs;
  try {
    // Expected error, find valid orgs
    foundOrgs = await OrgController.find(adminUser, [testOrgObj0.id, testOrgObj1.id]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  foundOrgs.length.should.equal(2);
}
