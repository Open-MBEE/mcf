/**
 * @classification UNCLASSIFIED
 *
 * @module test.606a-artifact-api-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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
const request = require('request');

// Node modules
const fs = require('fs');     // Access the filesystem
const path = require('path'); // Find directory paths

// MBEE modules
const db = M.require('lib.db');
const utils = M.require('lib.utils');

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
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
      await db.disconnect();
    }
    catch (error) {
      M.log.error(error);
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
 * @description Verifies POST request to create an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function postArtifact(done) {
  const artData = testData.artifacts[0];

  const options = {
    method: 'POST',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
    headers: testUtils.getHeaders(),
    body: JSON.stringify(artData)
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const postedArtifact = JSON.parse(body);

    // Verify artifact created properly
    chai.expect(postedArtifact.id).to.equal(artData.id);
    chai.expect(postedArtifact.branch).to.equal(branchID);
    chai.expect(postedArtifact.project).to.equal(projID);
    chai.expect(postedArtifact.org).to.equal(orgID);
    chai.expect(postedArtifact.location).to.equal(artData.location);
    chai.expect(postedArtifact.filename).to.equal(artData.filename);
    chai.expect(postedArtifact.strategy).to.equal(M.config.artifact.strategy);

    // Verify additional properties
    chai.expect(postedArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(postedArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(postedArtifact.createdOn).to.not.equal(null);
    chai.expect(postedArtifact.updatedOn).to.not.equal(null);
    chai.expect(postedArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(postedArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}

/**
 * @description Verifies GET request to get an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function getArtifact(done) {
  const artData = testData.artifacts[0];

  const options = {
    method: 'GET',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
    headers: testUtils.getHeaders()
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdArtifact = JSON.parse(body);

    // Verify artifact created properly
    chai.expect(createdArtifact.id).to.equal(artData.id);
    chai.expect(createdArtifact.branch).to.equal(branchID);
    chai.expect(createdArtifact.project).to.equal(projID);
    chai.expect(createdArtifact.org).to.equal(orgID);
    chai.expect(createdArtifact.name).to.equal(artData.name);
    chai.expect(createdArtifact.location).to.equal(artData.location);
    chai.expect(createdArtifact.filename).to.equal(artData.filename);
    chai.expect(createdArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(createdArtifact.custom).to.deep.equal(artData.custom);

    // Verify additional properties
    chai.expect(createdArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(createdArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdArtifact.createdOn).to.not.equal(null);
    chai.expect(createdArtifact.updatedOn).to.not.equal(null);
    chai.expect(createdArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}

/**
 * @description Verifies POST request to post an artifact blob.
 *
 * @param {Function} done - The mocha callback.
 */
function postBlob(done) {
  const artData = testData.artifacts[0];
  artData.project = projID;

  const artifactPath = path.join(
    M.root, artData.location, artData.filename
  );

  const options = {
    method: 'POST',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/blob`,
    headers: testUtils.getHeaders('multipart/form-data'),
    formData: {
      location: artData.location,
      filename: artData.filename,
      file: {
        value: fs.createReadStream(artifactPath),
        options: {
          filename: artifactPath
        }
      }
    }
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const postedBlob = JSON.parse(body);
    // Verify artifact created properly
    chai.expect(postedBlob.project).to.equal(projID);
    chai.expect(postedBlob.location).to.equal(artData.location);
    chai.expect(postedBlob.filename).to.equal(artData.filename);
    done();
  });
}

/**
 * @description Verifies GET request to get an artifact blob.
 *
 * @param {Function} done - The mocha callback.
 */
function getBlob(done) {
  const artData = testData.artifacts[0];
  artData.project = projID;
  artData.branch = branchID;

  const queryParams = {
    location: artData.location,
    filename: artData.filename
  };
  const options = {
    method: 'GET',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/blob`,
    qs: queryParams,
    headers: testUtils.getHeaders(),
    encoding: null
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(body)).to.equal(true);

    // Get the file
    const artifactPath = path.join(M.root, artData.location, artData.filename);
    const fileData = fs.readFileSync(artifactPath);

    // Deep compare both binaries
    chai.expect(body).to.deep.equal(fileData);
    done();
  });
}

/**
 * @description Verifies GET request to get an artifact blob by id.
 *
 * @param {Function} done - The mocha callback.
 */
function getBlobById(done) {
  const artData = testData.artifacts[0];

  const options = {
    method: 'GET',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}/blob`,
    headers: testUtils.getHeaders(),
    encoding: null
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);

    // Check return artifact is of buffer type
    chai.expect(Buffer.isBuffer(body)).to.equal(true);

    // Get the file
    const artifactPath = path.join(M.root, artData.location, artData.filename);
    const fileData = fs.readFileSync(artifactPath);

    // Deep compare both binaries
    chai.expect(body).to.deep.equal(fileData);
    done();
  });
}

/**
 * @description Verifies DELETE request to delete an artifact blob.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteBlob(done) {
  const artData = testData.artifacts[0];
  artData.project = projID;

  const query = {
    location: artData.location,
    filename: artData.filename
  };
  const options = {
    method: 'DELETE',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/artifacts/blob`,
    headers: testUtils.getHeaders(),
    qs: query
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body

    const deletedBlob = JSON.parse(body);
    // Verify artifact created properly
    chai.expect(deletedBlob.project).to.equal(projID);
    chai.expect(deletedBlob.location).to.equal(artData.location);
    chai.expect(deletedBlob.filename).to.equal(artData.filename);
    done();
  });
}

/**
 * @description Verifies PATCH request to update an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function patchArtifact(done) {
  // Get update artifact data
  const artData = testData.artifacts[0];

  const reqBody = {
    id: artData.id,
    name: 'edited_name'
  };

  const options = {
    method: 'PATCH',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
    headers: testUtils.getHeaders(),
    body: JSON.stringify(reqBody)
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const patchedArtifact = JSON.parse(body);

    // Verify artifact created properly
    chai.expect(patchedArtifact.id).to.equal(artData.id);
    chai.expect(patchedArtifact.branch).to.equal(branchID);
    chai.expect(patchedArtifact.project).to.equal(projID);
    chai.expect(patchedArtifact.org).to.equal(orgID);
    chai.expect(patchedArtifact.name).to.equal('edited_name');
    chai.expect(patchedArtifact.location).to.equal(artData.location);
    chai.expect(patchedArtifact.filename).to.equal(artData.filename);
    chai.expect(patchedArtifact.strategy).to.equal(M.config.artifact.strategy);
    chai.expect(patchedArtifact.custom).to.deep.equal(artData.custom);

    // Verify additional properties
    chai.expect(patchedArtifact.createdBy).to.equal(adminUser._id);
    chai.expect(patchedArtifact.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(patchedArtifact.createdOn).to.not.equal(null);
    chai.expect(patchedArtifact.updatedOn).to.not.equal(null);
    chai.expect(patchedArtifact.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(patchedArtifact).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}

/**
 * @description Verifies DELETE request to delete an artifact.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteArtifact(done) {
  const artData = testData.artifacts[0];
  artData.project = projID;
  artData.branch = branchID;

  const options = {
    method: 'DELETE',
    url: `${test.url}/api/orgs/${orgID}/projects/${projID}/branches/${branchID}/artifacts/${artData.id}`,
    headers: testUtils.getHeaders()
  };

  request(options, (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedArtifact = JSON.parse(body);
    // Verify artifact created properly
    chai.expect(deletedArtifact).to.equal(artData.id);
    done();
  });
}
