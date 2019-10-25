/**
 * @classification UNCLASSIFIED
 *
 * @module test.406a-artifact-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Phillip Lee
 *
 * @description This tests the Artifact Controller functionality.
 */

// NPM modules
const chai = require('chai'); // Test framework

// Node modules
const fs = require('fs');     // Access the filesystem
const path = require('path'); // Find directory paths

// MBEE modules
const ArtifactController = M.require('controllers.artifact-controller');
const db = M.require('lib.db');
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
let artifactBlob1 = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: runs before all tests.
   */
  before(async () => {
    try {
      // Connect to the database
      await db.connect();

      adminUser = await testUtils.createTestAdmin();
      // Create the organization model object
      org = await testUtils.createTestOrg(adminUser);
      orgID = org.id;

      // Create the project model object
      project = await testUtils.createTestProject(adminUser, orgID);
      projectID = utils.parseID(project.id).pop();
      branchID = testData.branches[0].id;

      // Get png test file
      const artifactPath = path.join(
        M.root, testData.artifacts[0].location, testData.artifacts[0].filename
      );

      // Get the test file
      artifactBlob1 = await fs.readFileSync(artifactPath);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: runs after all tests.
   */
  after(async () => {
    try {
      // Remove the org created in before()
      await testUtils.removeTestOrg();
      await db.disconnect();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  it('should create an artifact', createArtifact);
  it('should get an artifact', getArtifact);
  it('should post an artifact blob', postBlob);
  it('should update an artifact file', updateArtifact);
  it('should get an artifact blob', getBlob);
  it('should delete an artifact blob', deleteBlob);
  it('should delete an artifact', deleteArtifact);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the ArtifactController can create an artifact document.
 */
async function createArtifact() {
  // Define test data
  const artData = testData.artifacts[0];
  const artObj = {
    id: artData.id,
    name: artData.name,
    filename: artData.filename,
    location: artData.location,
    custom: artData.custom
  };

  try {
    const createdArtifact = await ArtifactController.create(adminUser, orgID,
      projectID, branchID, artObj);

    // Verify response
    chai.expect(createdArtifact[0]._id).to.equal(
      utils.createID(orgID, projectID, branchID, artData.id)
    );
    chai.expect(createdArtifact[0].filename).to.equal(artData.filename);
    chai.expect(createdArtifact[0].project).to.equal(project._id);
    chai.expect(createdArtifact[0].branch).to.equal(utils.createID(orgID, projectID, branchID));
    chai.expect(createdArtifact[0].location).to.equal(artData.location);
    chai.expect(createdArtifact[0].strategy).to.equal(M.config.artifact.strategy);
    chai.expect(createdArtifact[0].custom || {}).to.deep.equal(artData.custom);

    // Verify additional properties
    chai.expect(createdArtifact[0].createdBy).to.equal(adminUser._id);
    chai.expect(createdArtifact[0].lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdArtifact[0].archivedBy).to.equal(null);
    chai.expect(createdArtifact[0].createdOn).to.not.equal(null);
    chai.expect(createdArtifact[0].updatedOn).to.not.equal(null);
    chai.expect(createdArtifact[0].archivedOn).to.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Validates that the ArtifactController can find an artifact document.
 */
async function getArtifact() {
  // Define test data
  const artData = testData.artifacts[0];

  try {
    // Find the artifact previously uploaded.
    const foundArtifact = await ArtifactController.find(adminUser, orgID,
      projectID, branchID, [artData.id]);

    // Verify response
    // Check if artifact found
    chai.expect(foundArtifact.length).to.equal(1);
    chai.expect(foundArtifact[0]._id).to.equal(
      utils.createID(orgID, projectID, branchID, artData.id)
    );
    chai.expect(foundArtifact[0].name).to.equal(artData.name);
    chai.expect(foundArtifact[0].filename).to.equal(artData.filename);
    chai.expect(foundArtifact[0].project).to.equal(project._id);
    chai.expect(foundArtifact[0].branch).to.equal(utils.createID(orgID, projectID, branchID));
    chai.expect(foundArtifact[0].location).to.equal(artData.location);
    chai.expect(foundArtifact[0].strategy).to.equal(M.config.artifact.strategy);
    chai.expect(foundArtifact[0].custom || {}).to.deep.equal(artData.custom);

    // Verify additional properties
    chai.expect(foundArtifact[0].createdBy).to.equal(adminUser._id);
    chai.expect(foundArtifact[0].lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundArtifact[0].archivedBy).to.equal(null);
    chai.expect(foundArtifact[0].createdOn).to.not.equal(null);
    chai.expect(foundArtifact[0].updatedOn).to.not.equal(null);
    chai.expect(foundArtifact[0].archivedOn).to.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Validates that the ArtifactController can update an artifact document.
 */
async function updateArtifact() {
  // Define test data
  const artUpdateData = testData.artifacts[2];
  const artObj = {
    id: testData.artifacts[0].id,
    filename: artUpdateData.filename,
    name: artUpdateData.name,
    location: artUpdateData.location,
    archived: false,
    custom: artUpdateData.custom
  };

  try {
    const updatedArtifact = await ArtifactController.update(adminUser, orgID,
      projectID, branchID, [artObj]);

    // Verify response
    // Check if artifact found
    chai.expect(updatedArtifact.length).to.equal(1);
    chai.expect(updatedArtifact[0]._id).to.equal(
      utils.createID(orgID, projectID, branchID, testData.artifacts[0].id)
    );
    chai.expect(updatedArtifact[0].name).to.equal(artUpdateData.name);
    chai.expect(updatedArtifact[0].filename).to.equal(artUpdateData.filename);
    chai.expect(updatedArtifact[0].project).to.equal(project._id);
    chai.expect(updatedArtifact[0].branch).to.equal(utils.createID(orgID, projectID, branchID));
    chai.expect(updatedArtifact[0].location).to.equal(artUpdateData.location);
    chai.expect(updatedArtifact[0].strategy).to.equal(M.config.artifact.strategy);
    chai.expect(updatedArtifact[0].custom || {}).to.deep.equal(artUpdateData.custom);

    // Verify additional properties
    chai.expect(updatedArtifact[0].createdBy).to.equal(adminUser._id);
    chai.expect(updatedArtifact[0].lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedArtifact[0].archivedBy).to.equal(null);
    chai.expect(updatedArtifact[0].createdOn).to.not.equal(null);
    chai.expect(updatedArtifact[0].updatedOn).to.not.equal(null);
    chai.expect(updatedArtifact[0].archivedOn).to.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Validates that the ArtifactController can delete an artifact document.
 */
async function deleteArtifact() {
  // Define test data
  const artData = testData.artifacts[0];

  try {
    // Delete the artifact
    const deletedArtifact = await ArtifactController.remove(adminUser,
      orgID, projectID, branchID, artData.id);

    // Verify response
    chai.expect(deletedArtifact[0]).to.equal(
      utils.createID(orgID, projectID, branchID, artData.id)
    );

    // Check that 1 artifact was deleted
    chai.expect(deletedArtifact.length).to.equal(1);

    // Attempt to find the deleted artifact
    const foundArtifact = await ArtifactController.find(adminUser, orgID,
      projectID, branchID, [artData.id]);

    // Verify response
    chai.expect(foundArtifact.length).to.equal(0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Validates that the ArtifactController can post an artifact blob.
 */
async function postBlob() {
  // Define test data
  const artData = {
    project: projectID,
    org: orgID,
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename
  };

  try {
    const createdArtifact = await ArtifactController.postBlob(adminUser, orgID,
      projectID, artData, artifactBlob1);

    // Verify response
    chai.expect(createdArtifact.filename).to.equal(testData.artifacts[0].filename);
    chai.expect(createdArtifact.project).to.equal(projectID);
    chai.expect(createdArtifact.location).to.equal(testData.artifacts[0].location);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Validates that the ArtifactController can retrieve an artifact blob.
 */
async function getBlob() {
  const artData = {
    project: projectID,
    org: orgID,
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename
  };
  try {
    // Find the artifact previously uploaded.
    const artifactBlob = await ArtifactController.getBlob(adminUser,
      orgID, projectID, artData);

    // Verify response
    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(artifactBlob)).to.equal(true);

    // Deep compare both binaries
    chai.expect(artifactBlob).to.deep.equal(artifactBlob1);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Validates that the ArtifactController can delete an artifact blob.
 */
async function deleteBlob() {
  try {
    const artData = {
      project: projectID,
      org: orgID,
      location: testData.artifacts[0].location,
      filename: testData.artifacts[0].filename
    };

    // Find and delete the artifact
    await ArtifactController.deleteBlob(adminUser, orgID, projectID, artData);

    await ArtifactController.getBlob(adminUser, orgID,
      projectID, artData).should.eventually.be.rejectedWith(
      'Artifact blob not found.'
    );
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
