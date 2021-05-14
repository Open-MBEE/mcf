/**
 * @classification UNCLASSIFIED
 *
 * @module test.406b-artifact-controller-error-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description This tests for expected errors within the artifact controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Node modules
const fs = require('fs');
const path = require('path');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const ArtifactController = M.require('controllers.artifact-controller');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let orgID = null;
let project = null;
let projectID = null;
let branchID = null;
let tag = null;
let tagID = null;
let artifactBlob = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create an admin user, organization, project, and artifacts.
   */
  before(async () => {
    adminUser = await testUtils.createTestAdmin();
    // Create the organization model object
    org = await testUtils.createTestOrg(adminUser);
    orgID = org._id;

    // Create the project model object
    project = await testUtils.createTestProject(adminUser, orgID);
    projectID = utils.parseID(project._id).pop();
    branchID = testData.branches[0].id;

    // Create tag
    tag = await testUtils.createTag(adminUser, orgID, projectID);
    tagID = utils.parseID(tag._id).pop();

    // Create artifact
    await ArtifactController.create(adminUser, orgID, projectID, branchID,
      testData.artifacts[0]);

    // Get png test file
    const artifactPath = path.join(
      M.root, testData.artifacts[0].location, testData.artifacts[0].filename
    );

    // Get the test file
    artifactBlob = await fs.readFileSync(artifactPath);
    const artBlobData = {
      project: projectID,
      org: orgID,
      location: testData.artifacts[0].location,
      filename: testData.artifacts[0].filename
    };

    // Create Blob
    await ArtifactController.postBlob(adminUser, orgID, projectID, artBlobData, artifactBlob);
  });

  /**
   * After: Remove organization, project and artifacts.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects and artifacts under organization will also be removed
      await testUtils.removeTestOrg();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  it('should reject a find request for a blob that does not exist.', findNonexistingBlob);
  // ------------- Create -------------
  it('should reject creating artifacts on a tag', createInTag);
  it('should reject creating a blob that already exists.', createExistingBlob);
  it('should reject creating an artifact that already exists.', createExistingArtifact);
  // ------------- Update -------------
  it('should reject updating an artifact that does NOT exist.', updateNonexistingArtifact);
  it('should reject updating artifacts on a tag', updateInTag);
  // ------------- Remove -------------
  it('should reject deleting artifacts on a tag', deleteInTag);
  it('should reject deleting a nonexistent blob.', deleteNonexistingBlob);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that an artifact blob can not be found
 * if it does not exist.
 */
async function findNonexistingBlob() {
  // Define test data
  const artData = {
    project: projectID,
    org: orgID,
    location: testData.artifacts[1].location,
    filename: testData.artifacts[1].filename
  };

  // Attempt to find an artifact; should be rejected with specific error message
  await ArtifactController.getBlob(adminUser, orgID, projectID,
    artData)
  .should.eventually.be.rejectedWith('Artifact blob not found.');
}

/**
 * @description Verifies that artifacts cannot be created on tags.
 */
async function createInTag() {
  const artifactObj = testData.artifacts[0];
  // Attempt to create an artifact; should be rejected with specific error message
  await ArtifactController.create(adminUser, org._id, projectID, tagID, artifactObj)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and does`
      + ' not allow artifacts to be created, updated, or deleted.');
}

/**
 * @description Verifies that artifact blobs can not be created
 * if they already exist.
 */
async function createExistingBlob() {
  // Define test data
  const artData = {
    project: projectID,
    org: orgID,
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename
  };

  // Attempt to create a blob; should be rejected with specific error message
  await ArtifactController.postBlob(adminUser, orgID, projectID,
    artData, artifactBlob)
  .should.eventually.be.rejectedWith('Artifact blob already exists.');
}

/**
 * @description Verifies that artifact cannot be created if it already exists.
 */
async function createExistingArtifact() {
  // Define test data
  const artObj = {
    id: testData.artifacts[0].id,
    name: testData.artifacts[0].name,
    filename: testData.artifacts[0].filename,
    location: testData.artifacts[0].location,
    custom: testData.artifacts[0].custom
  };

  // Attempt to create an artifact; should be rejected with specific error message
  try {
    await ArtifactController.create(adminUser, orgID,
      projectID, branchID, artObj).should.eventually.be.rejectedWith(
      `Artifacts with the following IDs already exist [${testData.artifacts[0].id}].`
    );
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies that nonexistent artifacts can not be updated.
 */
async function updateNonexistingArtifact() {
  // Define test data
  const artObj = {
    id: testData.artifacts[2].id,
    name: testData.artifacts[2].name,
    filename: testData.artifacts[2].filename,
    location: testData.artifacts[2].location,
    custom: testData.artifacts[2].custom
  };

  // Attempt to update an artifact; should be rejected with specific error message
  try {
    await ArtifactController.update(adminUser, orgID,
      projectID, branchID, artObj).should.eventually.be.rejectedWith(
      `The following artifacts were not found: [${testData.artifacts[2].id}].`
    );
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies that artifacts can not be updated on a tag branch.
 */
async function updateInTag() {
  // Create the object to update artifact
  const updateObj = {
    name: 'model_edit',
    id: 'model'
  };

  // Update artifact via controller; should be rejected with specific error message
  await ArtifactController.update(adminUser, orgID, projectID, tagID, updateObj)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and `
      + 'does not allow artifacts to be created, updated, or deleted.');
}

/**
 * @description Verifies that artifacts can not be deleted on a tag branch.
 */
async function deleteInTag() {
  // Attempt deleting an artifact via controller; should be rejected with specific error message
  await ArtifactController.remove(adminUser, orgID, projectID, tagID, testData.artifacts[1].id)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and`
      + ' does not allow artifacts to be created, updated, or deleted.');
}

/**
 * @description Verifies that a non-existing blob can not be deleted.
 */
async function deleteNonexistingBlob() {
  // Define test data
  const artData = {
    project: projectID,
    org: orgID,
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename
  };

  // Delete the blob
  await ArtifactController.deleteBlob(adminUser, orgID, projectID,
    artData);

  // Attempt to delete a nonexistent blob
  // Should be rejected with specific error message
  await ArtifactController.deleteBlob(adminUser, orgID, projectID,
    artData)
  .should.eventually.be.rejectedWith('Artifact blob not found.');
}
