/**
 * Classification: UNCLASSIFIED
 *
 * @module test.605c-element-api-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests specific functionality of the element API:
 * GET, POST, PATCH, and DELETE of an element.
 */

// NPM modules
const chai = require('chai');
const request = require('request');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// MBEE modules
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
const zipfilepath = path.join(M.root, '/test/testzip.json');
let org = null;
let adminUser = null;
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
   * Before: Create admin, organization, and project.
   */
  before((done) => {
    // Open the database connection
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set admin global user
      adminUser = user;

      // Create org
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      org = retOrg;

      // Create project
      return testUtils.createTestProject(adminUser, org.id);
    })
    .then((retProj) => {
      projID = utils.parseID(retProj.id).pop();
      done();
    })
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /**
   * After: Delete organization and admin user
   */
  after((done) => {
    // Delete organization
    testUtils.removeTestOrg(adminUser)
    // Delete admin user
    .then(() => testUtils.removeTestAdmin())
    .then(() => fs.unlinkSync(zipfilepath))
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  it('should create elements from an uploaded gzip file', handleGzipUpload);
});

/* --------------------( Tests )-------------------- */

/**
 * @description Verifies that a gzip file can be uploaded, unzipped, and
 * the contents can be used to create elements.
 */
function handleGzipUpload(done) {
  const elementData = testData.elements[0];

  // Create a gzip file for testing
  const zippedData = zlib.gzipSync(JSON.stringify(elementData));
  fs.appendFileSync((zipfilepath), zippedData);

  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements`,
    // Send the 'application/gzip' header
    headers: testUtils.getHeaders('application/gzip'),
    ca: testUtils.readCaFile(),
    method: 'POST',
    // Send a zip file containing element data in the body
    body: fs.createReadStream(zipfilepath)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);

    // Verify response body
    const createdElements = JSON.parse(body);

    // Verify one element is returned
    chai.expect(createdElements.length).to.equal(1);

    const createdElement = createdElements[0];

    // Verify element created properly
    chai.expect(createdElement.id).to.equal(elementData.id);
    chai.expect(createdElement.name).to.equal(elementData.name);
    chai.expect(createdElement.custom || {}).to.deep.equal(elementData.custom);
    chai.expect(createdElement.project).to.equal(projID);

    // Clear the data used for testing
    fs.truncateSync(zipfilepath);

    done();
  });
}
