/**
 * @classification UNCLASSIFIED
 *
 * @module test.504c-branch-mock-specific-tests
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
 * GET, POST, PATCH, and DELETE branches.
 */

// Node modules
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// NPM modules
const chai = require('chai');

// MBEE modules
const BranchController = M.require('controllers.branch-controller');
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
      proj = await testUtils.createTestProject(adminUser, org._id, projData);
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
  it('should post branches from an uploaded gzip file', postGzip);
  it('should patch branches from an uploaded gzip file', patchGzip);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create branches.
 *
 * @param {Function} done - The mocha callback.
 */
function postGzip(done) {
  const branchData = testData.branches[1];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(branchData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org._id,
    projectid: projID
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
    const createdBranches = JSON.parse(_data);
    const createdBranch = createdBranches[0];

    // Verify branch created properly
    chai.expect(createdBranch.id).to.equal(branchData.id);
    chai.expect(createdBranch.name).to.equal(branchData.name);
    chai.expect(createdBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(createdBranch.project).to.equal(projID);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs a branch
  apiController.postBranches(req, res);
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to update branches.
 *
 * @param {Function} done - The mocha callback.
 */
function patchGzip(done) {
  const branchData = testData.branches[2];

  // Create the branch to be patched
  BranchController.create(adminUser, org._id, projID, branchData)
  .then(() => {
    branchData.name = 'updated';
    branchData.tag = undefined;
    branchData.source = undefined;

    // Create a gzip file for testing
    const zippedData = zlib.gzipSync(JSON.stringify(branchData));
    fs.appendFileSync((filepath), zippedData);

    // Initialize the request attributes
    const params = {
      orgid: org._id,
      projectid: projID
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
      const updatedBranches = JSON.parse(_data);
      const updatedBranch = updatedBranches[0];

      // Verify branch updated properly
      chai.expect(updatedBranch.id).to.equal(branchData.id);
      chai.expect(updatedBranch.name).to.equal(branchData.name);
      chai.expect(updatedBranch.custom || {}).to.deep.equal(branchData.custom);
      chai.expect(updatedBranch.project).to.equal(projID);

      // Clear the data used for testing
      fs.truncateSync(filepath);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // PATCHes a branch
    apiController.patchBranches(req, res);
  });
}
