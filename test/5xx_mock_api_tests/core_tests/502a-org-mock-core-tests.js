/**
 * @classification UNCLASSIFIED
 *
 * @module test.502a-org-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Phillip Lee
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE organizations.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const db = M.require('lib.db');
const apiController = M.require('controllers.api-controller');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
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
   * Before: Run before all tests. Creates the admin user.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((reqUser) => {
      adminUser = reqUser;
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
   * After: Delete admin user.
   */
  after((done) => {
    // Remove admin user
    testUtils.removeTestAdmin()
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
  it('should POST an org', postOrg);
  it('should POST multiple orgs', postOrgs);
  it('should PUT an org', putOrg);
  it('should PUT multiple orgs', putOrgs);
  it('should GET an org', getOrg);
  it('should GET multiple orgs', getOrgs);
  it('should GET all orgs', getAllOrgs);
  it('should PATCH an org', patchOrg);
  it('should PATCH multiple orgs', patchOrgs);
  it('should DELETE an org', deleteOrg);
  it('should DELETE orgs', deleteOrgs);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock POST request to create an organization.
 *
 * @param {Function} done - The mocha callback.
 */
function postOrg(done) {
  const orgData = testData.orgs[0];
  // Create request object
  const body = orgData;
  const params = { orgid: body.id };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const postedOrg = JSON.parse(_data);
    chai.expect(postedOrg.id).to.equal(orgData.id);
    chai.expect(postedOrg.name).to.equal(orgData.name);
    chai.expect(postedOrg.custom).to.deep.equal(orgData.custom || {});
    chai.expect(postedOrg.permissions[adminUser._id]).to.equal('admin');

    // Verify additional properties
    chai.expect(postedOrg.createdBy).to.equal(adminUser._id);
    chai.expect(postedOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(postedOrg.createdOn).to.not.equal(null);
    chai.expect(postedOrg.updatedOn).to.not.equal(null);
    chai.expect(postedOrg.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(postedOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs an org
  apiController.postOrg(req, res);
}

/**
 * @description Verifies mock POST request to create multiple organizations.
 *
 * @param {Function} done - The mocha callback.
 */
function postOrgs(done) {
  // Create request object
  const orgData = [
    testData.orgs[1],
    testData.orgs[2]
  ];
  const params = {};
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, orgData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const postedOrgs = JSON.parse(_data);
    chai.expect(postedOrgs.length).to.equal(orgData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, postedOrgs, 'id');
    // Loop through each project data object
    orgData.forEach((orgDataObject) => {
      const postedOrg = jmi2Orgs[orgDataObject.id];

      // Verify project created properly
      chai.expect(postedOrg.id).to.equal(orgDataObject.id);
      chai.expect(postedOrg.name).to.equal(orgDataObject.name);
      chai.expect(postedOrg.custom).to.deep.equal(orgDataObject.custom || {});
      chai.expect(postedOrg.permissions[adminUser._id]).to.equal('admin');

      // Verify additional properties
      chai.expect(postedOrg.createdBy).to.equal(adminUser._id);
      chai.expect(postedOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(postedOrg.createdOn).to.not.equal(null);
      chai.expect(postedOrg.updatedOn).to.not.equal(null);
      chai.expect(postedOrg.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(postedOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs multiple orgs
  apiController.postOrgs(req, res);
}

/**
 * @description Verifies mock PUT request to create/replace an organization.
 *
 * @param {Function} done - The mocha callback.
 */
function putOrg(done) {
  const orgData = testData.orgs[0];
  // Create request object
  const body = orgData;
  const params = { orgid: body.id };
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const replacedOrg = JSON.parse(_data);
    chai.expect(replacedOrg.id).to.equal(orgData.id);
    chai.expect(replacedOrg.name).to.equal(orgData.name);
    chai.expect(replacedOrg.custom).to.deep.equal(orgData.custom || {});
    chai.expect(replacedOrg.permissions[adminUser._id]).to.equal('admin');

    // Verify additional properties
    chai.expect(replacedOrg.createdBy).to.equal(adminUser._id);
    chai.expect(replacedOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedOrg.createdOn).to.not.equal(null);
    chai.expect(replacedOrg.updatedOn).to.not.equal(null);
    chai.expect(replacedOrg.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(replacedOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PUTs an org
  apiController.putOrg(req, res);
}

/**
 * @description Verifies mock PUT request to create/replace multiple
 * organizations.
 *
 * @param {Function} done - The mocha callback.
 */
function putOrgs(done) {
  // Create request object
  const orgData = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];
  const params = {};
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, orgData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const replacedOrgs = JSON.parse(_data);
    chai.expect(replacedOrgs.length).to.equal(orgData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, replacedOrgs, 'id');
    // Loop through each project data object
    orgData.forEach((orgDataObject) => {
      const replacedOrg = jmi2Orgs[orgDataObject.id];

      // Verify project created properly
      chai.expect(replacedOrg.id).to.equal(orgDataObject.id);
      chai.expect(replacedOrg.name).to.equal(orgDataObject.name);
      chai.expect(replacedOrg.custom).to.deep.equal(orgDataObject.custom || {});
      chai.expect(replacedOrg.permissions[adminUser._id]).to.equal('admin');

      // Verify additional properties
      chai.expect(replacedOrg.createdBy).to.equal(adminUser._id);
      chai.expect(replacedOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedOrg.createdOn).to.not.equal(null);
      chai.expect(replacedOrg.updatedOn).to.not.equal(null);
      chai.expect(replacedOrg.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(replacedOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PUTs multiple orgs
  apiController.putOrgs(req, res);
}

/**
 * @description Verifies mock GET request to get an organization.
 *
 * @param {Function} done - The mocha callback.
 */
function getOrg(done) {
  // Create request object
  const body = {};
  const params = { orgid: testData.orgs[0].id };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const foundOrg = JSON.parse(_data);
    chai.expect(foundOrg.id).to.equal(testData.orgs[0].id);
    chai.expect(foundOrg.name).to.equal(testData.orgs[0].name);
    chai.expect(foundOrg.custom).to.deep.equal(testData.orgs[0].custom || {});
    chai.expect(foundOrg.permissions[adminUser._id]).to.equal('admin');

    // Verify additional properties
    chai.expect(foundOrg.createdBy).to.equal(adminUser._id);
    chai.expect(foundOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundOrg.createdOn).to.not.equal(null);
    chai.expect(foundOrg.updatedOn).to.not.equal(null);
    chai.expect(foundOrg.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs an org
  apiController.getOrg(req, res);
}

/**
 * @description Verifies mock GET request to get multiple organizations.
 *
 * @param {Function} done - The mocha callback.
 */
function getOrgs(done) {
  const orgData = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];
  // Create request object
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, orgData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verifies length of response body
    const foundOrgs = JSON.parse(_data);
    chai.expect(foundOrgs.length).to.equal(orgData.length);

    // Convert foundOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, foundOrgs, 'id');

    // Loop through each org data object
    orgData.forEach((orgDataObject) => {
      const foundOrg = jmi2Orgs[orgDataObject.id];

      // Verify org created properly
      chai.expect(foundOrg.id).to.equal(orgDataObject.id);
      chai.expect(foundOrg.name).to.equal(orgDataObject.name);
      chai.expect(foundOrg.custom).to.deep.equal(orgDataObject.custom || {});
      chai.expect(foundOrg.permissions[adminUser._id]).to.equal('admin');

      // Verify additional properties
      chai.expect(foundOrg.createdBy).to.equal(adminUser._id);
      chai.expect(foundOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundOrg.createdOn).to.not.equal(null);
      chai.expect(foundOrg.updatedOn).to.not.equal(null);
      chai.expect(foundOrg.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs all orgs
  apiController.getOrgs(req, res);
}

/**
 * @description Verifies mock GET request to get all organizations.
 *
 * @param {Function} done - The mocha callback.
 */
function getAllOrgs(done) {
  const orgData = [
    testData.orgs[0],
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Create request object
  const body = {};
  const params = {};
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verifies length of response body
    const foundOrgs = JSON.parse(_data);

    // Convert foundOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, foundOrgs, 'id');

    // Loop through each org data object
    orgData.forEach((orgDataObject) => {
      const foundOrg = jmi2Orgs[orgDataObject.id];

      // Verify org created properly
      chai.expect(foundOrg.id).to.equal(orgDataObject.id);
      chai.expect(foundOrg.name).to.equal(orgDataObject.name);
      chai.expect(foundOrg.custom).to.deep.equal(orgDataObject.custom || {});
      chai.expect(foundOrg.permissions[adminUser._id]).to.equal('admin');

      // Verify additional properties
      chai.expect(foundOrg.createdBy).to.equal(adminUser._id);
      chai.expect(foundOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundOrg.createdOn).to.not.equal(null);
      chai.expect(foundOrg.updatedOn).to.not.equal(null);
      chai.expect(foundOrg.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs all orgs
  apiController.getOrgs(req, res);
}

/**
 * @description Verifies mock PATCH request to update an organization.
 *
 * @param {Function} done - The mocha callback.
 */
function patchOrg(done) {
  // Create request object
  const body = { name: testData.orgs[1].name };
  const params = { orgid: testData.orgs[0].id };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const patchedOrg = JSON.parse(_data);
    chai.expect(patchedOrg.id).to.equal(testData.orgs[0].id);
    chai.expect(patchedOrg.name).to.equal(testData.orgs[1].name);
    chai.expect(patchedOrg.custom).to.deep.equal(testData.orgs[0].custom || {});
    chai.expect(patchedOrg.permissions[adminUser._id]).to.equal('admin');

    // Verify additional properties
    chai.expect(patchedOrg.createdBy).to.equal(adminUser._id);
    chai.expect(patchedOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(patchedOrg.createdOn).to.not.equal(null);
    chai.expect(patchedOrg.updatedOn).to.not.equal(null);
    chai.expect(patchedOrg.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(patchedOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs an org
  apiController.patchOrg(req, res);
}

/**
 * @description Verifies mock PATCH request to update multiple orgs.
 *
 * @param {Function} done - The mocha callback.
 */
function patchOrgs(done) {
  // Create request object
  const orgData = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];
  const arrUpdateOrg = orgData.map((p) => ({
    id: p.id,
    name: testData.orgs[1].name
  }));

  const params = {};
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, arrUpdateOrg, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const postedOrgs = JSON.parse(_data);
    chai.expect(postedOrgs.length).to.equal(orgData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, postedOrgs, 'id');
    // Loop through each project data object
    orgData.forEach((orgDataObject) => {
      const patchedOrg = jmi2Orgs[orgDataObject.id];
      // Verify project created properly
      chai.expect(patchedOrg.id).to.equal(orgDataObject.id);
      chai.expect(patchedOrg.name).to.equal(testData.orgs[1].name);
      chai.expect(patchedOrg.custom).to.deep.equal(orgDataObject.custom);
      chai.expect(patchedOrg.permissions[adminUser._id]).to.equal('admin');

      // Verify additional properties
      chai.expect(patchedOrg.createdBy).to.equal(adminUser._id);
      chai.expect(patchedOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(patchedOrg.createdOn).to.not.equal(null);
      chai.expect(patchedOrg.updatedOn).to.not.equal(null);
      chai.expect(patchedOrg.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(patchedOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs multiple orgs
  apiController.patchOrgs(req, res);
}

/**
 * @description Verifies mock DELETE request to delete an organization.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteOrg(done) {
  // Create request object
  const body = {};
  const params = { orgid: testData.orgs[0].id };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const deletedID = JSON.parse(_data);

    // Verify correct org deleted
    chai.expect(deletedID).to.equal(testData.orgs[0].id);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs an org
  apiController.deleteOrg(req, res);
}

/**
 * @description Verifies mock DELETE request to delete multiple organizations.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteOrgs(done) {
  // Create request object
  const orgData = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];
  const params = {};
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, orgData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const deletedIDs = JSON.parse(_data);
    // Verify correct orgs deleted
    chai.expect(deletedIDs).to.have.members(orgData.map(p => p.id));

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs multiple orgs
  apiController.deleteOrgs(req, res);
}
