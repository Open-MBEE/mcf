/**
 * @classification UNCLASSIFIED
 *
 * @module test.506c-artifact-mock-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description This tests mock requests of the API controller functionality:
 * GZIP with POST and PATCH artifacts.
 */

// Node modules
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// NPM modules
const chai = require('chai');

// MBEE modules
const ArtifactController = M.require('controllers.artifact-controller');
const ProjectController = M.require('controllers.project-controller');
const APIController = M.require('controllers.api-controller');
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
const filepath = path.join(M.root, '/test/testzip.json');
let adminUser = null;
let org = null;
let proj = null;
let projID = null;
const branchID = 'master';

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * After: Create an admin user, organization, and project.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create organization
      org = await testUtils.createTestOrg(adminUser);
      // Define project data
      const projData = testData.projects[0];
      // Create project
      proj = await ProjectController.create(adminUser, org._id, projData);
      projID = utils.parseID(proj[0]._id).pop();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove test admin and organization.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects under organization will also be removed
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
      await fs.unlinkSync(filepath);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  it('should create artifacts from an uploaded gzip file', postGzip);
  it('should patch artifacts from an uploaded gzip file', patchGzip);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create artifacts.
 *
 * @param {Function} done - The mocha callback.
 */
function postGzip(done) {
  const artifactData = [
    testData.artifacts[1],
    testData.artifacts[2]
  ];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(artifactData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID
  };
  const body = {};
  const method = 'POST';
  const query = {};
  const headers = 'application/gzip';

  // Create a read stream of the zip file and give it request-like attributes
  const req = testUtils.createReadStreamRequest(adminUser, params, body, method, query,
    filepath, headers);
  req.headers['accept-encoding'] = 'gzip';

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const createdArtifacts = JSON.parse(_data);

    // Convert createdArtifacts to JMI type 2 for easier lookup
    const jmi2Artifacts = jmi.convertJMI(1, 2, createdArtifacts, 'id');

    // Loop through each artifact data object
    artifactData.forEach((artObj) => {
      const artifactID = artObj.id;
      const createdArt = jmi2Artifacts[artifactID];

      // Verify artifact created properly
      chai.expect(createdArt.id).to.equal(artifactID);
      chai.expect(createdArt.name).to.equal(artObj.name);
      chai.expect(createdArt.custom || {}).to.deep.equal(artObj.custom);
      chai.expect(createdArt.project).to.equal(projID);
    });

    // Clear the data used for testing
    fs.truncateSync(filepath);

    done();
  };

  // POST an artifact
  APIController.postArtifacts(req, res, next(req, res));
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to update artifacts.
 *
 * @param {Function} done - The mocha callback.
 */
function patchGzip(done) {
  const artifactData = [
    testData.artifacts[3],
    testData.artifacts[4]];

  // Create the artifact to be patched
  ArtifactController.create(adminUser, org._id, projID, branchID, artifactData)
  .then(() => {
    // Create a gzip file for testing
    const zippedData = zlib.gzipSync(JSON.stringify(artifactData));
    fs.appendFileSync((filepath), zippedData);

    // Initialize the request attributes
    const params = {
      orgid: org._id,
      projectid: projID,
      branchid: branchID
    };
    const body = {};
    const method = 'PATCH';
    const query = {};
    const headers = 'application/gzip';

    // Create a read stream of the zip file and give it request-like attributes
    const req = testUtils.createReadStreamRequest(adminUser, params, body, method, query,
      filepath, headers);
    req.headers['accept-encoding'] = 'gzip';

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const updatedArtifacts = JSON.parse(_data);
      // Convert createdArtifacts to JMI type 2 for easier lookup
      const jmi2Artifacts = jmi.convertJMI(1, 2, updatedArtifacts, 'id');

      // Loop through each artifact data object
      artifactData.forEach((artObj) => {
        const artifactID = artObj.id;
        const updatedArtifact = jmi2Artifacts[artifactID];

        // Verify artifact updated properly
        chai.expect(updatedArtifact.id).to.equal(artifactID);
        chai.expect(updatedArtifact.name).to.equal(artObj.name);
        chai.expect(updatedArtifact.custom || {}).to.deep.equal(artObj.custom);
        chai.expect(updatedArtifact.project).to.equal(projID);
      });

      // Clear the data used for testing
      fs.truncateSync(filepath);

      done();
    };

    // PATCH artifacts
    APIController.patchArtifacts(req, res, next(req, res));
  });
}
