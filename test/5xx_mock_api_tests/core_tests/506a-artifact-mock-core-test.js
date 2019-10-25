/**
 * @classification UNCLASSIFIED
 *
 * @module test.506a-artifact-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE artifacts and blobs.
 */

// Node modules
const fs = require('fs');     // Access the filesystem
const path = require('path'); // Find directory paths

// NPM modules
const chai = require('chai'); // Test framework

// MBEE modules
const apiController = M.require('controllers.api-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
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
   * After: Connect to database. Create an admin user, organization, and project.
   */
  before(async () => {
    try {
      // Connect to the database
      await db.connect();

      // Create test admin
      adminUser = await testUtils.createTestAdmin();

      // Set global organization
      org = await testUtils.createTestOrg(adminUser);
      orgID = org.id;

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
   * Close database connection.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects under organization will also be removed
      await testUtils.removeTestOrg(adminUser);
      await testUtils.removeTestAdmin();
      await db.disconnect();
    }
    catch (error) {
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });


  /* Execute tests */
  it('should POST an artifact', postArtifact);
  it('should GET an artifact', getArtifact);
  it('should POST an artifact blob', postBlob);
  it('should GET an artifact blob', getBlob);
  it('should GET an artifact blob by ID', getBlobById);
  it('should DELETE an artifact', deleteBlob);
  it('should PATCH an artifact', patchArtifact);
  it('should DELETE an artifact', deleteArtifact);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock POST request to create an artifact document.
 *
 * @param {Function} done - The mocha callback.
 */
function postArtifact(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request body
  const body = {
    id: artData.id,
    name: artData.name,
    filename: artData.filename,
    location: artData.location,
    custom: artData.custom
  };

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID,
    artifactid: body.id
  };

  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const createdArtifact = JSON.parse(_data);
    // Verify artifact created properly
    chai.expect(createdArtifact.id).to.equal(artData.id);
    chai.expect(createdArtifact.name).to.equal(artData.name);
    chai.expect(createdArtifact.branch).to.equal(branchID);
    chai.expect(createdArtifact.project).to.equal(projID);
    chai.expect(createdArtifact.org).to.equal(orgID);
    chai.expect(createdArtifact.location).to.equal(artData.location);
    chai.expect(createdArtifact.filename).to.equal(artData.filename);
    chai.expect(createdArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(createdArtifact.custom || {}).to.deep.equal(
      artData.custom
    );

    // Verify additional properties
    chai.expect(createdArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(createdArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdArtifact.createdOn).to.not.equal(null);
    chai.expect(createdArtifact.updatedOn).to.not.equal(null);
    chai.expect(createdArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs an artifact
  apiController.postArtifact(req, res);
}

/**
 * @description Verifies mock GET request to get an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function getArtifact(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request body
  const body = {};

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID,
    artifactid: artData.id
  };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const foundArtifact = JSON.parse(_data);

    // Verify artifact created properly
    chai.expect(foundArtifact.id).to.equal(artData.id);
    chai.expect(foundArtifact.name).to.equal(artData.name);
    chai.expect(foundArtifact.branch).to.equal(branchID);
    chai.expect(foundArtifact.project).to.equal(projID);
    chai.expect(foundArtifact.org).to.equal(orgID);
    chai.expect(foundArtifact.location).to.equal(artData.location);
    chai.expect(foundArtifact.filename).to.equal(artData.filename);
    chai.expect(foundArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(foundArtifact.custom || {}).to.deep.equal(
      artData.custom
    );

    // Verify additional properties
    chai.expect(foundArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(foundArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundArtifact.createdOn).to.not.equal(null);
    chai.expect(foundArtifact.updatedOn).to.not.equal(null);
    chai.expect(foundArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs an artifact
  apiController.getArtifact(req, res);
}

/**
 * @description Verifies mock POST request to post an artifact blob.
 *
 * @param {Function} done - The mocha callback.
 */
function postBlob(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request body
  const body = {
    location: artData.location,
    filename: artData.filename
  };

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID
  };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Attach the file to request
  const artifactPath = path.join(M.root, artData.location, artData.filename);
  req.file = {
    buffer: fs.readFileSync(artifactPath)
  };

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const postedArtifact = JSON.parse(_data);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);
    chai.expect(postedArtifact.project).to.equal(projID);
    chai.expect(postedArtifact.location).to.equal(artData.location);
    chai.expect(postedArtifact.filename).to.equal(artData.filename);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };
  // POSTs a blob
  apiController.postBlob(req, res);
}

/**
 * @description Verifies mock GET request to get an artifact blob.
 *
 * @param {Function} done - The mocha callback.
 */
function getBlob(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID
  };

  const query = {
    location: artData.location,
    filename: artData.filename
  };

  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method, query);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(_data)).to.equal(true);

    // Get the file
    const artifactPath = path.join(M.root, artData.location, artData.filename);
    const fileData = fs.readFileSync(artifactPath);

    // Deep compare both binaries
    chai.expect(_data).to.deep.equal(fileData);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };
  // GETs a blob
  apiController.getBlob(req, res);
}

/**
 * @description Verifies mock GET request to get an artifact blob by id.
 *
 * @param {Function} done - The mocha callback.
 */
function getBlobById(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request body
  const body = {};

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID,
    artifactid: artData.id
  };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(_data)).to.equal(true);

    // Get the file
    const artifactPath = path.join(M.root, artData.location, artData.filename);
    const fileData = fs.readFileSync(artifactPath);

    // Deep compare both binaries
    chai.expect(_data).to.deep.equal(fileData);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };
  // GETs a blob
  apiController.getBlobById(req, res);
}

/**
 * @description Verifies mock DELETE request to delete an artifact blob.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteBlob(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  const query = {
    location: artData.location,
    filename: artData.filename
  };
  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID
  };

  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, {}, method, query);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const deletedArtifact = JSON.parse(_data);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);
    chai.expect(deletedArtifact.project).to.equal(projID);
    chai.expect(deletedArtifact.location).to.equal(artData.location);
    chai.expect(deletedArtifact.filename).to.equal(artData.filename);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };
  // DELETEs a blob
  apiController.deleteBlob(req, res);
}

/**
 * @description Verifies mock PATCH request to update an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function patchArtifact(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request body
  const body = {
    name: 'edited_name'
  };

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID,
    artifactid: testData.artifacts[0].id
  };

  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const updatedArtifact = JSON.parse(_data);

    // Verify artifact created properly
    chai.expect(updatedArtifact.id).to.equal(artData.id);
    chai.expect(updatedArtifact.name).to.equal('edited_name');
    chai.expect(updatedArtifact.project).to.equal(projID);
    chai.expect(updatedArtifact.branch).to.equal(branchID);
    chai.expect(updatedArtifact.org).to.equal(orgID);
    chai.expect(updatedArtifact.location).to.equal(artData.location);
    chai.expect(updatedArtifact.filename).to.equal(artData.filename);
    chai.expect(updatedArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(updatedArtifact.custom || {}).to.deep.equal(
      artData.custom
    );

    // Verify additional properties
    chai.expect(updatedArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(updatedArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedArtifact.createdOn).to.not.equal(null);
    chai.expect(updatedArtifact.updatedOn).to.not.equal(null);
    chai.expect(updatedArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(updatedArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHes an artifact
  apiController.patchArtifact(req, res);
}

/**
 * @description Verifies mock DELETE request to delete an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteArtifact(done) {
  // Define artifact metadata
  const artData = testData.artifacts[0];

  // Create request body
  const body = artData.id;

  // Create request params
  const params = {
    orgid: orgID,
    projectid: projID,
    branchid: branchID,
    artifactid: artData.id
  };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const artifactid = JSON.parse(_data);
    chai.expect(artifactid).to.equal(artData.id);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs an artifact
  apiController.deleteArtifact(req, res);
}
