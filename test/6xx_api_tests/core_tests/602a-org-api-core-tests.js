/**
 * @classification UNCLASSIFIED
 *
 * @module test.602a-org-api-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Phillip Lee
 *
 * @description This tests the organization API controller functionality:
 * GET, POST, PATCH, and DELETE of an organization.
 *
 */

// NPM modules
const chai = require('chai');
const axios = require('axios');

// MBEE modules
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
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
   * Before: Create admin user.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Delete admin user.
   */
  after(async () => {
    try {
      // Delete test admin
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
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
  it('should DELETE multiple orgs', deleteOrgs);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies POST /api/orgs/:orgid creates an organization.
 */
async function postOrg() {
  try {
    const orgData = testData.orgs[0];
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${orgData.id}`,
      headers: testUtils.getHeaders(),
      data: orgData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const postedOrg = res.data[0];
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies POST /api/orgs creates multiple organizations.
 */
async function postOrgs() {
  try {
    const orgData = [
      testData.orgs[1],
      testData.orgs[2]
    ];
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs`,
      headers: testUtils.getHeaders(),
      data: orgData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const postedOrgs = res.data;
    chai.expect(postedOrgs.length).to.equal(orgData.length);

    // Convert postedOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, postedOrgs, 'id');
    // Loop through each org data object
    orgData.forEach((orgDataObject) => {
      const postedOrg = jmi2Orgs[orgDataObject.id];

      // Verify org created properly
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PUT /api/org/:orgid creates/replaces an organization.
 */
async function putOrg() {
  try {
    const orgData = testData.orgs[0];

    const options = {
      method: 'put',
      url: `${test.url}/api/orgs/${orgData.id}`,
      headers: testUtils.getHeaders(),
      data: orgData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const replacedOrg = res.data[0];
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PUT /api/orgs creates/replaces multiple organizations.
 */
async function putOrgs() {
  try {
    const orgData = [
      testData.orgs[1],
      testData.orgs[2],
      testData.orgs[3]
    ];
    const options = {
      method: 'put',
      url: `${test.url}/api/orgs`,
      headers: testUtils.getHeaders(),
      data: orgData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const replacedOrgs = res.data;
    chai.expect(replacedOrgs.length).to.equal(orgData.length);

    // Convert replacedOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, replacedOrgs, 'id');
    // Loop through each org data object
    orgData.forEach((orgDataObject) => {
      const replacedOrg = jmi2Orgs[orgDataObject.id];

      // Verify org created/replaced properly
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET /api/orgs/:orgid finds and returns the previously
 * created organization.
 */
async function getOrg() {
  try {
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${testData.orgs[0].id}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const foundOrg = res.data[0];
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET /api/orgs returns the two organizations to which
 * the user belongs.
 */
async function getOrgs() {
  try {
    const orgData = [
      testData.orgs[1],
      testData.orgs[2],
      testData.orgs[3]
    ];
    const orgIDs = orgData.map(p => p.id).join(',');

    const options = {
      method: 'get',
      url: `${test.url}/api/orgs?ids=${orgIDs}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verifies length of response body
    const foundOrgs = res.data;
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET /api/orgs returns all organizations
 * the user belongs to.
 */
async function getAllOrgs() {
  try {
    const orgData = [
      {
        id: M.config.server.defaultOrganizationId,
        name: M.config.server.defaultOrganizationName
      },
      testData.orgs[1],
      testData.orgs[2],
      testData.orgs[3]
    ];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verifies length of response body
    const foundOrgs = res.data;

    // Convert foundOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, foundOrgs, 'id');

    // Loop through each org data object
    orgData.forEach((orgDataObject) => {
      const foundOrg = jmi2Orgs[orgDataObject.id];

      // If the org was created in tests
      if (foundOrg.id !== M.config.server.defaultOrganizationId) {
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
      }
      // Special case for default org since it has no custom data
      else {
        chai.expect(foundOrg.id).to.equal(orgDataObject.id);
        chai.expect(foundOrg.name).to.equal(orgDataObject.name);
      }

      // Verify specific fields not returned
      chai.expect(foundOrg).to.not.have.any.keys('archivedOn', 'archivedBy',
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
 * @description Verifies PATCH /api/orgs/:orgid updates the provided org fields
 * on an existing organization.
 */
async function patchOrg() {
  try {
    const options = {
      method: 'patch',
      url: `${test.url}/api/orgs/${testData.orgs[0].id}`,
      headers: testUtils.getHeaders(),
      data: { name: 'Edited Name' }
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const patchedOrg = res.data[0];
    chai.expect(patchedOrg.id).to.equal(testData.orgs[0].id);
    chai.expect(patchedOrg.name).to.equal('Edited Name');
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PATCH /api/orgs updates multiple orgs at the same time.
 */
async function patchOrgs() {
  try {
    const orgData = [
      testData.orgs[1],
      testData.orgs[2],
      testData.orgs[3]
    ];
    const arrUpdateOrg = orgData.map((p) => ({
      id: p.id,
      name: 'Edited Name'
    }));

    const options = {
      method: 'patch',
      url: `${test.url}/api/orgs`,
      headers: testUtils.getHeaders(),
      data: arrUpdateOrg
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const postedOrgs = res.data;
    chai.expect(postedOrgs.length).to.equal(orgData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, postedOrgs, 'id');
    // Loop through each project data object
    orgData.forEach((orgDataObject) => {
      const patchedOrg = jmi2Orgs[orgDataObject.id];
      // Verify project created properly
      chai.expect(patchedOrg.id).to.equal(orgDataObject.id);
      chai.expect(patchedOrg.name).to.equal('Edited Name');
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
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE /api/orgs/:orgid deletes an organization.
 */
async function deleteOrg() {
  try {
    const orgData = testData.orgs[0];
    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs/${orgData.id}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const deletedID = res.data[0];

    // Verify correct orgs deleted
    chai.expect(deletedID).to.equal(orgData.id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE /api/orgs deletes multiple organizations.
 */
async function deleteOrgs() {
  try {
    const orgData = [
      testData.orgs[1],
      testData.orgs[2],
      testData.orgs[3]
    ];

    const orgIDs = orgData.map(o => o.id);
    const ids = orgIDs.join(',');

    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs?ids=${ids}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const deletedIDs = res.data;

    // Verify correct orgs deleted
    chai.expect(deletedIDs).to.have.members(orgIDs);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
