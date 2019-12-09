/**
 * @classification UNCLASSIFIED
 *
 * @module test.505c-element-mock-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, PUT, and DELETE elements.
 */

// Node modules
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// NPM modules
const chai = require('chai');

// MBEE modules
const ElementController = M.require('controllers.element-controller');
const ProjectController = M.require('controllers.project-controller');
const apiController = M.require('controllers.api-controller');
const db = M.require('db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
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
   * After: Connect to database. Create an admin user, organization, and project.
   */
  before(async () => {
    try {
      // Open the database connection
      await db.connect();
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
   * After: Remove Organization and project.
   * Close database connection.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects under organization will also be removed
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
      await fs.unlinkSync(filepath);
      await db.disconnect();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  it('should create elements from an uploaded gzip file', postGzip);
  it('should put elements from an uploaded gzip file', putGzip);
  it('should patch elements from an uploaded gzip file', patchGzip);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create elements.
 *
 * @param {Function} done - The mocha callback.
 */
function postGzip(done) {
  const elementData = testData.elements[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(elementData));
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
    const createdElements = JSON.parse(_data);
    const createdElement = createdElements[0];

    // Verify element created properly
    chai.expect(createdElement.id).to.equal(elementData.id);
    chai.expect(createdElement.name).to.equal(elementData.name);
    chai.expect(createdElement.custom || {}).to.deep.equal(elementData.custom);
    chai.expect(createdElement.project).to.equal(projID);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POST elements
  apiController.postElements(req, res);
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create or replace elements.
 *
 * @param {Function} done - The mocha callback.
 */
function putGzip(done) {
  const elementData = testData.elements[1];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(elementData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID
  };
  const body = {};
  const method = 'PUT';
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
    const createdElements = JSON.parse(_data);
    const createdElement = createdElements[0];

    // Verify element created properly
    chai.expect(createdElement.id).to.equal(elementData.id);
    chai.expect(createdElement.name).to.equal(elementData.name);
    chai.expect(createdElement.custom || {}).to.deep.equal(elementData.custom);
    chai.expect(createdElement.project).to.equal(projID);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PUT elements
  apiController.putElements(req, res);
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to update elements.
 *
 * @param {Function} done - The mocha callback.
 */
function patchGzip(done) {
  const elementData = testData.elements[2];

  // Create the element to be patched
  ElementController.create(adminUser, org._id, projID, branchID, elementData)
  .then(() => {
    // Create a gzip file for testing
    const zippedData = zlib.gzipSync(JSON.stringify(elementData));
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
      const updatedElements = JSON.parse(_data);
      const updatedElement = updatedElements[0];

      // Verify element updated properly
      chai.expect(updatedElement.id).to.equal(elementData.id);
      chai.expect(updatedElement.name).to.equal(elementData.name);
      chai.expect(updatedElement.custom || {}).to.deep.equal(elementData.custom);
      chai.expect(updatedElement.project).to.equal(projID);

      // Clear the data used for testing
      fs.truncateSync(filepath);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // PATCH elements
    apiController.patchElements(req, res);
  });
}
