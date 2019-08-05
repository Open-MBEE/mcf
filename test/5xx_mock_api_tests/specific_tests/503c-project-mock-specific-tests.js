/**
 * Classification: UNCLASSIFIED
 *
 * @module test.503c-project-mock-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE projects.
 */

// NPM modules
const chai = require('chai');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// MBEE modules
const ProjectController = M.require('controllers.project-controller');
const apiController = M.require('controllers.api-controller');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const filepath = path.join(M.root, '/test/testzip.json');
let adminUser = null;
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
   * After: Connect to database. Create an admin user and organization
   */
  before((done) => {
    // Open the database connection
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      // Set global admin user
      adminUser = _adminUser;

      // Create organization
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      // Set global organization
      org = retOrg;
      done();
    })
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: Remove Organization.
   * Close database connection.
   */
  after((done) => {
    // Remove organization
    // Note: Projects under organization will also be removed
    testUtils.removeTestOrg(adminUser)
    .then(() => testUtils.removeTestAdmin())
    .then(() => fs.unlinkSync(filepath))
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute tests */
  it('should post projects from an uploaded gzip file', postGzip);
  it('should put projects from an uploaded gzip file', putGzip);
  it('should patch projects from an uploaded gzip file', patchGzip);
});

/* --------------------( Tests )-------------------- */

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create projects.
 */
function postGzip(done) {
  const projectData = testData.projects[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(projectData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org.id
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
    const createdProjects = JSON.parse(_data);
    const createdProject = createdProjects[0];

    // Verify project created properly
    chai.expect(createdProject.id).to.equal(projectData.id);
    chai.expect(createdProject.name).to.equal(projectData.name);
    chai.expect(createdProject.custom || {}).to.deep.equal(projectData.custom);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs a project
  apiController.postProjects(req, res);
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create or replace projects.
 */
function putGzip(done) {
  const projectData = testData.projects[1];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(projectData));
  fs.appendFileSync((filepath), zippedData);

  // Initialize the request attributes
  const params = {
    orgid: org.id
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
    const createdProjects = JSON.parse(_data);
    const createdProject = createdProjects[0];

    // Verify project created properly
    chai.expect(createdProject.id).to.equal(projectData.id);
    chai.expect(createdProject.name).to.equal(projectData.name);
    chai.expect(createdProject.custom || {}).to.deep.equal(projectData.custom);

    // Clear the data used for testing
    fs.truncateSync(filepath);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PUTs a project
  apiController.putProjects(req, res);
}

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to update projects.
 */
function patchGzip(done) {
  const projectData = testData.projects[2];

  // Create the project to be patched
  ProjectController.create(adminUser, org.id, projectData)
  .then(() => {
    projectData.name = 'updated';

    // Create a gzip file for testing
    const zippedData = zlib.gzipSync(JSON.stringify(projectData));
    fs.appendFileSync((filepath), zippedData);

    // Initialize the request attributes
    const params = {
      orgid: org.id
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
      const updatedProjects = JSON.parse(_data);
      const updatedProject = updatedProjects[0];

      // Verify project updated properly
      chai.expect(updatedProject.id).to.equal(projectData.id);
      chai.expect(updatedProject.name).to.equal(projectData.name);
      chai.expect(updatedProject.custom || {}).to.deep.equal(projectData.custom);

      // Clear the data used for testing
      fs.truncateSync(filepath);

      // Ensure the response was logged correctly
      setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
    };

    // PATCHes a project
    apiController.patchProjects(req, res);
  });
}
