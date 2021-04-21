/**
 * @classification UNCLASSIFIED
 *
 * @module test.821-artifact-local-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description Tests the exported functions and classes from the
 * artifact local-strategy. If this strategy is NOT selected in the running
 * config, the tests will be skipped.
 */

// Node modules
const path = require('path');
const fs = require('fs');

// NPM modules
const chai = require('chai');

// MBEE modules
const testUtils = M.require('lib.test-utils');
const localStrategy = M.require('artifact.local-strategy');

/* --------------------( Test Data )-------------------- */
const testData = testUtils.importTestData('test_data.json');
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
    // If not using the artifact-local-strategy strategy, skip this test
    if (M.config.artifact.strategy !== 'local-strategy') {
      M.log.verbose('Test skipped because the local artifact strategy is not '
        + 'being used.');
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
  it('should get artifact blob.', getBlob);
  it('should list artifact blobs.', listBlobs);
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
    localStrategy.postBlob(artData, artifactBlob0);

    // Ensure location ends with separator if not present
    if (artData.location[artData.location.length - 1] !== path.sep) {
      // Add separator for location
      artData.location += path.sep;
    }

    // Form the blob name, location concat with filename
    const concatenName = artData.location.replace(
      // eslint-disable-next-line security/detect-non-literal-regexp
      new RegExp(`\\${path.sep}`, 'g'), '.'
    ) + artData.filename;

    // Create artifact path
    const filePath = path.join(M.root, '/storage', org.id,
      project.id, concatenName);

    // Check file was posted
    const blob = fs.readFileSync(filePath);

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(blob)).to.equal(true);

    // Deep compare both binaries
    chai.expect(blob).to.deep.equal(artifactBlob0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Gets artifact blob.
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
    const artifactBlob = localStrategy.getBlob(artData);

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
 * @description This function validates a list of all blobs by location and filename.
 */
async function listBlobs() {
  try {
    const artData = {
      project: project.id,
      org: org.id
    };

    // Get a list of blobs
    const blobList = localStrategy.listBlobs(artData);

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
 * @description Uploads an artifact blob. Overwrites existing blob.
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
    localStrategy.putBlob(artData, artifactBlob1);

    // Validate that put worked
    // Find the blob previously uploaded.
    const artifactBlob = localStrategy.getBlob(artData);

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
  const artData = {
    location: testData.artifacts[0].location,
    filename: testData.artifacts[0].filename,
    project: project.id,
    org: org.id
  };

  // Delete blob
  localStrategy.deleteBlob(artData);
  chai.expect(localStrategy.getBlob.bind(
    localStrategy, artData
  )).to.throw('Artifact blob not found.');
}
