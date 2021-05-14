/**
 * @classification UNCLASSIFIED
 *
 * @module test.606a-artifact-api-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description This tests requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE artifacts.
 */

// NPM modules
const chai = require('chai'); // Test framework
const axios = require('axios');
const http = require('axios/lib/adapters/http');
const FormData = require('form-data');

// Node modules
const fs = require('fs');     // Access the filesystem
const path = require('path'); // Find directory paths

// MBEE modules
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
let adminUser = null;
let org = null;
let orgID = null;
let proj = null;
let projID = null;
let branchID = null;

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

      // Set global organization
      org = await testUtils.createTestOrg(adminUser);
      orgID = org._id;

      // Create project
      proj = await testUtils.createTestProject(adminUser, orgID);
      projID = utils.parseID(proj._id).pop();
      branchID = testData.branches[0].id;
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
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  it('should POST an artifact', postArtifact);
  it('should POST multiple artifacts', postArtifacts);
  it('should GET an artifact', getArtifact);
  it('should GET multiple artifacts', getArtifacts);
  it('should POST an artifact blob', postBlob);
  it('should GET an artifact blob', getBlob);
  it('should GET a list of artifact blobs', listBlobs);
  it('should GET an artifact blob by ID', getBlobById);
  it('should DELETE an artifact', deleteBlob);
  it('should PATCH an artifact', patchArtifact);
  it('should PATCH multiple artifacts', patchArtifacts);
  it('should DELETE an artifact', deleteArtifact);
  it('should DELETE multiple artifacts', deleteArtifacts);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies POST request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 * to create an artifact.
 */
async function postArtifact() {
  try {
    const artData = testData.artifacts[0];
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
      headers: testUtils.getHeaders(),
      data: artData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const createdArtifact = res.data[0];

    // Verify artifact created properly
    chai.expect(createdArtifact.id).to.equal(artData.id);
    chai.expect(createdArtifact.branch).to.equal(branchID);
    chai.expect(createdArtifact.project).to.equal(projID);
    chai.expect(createdArtifact.org).to.equal(orgID);
    chai.expect(createdArtifact.description).to.equal(artData.description);
    chai.expect(createdArtifact.location).to.equal(artData.location);
    chai.expect(createdArtifact.filename).to.equal(artData.filename);
    chai.expect(createdArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(createdArtifact.size).to.equal(artData.size);

    // Verify additional properties
    chai.expect(createdArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(createdArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdArtifact.createdOn).to.not.equal(null);
    chai.expect(createdArtifact.updatedOn).to.not.equal(null);
    chai.expect(createdArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies POST request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts
 * to create multiple artifacts.
 */
async function postArtifacts() {
  try {
    // Define artifact metadata
    const artData = [
      testData.artifacts[1],
      testData.artifacts[2]
    ];
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts`,
      headers: testUtils.getHeaders(),
      data: artData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const createdArtifacts = res.data;

    // Expect createdArtifacts not to be empty
    chai.expect(createdArtifacts.length).to.equal(artData.length);

    // Convert to JMI type 2 for easier lookup
    const jmi2Artifacts = jmi.convertJMI(1, 2, createdArtifacts, 'id');

    // Loop through each artifact data object
    artData.forEach((artObj) => {
      const artifactID = utils.createID(artObj.id);
      const createdArtifact = jmi2Artifacts[artifactID];

      // Verify artifact created properly
      chai.expect(createdArtifact.id).to.equal(artObj.id);
      chai.expect(createdArtifact.branch).to.equal(branchID);
      chai.expect(createdArtifact.project).to.equal(projID);
      chai.expect(createdArtifact.org).to.equal(orgID);
      chai.expect(createdArtifact.description).to.equal(artObj.description);
      chai.expect(createdArtifact.location).to.equal(artObj.location);
      chai.expect(createdArtifact.filename).to.equal(artObj.filename);
      chai.expect(createdArtifact.strategy).to.equal(M.config.artifact.strategy);
      chai.expect(createdArtifact.size).to.equal(artObj.size);

      // Verify additional properties
      chai.expect(createdArtifact.createdBy).to.equal(adminUser._id);
      chai.expect(createdArtifact.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdArtifact.createdOn).to.not.equal(null);
      chai.expect(createdArtifact.updatedOn).to.not.equal(null);
      chai.expect(createdArtifact.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(createdArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 * to get an artifact.
 */
async function getArtifact() {
  try {
    const artData = testData.artifacts[0];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const foundArtifact = res.data[0];

    // Verify artifact found
    chai.expect(foundArtifact.id).to.equal(artData.id);
    chai.expect(foundArtifact.branch).to.equal(branchID);
    chai.expect(foundArtifact.project).to.equal(projID);
    chai.expect(foundArtifact.org).to.equal(orgID);
    chai.expect(foundArtifact.description).to.equal(artData.description);
    chai.expect(foundArtifact.location).to.equal(artData.location);
    chai.expect(foundArtifact.filename).to.equal(artData.filename);
    chai.expect(foundArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(foundArtifact.custom).to.deep.equal(artData.custom);
    chai.expect(foundArtifact.size).to.equal(artData.size);

    // Verify additional properties
    chai.expect(foundArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(foundArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundArtifact.createdOn).to.not.equal(null);
    chai.expect(foundArtifact.updatedOn).to.not.equal(null);
    chai.expect(foundArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts
 * to get multiple artifacts.
 */
async function getArtifacts() {
  try {
    // Define artifact metadata
    const artData = [
      testData.artifacts[1],
      testData.artifacts[2]
    ];
    const artIDs = [
      testData.artifacts[1].id,
      testData.artifacts[2].id
    ];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts`,
      headers: testUtils.getHeaders(),
      params: {
        ids: artIDs.toString()
      }
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const foundArtifacts = res.data;

    // Verify expected number of documents

    chai.expect(foundArtifacts.length).to.equal(artData.length);

    // Convert to JMI type 2 for easier lookup
    const jmi2Artifacts = jmi.convertJMI(1, 2, foundArtifacts, 'id');

    // Loop through each artifact data object
    artData.forEach((artObj) => {
      const artifactID = utils.createID(artObj.id);
      const foundArtifact = jmi2Artifacts[artifactID];

      // Verify artifact
      chai.expect(foundArtifact.id).to.equal(artObj.id);
      chai.expect(foundArtifact.branch).to.equal(branchID);
      chai.expect(foundArtifact.project).to.equal(projID);
      chai.expect(foundArtifact.org).to.equal(orgID);
      chai.expect(foundArtifact.description).to.equal(artObj.description);
      chai.expect(foundArtifact.location).to.equal(artObj.location);
      chai.expect(foundArtifact.filename).to.equal(artObj.filename);
      chai.expect(foundArtifact.strategy).to.equal(M.config.artifact.strategy);
      chai.expect(foundArtifact.custom).to.deep.equal(artObj.custom);
      chai.expect(foundArtifact.size).to.equal(artObj.size);

      // Verify additional properties
      chai.expect(foundArtifact.createdBy).to.equal(adminUser._id);
      chai.expect(foundArtifact.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundArtifact.createdOn).to.not.equal(null);
      chai.expect(foundArtifact.updatedOn).to.not.equal(null);
      chai.expect(foundArtifact.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies POST request
 * /api/orgs/:orgid/projects/:projectid/artifacts/blob
 * to post an artifact blob.
 */
async function postBlob() {
  try {
    const artData = testData.artifacts[0];
    artData.project = projID;

    const artifactPath = path.join(
      M.root, artData.location, artData.filename
    );

    // Create form data
    const formData = new FormData();

    // Read the file from disc
    formData.append('file', fs.createReadStream(artifactPath));
    formData.append('location', artData.location);
    formData.append('filename', artData.filename);

    const header = Object.assign(formData.getHeaders(),
      { authorization: testUtils.getHeaders().authorization });

    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/blob`,
      data: formData,
      headers: header,
      adapter: http
    };

    // Post Blob
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const postedBlob = res.data;

    // Verify artifact created properly
    chai.expect(postedBlob.project).to.equal(projID);
    chai.expect(postedBlob.location).to.equal(artData.location);
    chai.expect(postedBlob.filename).to.equal(artData.filename);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET request
 * /api/orgs/:orgid/projects/:projectid/artifacts/blob
 * to get an artifact blob.
 */
async function getBlob() {
  try {
    const artData = testData.artifacts[0];
    artData.project = projID;
    artData.branch = branchID;

    const queryParams = {
      location: artData.location,
      filename: artData.filename
    };
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/blob`,
      params: queryParams,
      headers: testUtils.getHeaders(),
      responseType: 'arraybuffer'
    };

    // Make an API request
    const res = await axios(options);

    // / Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Convert data to buffer
    const resFile = Buffer.from(res.data, 'binary');

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(resFile)).to.equal(true);

    // Get the file
    const artifactPath = path.join(M.root, artData.location, artData.filename);
    const fileData = fs.readFileSync(artifactPath);

    // Deep compare both binaries
    chai.expect(resFile).to.deep.equal(fileData);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET request
 * /api/orgs/:orgid/projects/:projectid/artifacts/list
 * to get a list of artifact blobs.
 */
async function listBlobs() {
  try {
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/list`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const blobList = res.data;
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
 * @description Verifies GET request to get an artifact blob by id.
 */
async function getBlobById() {
  try {
    const artData = testData.artifacts[0];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}/blob`,
      headers: testUtils.getHeaders(),
      responseType: 'arraybuffer'
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Convert data to buffer
    const resFile = Buffer.from(res.data, 'binary');

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(resFile)).to.equal(true);

    // Get the file
    const artifactPath = path.join(M.root, artData.location, artData.filename);
    const fileData = fs.readFileSync(artifactPath);

    // Deep compare both binaries
    chai.expect(resFile).to.deep.equal(fileData);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE request
 * /api/orgs/:orgid/projects/:projectid/artifacts/blob
 * to delete an artifact blob.
 */
async function deleteBlob() {
  try {
    const artData = testData.artifacts[0];
    artData.project = projID;
    const query = {
      location: artData.location,
      filename: artData.filename
    };
    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/blob`,
      headers: testUtils.getHeaders(),
      params: query
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body

    const deletedBlob = res.data;
    // Verify artifact created properly
    chai.expect(deletedBlob.project).to.equal(projID);
    chai.expect(deletedBlob.location).to.equal(artData.location);
    chai.expect(deletedBlob.filename).to.equal(artData.filename);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PATCH request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 * to update an artifact.
 */
async function patchArtifact() {
  try {
    // Get update artifact data
    const artData = testData.artifacts[0];
    const reqBody = {
      id: artData.id,
      description: 'edited_description'
    };
    const options = {
      method: 'patch',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
      headers: testUtils.getHeaders(),
      data: reqBody
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const patchedArtifact = res.data[0];

    // Verify artifact created properly
    chai.expect(patchedArtifact.id).to.equal(artData.id);
    chai.expect(patchedArtifact.branch).to.equal(branchID);
    chai.expect(patchedArtifact.project).to.equal(projID);
    chai.expect(patchedArtifact.org).to.equal(orgID);
    chai.expect(patchedArtifact.description).to.equal('edited_description');
    chai.expect(patchedArtifact.location).to.equal(artData.location);
    chai.expect(patchedArtifact.filename).to.equal(artData.filename);
    chai.expect(patchedArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(patchedArtifact.custom).to.deep.equal(artData.custom);
    chai.expect(patchedArtifact.size).to.equal(artData.size);

    // Verify additional properties
    chai.expect(patchedArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(patchedArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(patchedArtifact.createdOn).to.not.equal(null);
    chai.expect(patchedArtifact.updatedOn).to.not.equal(null);
    chai.expect(patchedArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(patchedArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PATCH request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts
 * to update multiple artifacts.
 */
async function patchArtifacts() {
  try {
    // Define artifact metadata
    const artData = [
      testData.artifacts[1],
      testData.artifacts[2]
    ];
    const updateObj = artData.map(a => ({
      id: a.id,
      description: `${a.description}_edit`
    }));
    const options = {
      method: 'patch',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts`,
      headers: testUtils.getHeaders(),
      data: updateObj
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const patchedArtifacts = res.data;

    // Verify expected number of documents
    chai.expect(patchedArtifacts.length).to.equal(artData.length);

    // Convert to JMI type 2 for easier lookup
    const jmi2Artifacts = jmi.convertJMI(1, 2, patchedArtifacts, 'id');

    // Loop through each artifact data object
    artData.forEach((artObj) => {
      const artifactID = utils.createID(artObj.id);
      const patchedArtifact = jmi2Artifacts[artifactID];

      // Verify artifact updated properly
      chai.expect(patchedArtifact.id).to.equal(artObj.id);
      chai.expect(patchedArtifact.branch).to.equal(branchID);
      chai.expect(patchedArtifact.project).to.equal(projID);
      chai.expect(patchedArtifact.org).to.equal(orgID);
      chai.expect(patchedArtifact.description).to.equal(`${artObj.description}_edit`);
      chai.expect(patchedArtifact.location).to.equal(artObj.location);
      chai.expect(patchedArtifact.filename).to.equal(artObj.filename);
      chai.expect(patchedArtifact.strategy).to.equal(M.config.artifact.strategy);
      chai.expect(patchedArtifact.custom).to.deep.equal(artObj.custom);
      chai.expect(patchedArtifact.size).to.equal(artObj.size);

      // Verify additional properties
      chai.expect(patchedArtifact.createdBy).to.equal(adminUser._id);
      chai.expect(patchedArtifact.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(patchedArtifact.createdOn).to.not.equal(null);
      chai.expect(patchedArtifact.updatedOn).to.not.equal(null);
      chai.expect(patchedArtifact.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(patchedArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 * to delete an artifact.
 */
async function deleteArtifact() {
  try {
    const artData = testData.artifacts[0];
    artData.project = projID;
    artData.branch = branchID;
    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const deletedArtifact = res.data[0];
    // Verify artifact created properly
    chai.expect(deletedArtifact).to.equal(artData.id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE request
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts
 * to delete multiple artifacts.
 */
async function deleteArtifacts() {
  try {
    // Define artifact metadata
    const artIDs = [
      testData.artifacts[1].id,
      testData.artifacts[2].id
    ];
    const ids = artIDs.join(',');
    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts?ids=${ids}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const deletedArtifactIDs = res.data;

    chai.expect(deletedArtifactIDs).to.have.members(artIDs);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
