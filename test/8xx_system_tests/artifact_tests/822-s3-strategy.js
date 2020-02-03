/**
 * @classification UNCLASSIFIED
 *
 * @module test.822-artifact-s3-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description Tests the functionality of the artifact s3-strategy.
 * If this strategy is NOT selected in the running
 * config, the tests will be skipped.
 */
// Node modules
const path = require('path');
const fs = require('fs');

// NPM modules
const chai = require('chai');

// MBEE modules
const testData = require(path.join(M.root, 'test', 'test_data.json'));
const s3Strategy = M.require('artifact.s3-strategy');

/* --------------------( Test Data )-------------------- */
let artifactBlob0 = null;
let artifactBlob1 = null;
let project = null;
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
   * Before: Read in test blobs. Using function rather arrow function
   * for access to 'this' variable.
   */
  before(async function() {
    // If not using the artifact-s3-strategy strategy, skip this test
    if (M.config.artifact.strategy !== 's3-strategy') {
      M.log.verbose('Test skipped because the s3 artifact strategy is not being'
        + ' used.');
      this.skip();
    }

    // Get test file
    const artifactPath0 = path.join(
      M.root, testData.artifacts[0].location, testData.artifacts[0].filename
    );

    const artifactPath1 = path.join(
      M.root, testData.artifacts[1].location, testData.artifacts[1].filename
    );

    // Get the test file
    artifactBlob0 = fs.readFileSync(artifactPath0);
    artifactBlob1 = fs.readFileSync(artifactPath1);

    // Define org/project obj
    org = testData.orgs[0];
    project = testData.projects[0];
  });

  /* Execute the tests */
  it('should post artifact blob.', postBlob);
  it('should get an artifact blob.', getBlob);
  it('should list all artifact blobs.', listBlobs);
  it('should put artifact blob.', putBlob);
  it('should delete an artifact blob.', deleteBlob);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Posts an artifact blob.
 */
async function postBlob() {
  const artData = {
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename,
    project: project.id,
    org: org.id
  };
  try {
    // Upload the blob
    await s3Strategy.postBlob(artData, artifactBlob0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Gets an artifact blob.
 */
async function getBlob() {
  const artData = {
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename,
    project: project.id,
    org: org.id
  };
  try {
    // Find the artifact previously uploaded.
    const artifactBlob = await s3Strategy.getBlob(artData);

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(artifactBlob)).to.equal(true);

    // Deep compare both binaries
    chai.expect(artifactBlob).to.deep.equal(artifactBlob0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description List all blobs.
 */
async function listBlobs() {
  try {
    const artData = {
      project: project.id,
      org: org.id
    };

    // Find the artifact previously uploaded.
    const blobList = await s3Strategy.listBlobs(artData);

    // Validate return data
    chai.expect(blobList[0].location).to.equal(testData.artifacts[0].location);
    chai.expect(blobList[0].filename).to.equal(testData.artifacts[0].filename);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Puts an artifact blob.
 */
async function putBlob() {
  const artData = {
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename,
    project: project.id,
    org: org.id
  };
  try {
    // Replace the blob previously uploaded.
    await s3Strategy.putBlob(artData, artifactBlob1);

    // Validate that put worked
    // Find the blob previously uploaded.
    const artifactBlob = await s3Strategy.getBlob(artData);

    // Check return blob is of buffer type
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
 * @description Deletes an artifact blob.
 */
async function deleteBlob() {
  try {
    const artData = {
      location: testData.artifacts[0].location,
      filename: testData.artifacts[0].filename,
      project: project.id,
      org: org.id
    };

    // Delete blob
    await s3Strategy.deleteBlob(artData);

    // Verify blob not found
    await s3Strategy.getBlob(artData)
    .should.eventually.be.rejectedWith('Artifact blob not found.');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
