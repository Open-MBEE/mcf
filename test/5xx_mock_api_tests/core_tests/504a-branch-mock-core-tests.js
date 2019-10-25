/**
 * @classification UNCLASSIFIED
 *
 * @module test.504a-branch-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE branches.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const apiController = M.require('controllers.api-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
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

      // Create organization
      return testUtils.createTestProject(adminUser, org.id);
    })
    .then((retProj) => {
      // Set global project
      proj = retProj;
      projID = utils.parseID(proj.id).pop();
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
   * After: Remove Organization and project.
   * Close database connection.
   */
  after((done) => {
    // Remove organization
    // Note: Projects under organization will also be removed
    testUtils.removeTestOrg(adminUser)
    .then(() => testUtils.removeTestAdmin())
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
  it('should POST a branch', postBranch);
  it('should POST multiple branches', postBranches);
  it('should GET a branch', getBranch);
  it('should GET multiple branches', getBranches);
  it('should GET ALL branches', getAllBranches);
  it('should PATCH a branch', patchBranch);
  it('should PATCH multiple branches', patchBranches);
  it('should DELETE a branch', deleteBranch);
  it('should DELETE multiple branches', deleteBranches);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock POST request to create a branch.
 *
 * @param {Function} done - The mocha callback.
 */
function postBranch(done) {
  const branchData = testData.branches[1];
  // Create request object
  const body = branchData;
  const params = {
    orgid: org.id,
    projectid: projID,
    branchid: branchData.id
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
    const createdBranch = JSON.parse(_data);

    // Verify branch created properly
    chai.expect(createdBranch.id).to.equal(branchData.id);
    chai.expect(createdBranch.name).to.equal(branchData.name);
    chai.expect(createdBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(createdBranch.project).to.equal(projID);
    chai.expect(createdBranch.source).to.equal(branchData.source);

    // Verify additional properties
    chai.expect(createdBranch.createdBy).to.equal(adminUser._id);
    chai.expect(createdBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdBranch.createdOn).to.not.equal(null);
    chai.expect(createdBranch.updatedOn).to.not.equal(null);
    chai.expect(createdBranch.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdBranch).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs a branch
  apiController.postBranch(req, res);
}

/**
 * @description Verifies mock POST request to create multiple branches.
 *
 * @param {Function} done - The mocha callback.
 */
function postBranches(done) {
  // Create request object
  const branchData = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  const params = {
    orgid: org.id,
    projectid: projID
  };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, branchData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const createdBranches = JSON.parse(_data);

    // Expect createdBranches not to be empty
    chai.expect(createdBranches.length).to.equal(branchData.length);
    // Convert createdBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, createdBranches, 'id');
    // Loop through each branch data object
    branchData.forEach((branchObj) => {
      const createdBranch = jmi2Branches[branchObj.id];

      // Verify branches created properly
      chai.expect(createdBranch.id).to.equal(branchObj.id);
      chai.expect(createdBranch.name).to.equal(branchObj.name);
      chai.expect(createdBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(createdBranch.project).to.equal(projID);
      chai.expect(createdBranch.source).to.equal(branchObj.source);

      // Verify additional properties
      chai.expect(createdBranch.createdBy).to.equal(adminUser._id);
      chai.expect(createdBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdBranch.createdOn).to.not.equal(null);
      chai.expect(createdBranch.updatedOn).to.not.equal(null);
      chai.expect(createdBranch.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(createdBranch).to.not.have.any.keys('archivedOn',
        'archivedBy', '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // POSTs multiple branches
  apiController.postBranches(req, res);
}

/**
 * @description Verifies mock GET request to get a branch.
 *
 * @param {Function} done - The mocha callback.
 */
function getBranch(done) {
  const branchData = testData.branches[1];
  // Create request object
  const body = {};
  const params = {
    orgid: org.id,
    projectid: projID,
    branchid: branchData.id
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
    const foundBranch = JSON.parse(_data);

    // Verify branch found properly
    chai.expect(foundBranch.id).to.equal(branchData.id);
    chai.expect(foundBranch.name).to.equal(branchData.name);
    chai.expect(foundBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(foundBranch.project).to.equal(projID);
    chai.expect(foundBranch.source).to.equal(branchData.source);

    // Verify additional properties
    chai.expect(foundBranch.createdBy).to.equal(adminUser._id);
    chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundBranch.createdOn).to.not.equal(null);
    chai.expect(foundBranch.updatedOn).to.not.equal(null);
    chai.expect(foundBranch.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundBranch).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs an branch
  apiController.getBranch(req, res);
}

/**
 * @description Verifies mock GET request to get multiple branches.
 *
 * @param {Function} done - The mocha callback.
 */
function getBranches(done) {
  const branchData = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create request object
  const params = { orgid: org.id, projectid: projID };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, branchData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const foundBranches = JSON.parse(_data);

    // Expect foundBranches not to be empty
    chai.expect(foundBranches.length).to.equal(branchData.length);

    // Convert foundBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, foundBranches, 'id');
    // Loop through each branch data object
    branchData.forEach((branchObj) => {
      const foundBranch = jmi2Branches[branchObj.id];

      // Verify branches found properly
      chai.expect(foundBranch.id).to.equal(branchObj.id);
      chai.expect(foundBranch.name).to.equal(branchObj.name);
      chai.expect(foundBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(foundBranch.project).to.equal(projID);
      chai.expect(foundBranch.source).to.equal(branchObj.source);

      // Verify additional properties
      chai.expect(foundBranch.createdBy).to.equal(adminUser._id);
      chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundBranch.createdOn).to.not.equal(null);
      chai.expect(foundBranch.updatedOn).to.not.equal(null);
      chai.expect(foundBranch.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundBranch).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs multiple branches
  apiController.getBranches(req, res);
}

/**
 * @description Verifies mock GET request to get all branches.
 *
 * @param {Function} done - The mocha callback.
 */
function getAllBranches(done) {
  const branchesData = [
    testData.branches[0],
    testData.branches[1],
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create request object
  const params = { orgid: org.id, projectid: projID };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const foundBranches = JSON.parse(_data);

    // Expect foundBranches not to be empty
    chai.expect(foundBranches.length).to.be.at.least(branchesData.length);

    // Convert foundBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, foundBranches, 'id');
    // Loop through each branch data object
    branchesData.forEach((branchObj) => {
      const foundBranch = jmi2Branches[branchObj.id];

      // Verify branches found properly
      chai.expect(foundBranch.id).to.equal(branchObj.id);
      chai.expect(foundBranch.name).to.equal(branchObj.name);
      chai.expect(foundBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(foundBranch.project).to.equal(projID);
      if (foundBranch.id !== 'master') {
        chai.expect(foundBranch.source).to.equal(branchObj.source);
        chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
      }

      // Verify additional properties
      chai.expect(foundBranch.createdBy).to.equal(adminUser._id);
      chai.expect(foundBranch.createdOn).to.not.equal(null);
      chai.expect(foundBranch.updatedOn).to.not.equal(null);
      chai.expect(foundBranch.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundBranch).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // GETs multiple branches
  apiController.getBranches(req, res);
}

/**
 * @description Verifies mock PATCH request to update a branch.
 *
 * @param {Function} done - The mocha callback.
 */
function patchBranch(done) {
  const branchData = testData.branches[1];
  // Create updated branch object
  const updateObj = {
    id: branchData.id,
    name: `${branchData.name}_edit`
  };

  const params = {
    orgid: org.id,
    projectid: projID,
    branchid: testData.branches[1].id
  };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, updateObj, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const updatedBranch = JSON.parse(_data);

    // Verify branch updated properly
    chai.expect(updatedBranch.id).to.equal(branchData.id);
    chai.expect(updatedBranch.name).to.equal(updateObj.name);
    chai.expect(updatedBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(updatedBranch.project).to.equal(projID);
    chai.expect(updatedBranch.source).to.equal(branchData.source);

    // Verify additional properties
    chai.expect(updatedBranch.createdBy).to.equal(adminUser._id);
    chai.expect(updatedBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedBranch.createdOn).to.not.equal(null);
    chai.expect(updatedBranch.updatedOn).to.not.equal(null);
    chai.expect(updatedBranch.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(updatedBranch).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs an branch
  apiController.patchBranch(req, res);
}

/**
 * @description Verifies mock PATCH request to update multiple branches.
 *
 * @param {Function} done - The mocha callback.
 */
function patchBranches(done) {
  // Create request object
  const branchData = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create objects to update branches
  const arrUpdateObjects = branchData.map(b => ({
    name: `${b.name}_edit`,
    id: b.id
  }));

  const params = { orgid: org.id, projectid: projID };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, arrUpdateObjects, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const updatedBranches = JSON.parse(_data);

    // Expect updatedBranches not to be empty
    chai.expect(updatedBranches.length).to.equal(branchData.length);

    // Convert updatedBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, updatedBranches, 'id');
    // Loop through each branch data object
    branchData.forEach((branchObj) => {
      const updatedBranch = jmi2Branches[branchObj.id];

      // Verify branches updated properly
      chai.expect(updatedBranch.id).to.equal(branchObj.id);
      chai.expect(updatedBranch.name).to.equal(`${branchObj.name}_edit`);
      chai.expect(updatedBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(updatedBranch.project).to.equal(projID);
      chai.expect(updatedBranch.source).to.equal(branchObj.source);

      // Verify additional properties
      chai.expect(updatedBranch.createdBy).to.equal(adminUser._id);
      chai.expect(updatedBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedBranch.createdOn).to.not.equal(null);
      chai.expect(updatedBranch.updatedOn).to.not.equal(null);
      chai.expect(updatedBranch.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(updatedBranch).to.not.have.any.keys('archivedOn',
        'archivedBy', '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // PATCHs multiple branches
  apiController.patchBranches(req, res);
}

/**
 * @description Verifies mock DELETE request to delete a branch.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteBranch(done) {
  // Create request object
  const body = {};
  const params = {
    orgid: org.id,
    projectid: projID,
    branchid: testData.branches[1].id
  };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const branchid = JSON.parse(_data);
    chai.expect(branchid).to.equal(testData.branches[1].id);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs an branch
  apiController.deleteBranch(req, res);
}

/**
 * @description Verifies mock DELETE request to delete multiple branches.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteBranches(done) {
  // Create request object
  const branchData = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];
  const branchIDs = branchData.map(b => b.id);

  const params = { orgid: org.id, projectid: projID };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, branchIDs, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const arrDeletedBranchIDs = JSON.parse(_data);
    chai.expect(arrDeletedBranchIDs).to.have.members(branchData.map(b => b.id));

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    // Ensure the response was logged correctly
    setTimeout(() => testUtils.testResponseLogging(_data.length, req, res, done), 50);
  };

  // DELETEs multiple branches
  apiController.deleteBranches(req, res);
}
