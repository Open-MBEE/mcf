/**
 * @classification UNCLASSIFIED
 *
 * @module test.404b-branch-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 * @author Leah De Laurell
 *
 * @description This tests for expected errors within the branch controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const BranchController = M.require('controllers.branch-controller');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const Branch = M.require('models.branch');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let nonAdminUser = null;
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
   * Before: Create an admin user, organization, and project.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();

      // Create test user
      nonAdminUser = await testUtils.createNonAdminUser();

      // Create organization
      org = await testUtils.createTestOrg(adminUser);

      // Create project
      proj = await testUtils.createTestProject(adminUser, org._id);
      projID = utils.parseID(proj._id).pop();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove Organization and project.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects under organization will also be removed
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
      await testUtils.removeNonAdminUser();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  it('should reject an unauthorized attempt to find a branch', unauthorizedTest('find'));
  // ------------- Create -------------
  it('should reject an unauthorized attempt to create a branch', unauthorizedTest('create'));
  it('should reject an attempt to create a branch on an archived org', archivedTest(Organization, 'create'));
  it('should reject an attempt to create a branch on an archived project', archivedTest(Project, 'update'));
  it('should reject an attempt to create a branch that already exists', createExisting);
  // ------------- Update -------------
  it('should reject an unauthorized attempt to update a branch', unauthorizedTest('update'));
  it('should reject an attempt to update a branch on an archived org', archivedTest(Organization, 'update'));
  it('should reject an attempt to update a branch on an archived project', archivedTest(Project, 'update'));
  it('should reject an attempt to update an archived branch', archivedTest(Branch, 'update'));
  // ------------- Remove -------------
  it('should reject an unauthorized attempt to delete a branch', unauthorizedTest('remove'));
  it('should reject an attempt to delete a branch on an archived org', archivedTest(Organization, 'remove'));
  it('should reject an attempt to delete a branch on an archived project', archivedTest(Project, 'remove'));
  it('should reject deletion of master branch', deleteMasterBranch);
});

/* --------------------( Tests )-------------------- */
/**
 * @description A function that dynamically generates a test function for different unauthorized
 * cases.
 *
 * @param {string} operation - The type of operation for the test: create, update, etc.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function unauthorizedTest(operation) {
  return async function() {
    let branchData = testData.branches[0];
    let op = operation;
    const id = org._id;
    const level = 'org';

    switch (operation) {
      case 'find':
        branchData = branchData.id;
        break;
      case 'create':
        branchData = testData.branches[1];
        break;
      case 'update':
        branchData = {
          id: branchData.id,
          description: 'update'
        };
        break;
      case 'remove':
        branchData = branchData.id;
        op = 'delete'; // Changing this because permissions errors say "delete" instead of "remove"
        break;
      default:
        throw new Error('Invalid input to unauthorizedTest function');
    }

    try {
      // Attempt to perform the unauthorized operation
      await BranchController[operation](nonAdminUser, org._id, projID, branchData)
      .should.eventually.be.rejectedWith(`User does not have permission to ${op} branches in the ${level} [${id}]`);
    }
    catch (error) {
      M.log.error(error);
      should.not.exist(error);
    }
  };
}

/**
 * @description A function that dynamically generates a test function for different archived cases.
 *
 * @param {Model} model - The model to use for the test.
 * @param {string} operation - The type of operation for the test: create, update, etc.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function archivedTest(model, operation) {
  return async function() {
    let branchData = (operation === 'update') ? testData.branches[0] : testData.branches[1];
    let id;
    let name;

    switch (model) {
      case Organization:
        // Set id to org id
        id = org._id;
        name = 'Organization';
        break;
      case Project:
        // Set id to project id
        id = utils.createID(org._id, projID);
        name = 'Project';
        break;
      case Branch:
        // Set id to branch id
        id = utils.createID(org._id, projID, branchData.id);
        name = 'Branch';
        break;
      default:
        throw new Error('Invalid input to archivedTest function');
    }

    switch (operation) {
      case 'create':
        break;
      case 'update':
        branchData = {
          id: testData.branches[0].id,
          name: 'update'
        };
        break;
      case 'find':
      case 'remove':
        branchData = branchData.id;
        break;
      default:
        throw new Error('Invalid input to archivedTest function');
    }

    try {
      // Archive the object of interest
      await model.updateOne({ _id: id }, { archived: true });

      await BranchController[operation](adminUser, org._id, projID, branchData)
      .should.eventually.be.rejectedWith(`The ${name} [${utils.parseID(id).pop()}] is archived. `
        + 'It must first be unarchived before performing this operation.');
    }
    catch (error) {
      M.log.error(error);
      should.not.exist(error);
    }
    finally {
      // un-archive the model
      await model.updateOne({ _id: id }, { archived: false });
    }
  };
}

/**
 * @description Verifies that a branch cannot be created if a branch already exists with the
 * same id.
 */
async function createExisting() {
  try {
    const branchData = testData.branches[1];

    // Create the branch first
    await BranchController.create(adminUser, org._id, projID, branchData);

    // Attempt to create a branch; this branch was already created in the before() function
    await BranchController.create(adminUser, org._id, projID, branchData)
    .should.eventually.be.rejectedWith('Branches with the following IDs already exist '
      + `[${branchData.id}].`);
  }
  catch (error) {
    M.log.warn(error);
    should.not.exist(error);
  }
}

/**
 * @description Verifies that master branch can not be deleted.
 */
async function deleteMasterBranch() {
  const branchID = testData.branches[0].id;

  // Attempt to remove the master branch; should be rejected
  await BranchController.remove(adminUser, org._id, projID, branchID)
  .should.eventually.be.rejectedWith(`User cannot delete branch: ${branchID}.`);
}
