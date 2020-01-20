/**
 * @classification UNCLASSIFIED
 *
 * @module test.502c-org-mock-specific-tests
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
 * GET, POST, PATCH, and DELETE orgs.
 */

// Node modules
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// NPM modules
const chai = require('chai');

// MBEE modules
const OrgController = M.require('controllers.organization-controller');
const APIController = M.require('controllers.api-controller');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
const filepath = path.join(M.root, '/test/testzip.json');
let adminUser = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Creates an admin user.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Removes test admin and test file.
   */
  after(async () => {
    try {
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
  it('should post orgs from an uploaded gzip file', postGzip);
  it('should put orgs from an uploaded gzip file', putGzip);
  it('should patch orgs from an uploaded gzip file', patchGzip);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create orgs.
 *
 * @param {Function} done - The mocha callback.
 */
function postGzip(done) {
  const orgData = testData.orgs[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(orgData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {};
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
    const createdOrgs = JSON.parse(_data);
    const createdOrg = createdOrgs[0];

    // Verify org created properly
    chai.expect(createdOrg.id).to.equal(orgData.id);
    chai.expect(createdOrg.name).to.equal(orgData.name);
    chai.expect(createdOrg.custom || {}).to.deep.equal(orgData.custom);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Remove the test org
    OrgController.remove(adminUser, orgData.id)
    .then(() => {
      done();
    });
  };

  // POST an org
  APIController.postOrgs(req, res, next(req, res));
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create or replace orgs.
 *
 * @param {Function} done - The mocha callback.
 */
function putGzip(done) {
  const orgData = testData.orgs[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(orgData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {};
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
    const createdOrgs = JSON.parse(_data);
    const createdOrg = createdOrgs[0];

    // Verify org created properly
    chai.expect(createdOrg.id).to.equal(orgData.id);
    chai.expect(createdOrg.name).to.equal(orgData.name);
    chai.expect(createdOrg.custom || {}).to.deep.equal(orgData.custom);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Remove the test org
    OrgController.remove(adminUser, orgData.id)
    .then(() => {
      done();
    });
  };

  // PUTs a org
  APIController.putOrgs(req, res, next(req, res));
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to update organizations.
 *
 * @param {Function} done - The mocha callback.
 */
function patchGzip(done) {
  const orgData = testData.orgs[0];

  // Create the org to be patched
  OrgController.create(adminUser, orgData)
  .then(() => {
    orgData.name = 'updated';

    // Create a gzip file for testing
    const zippedData = zlib.gzipSync(JSON.stringify(orgData));
    fs.appendFileSync((filepath), zippedData);

    // Initialize the request attributes
    const params = {};
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

      const createdOrgs = JSON.parse(_data);
      const createdOrg = createdOrgs[0];

      // Verify org updated properly
      chai.expect(createdOrg.id).to.equal(orgData.id);
      chai.expect(createdOrg.name).to.equal(orgData.name);
      chai.expect(createdOrg.custom || {}).to.deep.equal(orgData.custom);

      // Remove the test org
      OrgController.remove(adminUser, orgData.id)
      .then(() => {
        done();
      });
    };

    // PATCH an org
    APIController.patchOrgs(req, res, next(req, res));
  });
}
