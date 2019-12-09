/**
 * @classification UNCLASSIFIED
 *
 * @module test.304a-branch-model-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 *
 * @description This tests the Branch Model functionality. These tests
 * find, update and delete the branches.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Branch = M.require('models.branch');
const db = M.require('db');
const utils = M.require('lib.utils');
/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const org = testData.orgs[0];
const project = testData.projects[0];

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
  it('should create a branch', createBranch);
  it('should find a branch', findBranch);
  it('should update a branch', updateBranch);
  it('should delete a branch', deleteBranch);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a branch using the branch model.
 */
async function createBranch() {
  // Create new branch object
  const newBranch = {
    _id: utils.createID(org.id, project.id, testData.branches[0].id),
    name: testData.branches[0].name,
    project: utils.createID(org.id, project.id),
    source: testData.branches[0].source
  };

  // Save branch object to database
  const createdBranch = (await Branch.insertMany(newBranch))[0];
  // Check branch object saved correctly
  createdBranch._id.should.equal(utils.createID(org.id, project.id, testData.branches[0].id));
  createdBranch.name.should.equal(testData.branches[0].name);
  createdBranch.project.should.equal(utils.createID(org.id, project.id));
}

/**
 * @description Find a branch using the branch model.
 */
async function findBranch() {
  // Find the branch
  const branch = await Branch.findOne(
    { _id: utils.createID(org.id, project.id, testData.branches[0].id) }
  );
  // Verify found branch is correct
  branch.name.should.equal(testData.branches[0].name);
}

/**
 * @description Update a branch using the branch model.
 */
async function updateBranch() {
  try {
    const branchID = utils.createID(org.id, project.id, testData.branches[0].id);
    // Update the name of the branch created in the createBranch() test
    await Branch.updateOne({ _id: branchID }, { name: 'Updated Name' });

    // Find the updated branch
    const foundBranch = await Branch.findOne({ _id: branchID });

    // Verify branch is updated correctly
    foundBranch._id.should.equal(branchID);
    foundBranch.name.should.equal('Updated Name');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Delete a branch using the branch model.
 */
async function deleteBranch() {
  try {
    const branchID = utils.createID(org.id, project.id, testData.branches[0].id);

    // Remove the branch
    await Branch.deleteMany({ _id: branchID });

    // Attempt to find the branch
    const foundBranch = await Branch.findOne({ _id: branchID });

    // foundBranch should be null
    should.not.exist(foundBranch);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
