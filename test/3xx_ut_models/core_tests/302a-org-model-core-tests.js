/**
 * @classification UNCLASSIFIED
 *
 * @module test.302a-org-model-core-tests
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
 * @description Tests the organization model by performing various actions
 * such as a create, archive, and delete. The test Does NOT test the
 * organization controller but instead directly manipulates data using the
 * database interface to check the organization model's methods, validators,
 * setters, and getters.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Org = M.require('models.organization');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const adminUser = testData.adminUser;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /* Execute the tests */
  it('should create an organization', createOrg);
  it('should find an organization', findOrg);
  it('should update an organization', updateOrg);
  it('should delete an organization', deleteOrg);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates an organization using the Organization model.
 */
async function createOrg() {
  // Create an organization from the Organization model object
  const org = {
    _id: testData.orgs[0].id,
    name: testData.orgs[0].name,
    permissions: {}
  };

  // Add the admin user to the permissions
  org.permissions[adminUser.username] = ['read', 'write', 'admin'];

  try {
    // Save the Organization model object to the database
    await Org.insertMany(org);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Finds an organization using the Organization Model.
 */
async function findOrg() {
  try {
    // Find the created organization from the previous createOrg() test
    const org = await Org.findOne({ _id: testData.orgs[0].id });

    // Verify correct org is returned
    org._id.should.equal(testData.orgs[0].id);
    org.name.should.equal(testData.orgs[0].name);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Updates an organization using the Organization Model.
 */
async function updateOrg() {
  try {
    // Update the name of the org created in the createOrg() test
    await Org.updateOne({ _id: testData.orgs[0].id }, { name: 'Updated Name' });

    // Find the updated org
    const foundOrg = await Org.findOne({ _id: testData.orgs[0].id });

    // Verify org is updated correctly
    foundOrg._id.should.equal(testData.orgs[0].id);
    foundOrg.name.should.equal('Updated Name');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Deletes the previously created organization from createOrg.
 */
async function deleteOrg() {
  try {
    // Remove the org
    await Org.deleteMany({ _id: testData.orgs[0].id });

    // Attempt to find the org
    const foundOrg = await Org.findOne({ _id: testData.orgs[0].id });

    // foundOrg should be null
    should.not.exist(foundOrg);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
