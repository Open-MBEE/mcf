/**
 * @classification UNCLASSIFIED
 *
 * @module test.605a-element-api-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Phillip Lee
 *
 * @description This tests the element API controller functionality:
 * GET, POST, PATCH, and DELETE of an element.
 */

// NPM modules
const chai = require('chai');
const axios = require('axios');

// MBEE modules
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
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
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create org
      org = await testUtils.createTestOrg(adminUser);
      // Create project
      const retProj = await testUtils.createTestProject(adminUser, org._id);
      projID = utils.parseID(retProj._id).pop();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error.message).to.equal(null);
    }
  });

  /**
   * After: Delete organization and admin user.
   */
  after(async () => {
    try {
      // Delete organization
      await testUtils.removeTestOrg();
      // Delete admin user
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  it('should POST an element', postElement);
  it('should POST multiple elements', postElements);
  it('should PUT an element', putElement);
  it('should PUT multiple elements', putElements);
  it('should GET an element', getElement);
  it('should GET multiple elements', getElements);
  it('should GET an element through text search', searchElement);
  it('should PATCH an element', patchElement);
  it('should PATCH multiple elements', patchElements);
  it('should DELETE an element', deleteElement);
  it('should DELETE multiple elements', deleteElements);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies POST
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * creates a single element.
 */
async function postElement() {
  try {
    const elemData = testData.elements[0];
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements/${elemData.id}`,
      headers: testUtils.getHeaders(),
      data: elemData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const createdElement = res.data[0];

    // Verify element created properly
    chai.expect(createdElement.id).to.equal(elemData.id);
    chai.expect(createdElement.name).to.equal(elemData.name);
    chai.expect(createdElement.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(createdElement.project).to.equal(projID);

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(createdElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(createdElement.source).to.equal(elemData.source);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(createdElement.target).to.equal(elemData.target);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(createdElement.parent).to.equal(elemData.parent);
    }

    // Verify additional properties
    chai.expect(createdElement.createdBy).to.equal(adminUser._id);
    chai.expect(createdElement.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdElement.createdOn).to.not.equal(null);
    chai.expect(createdElement.updatedOn).to.not.equal(null);
    chai.expect(createdElement.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdElement).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * creates multiple elements.
 *
 */
async function postElements() {
  try {
    const elemData = [
      testData.elements[1],
      testData.elements[2],
      testData.elements[3],
      testData.elements[4],
      testData.elements[5]
    ];
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements`,
      headers: testUtils.getHeaders(),
      data: elemData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const createdElements = res.data;

    // Expect createdElements not to be empty
    chai.expect(createdElements.length).to.equal(elemData.length);
    // Convert createdElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, createdElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const createdElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(createdElement.id).to.equal(elemObj.id);
      chai.expect(createdElement.name).to.equal(elemObj.name);
      chai.expect(createdElement.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(createdElement.project).to.equal(projID);

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(createdElement.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(createdElement.source).to.equal(elemObj.source);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(createdElement.target).to.equal(elemObj.target);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(createdElement.parent).to.equal(elemObj.parent);
      }

      // Verify additional properties
      chai.expect(createdElement.createdBy).to.equal(adminUser._id);
      chai.expect(createdElement.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdElement.createdOn).to.not.equal(null);
      chai.expect(createdElement.updatedOn).to.not.equal(null);
      chai.expect(createdElement.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(createdElement).to.not.have.any.keys('archivedOn',
        'archivedBy', '__v', '_id');
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PUT
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * creates or replaces a single element.
 */
async function putElement() {
  try {
    const elemData = testData.elements[0];
    const options = {
      method: 'put',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements/${elemData.id}`,
      headers: testUtils.getHeaders(),
      data: elemData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const replacedElem = res.data[0];

    // Verify element created/replaced properly
    chai.expect(replacedElem.id).to.equal(elemData.id);
    chai.expect(replacedElem.name).to.equal(elemData.name);
    chai.expect(replacedElem.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(replacedElem.project).to.equal(projID);

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(replacedElem.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(replacedElem.source).to.equal(elemData.source);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(replacedElem.target).to.equal(elemData.target);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(replacedElem.parent).to.equal(elemData.parent);
    }

    // Verify additional properties
    chai.expect(replacedElem.createdBy).to.equal(adminUser._id);
    chai.expect(replacedElem.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedElem.createdOn).to.not.equal(null);
    chai.expect(replacedElem.updatedOn).to.not.equal(null);
    chai.expect(replacedElem.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(replacedElem).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PUT /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * creates or replaces multiple elements.
 */
async function putElements() {
  try {
    const elemData = [
      testData.elements[1],
      testData.elements[2],
      testData.elements[3],
      testData.elements[4],
      testData.elements[5],
      testData.elements[6]
    ];
    const options = {
      method: 'put',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements`,
      headers: testUtils.getHeaders(),
      data: elemData
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const replacedElements = res.data;

    // Expect replacedElements not to be empty
    chai.expect(replacedElements.length).to.equal(elemData.length);
    // Convert replacedElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, replacedElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const replacedElem = jmi2Elements[elemObj.id];

      // Verify elements created/replaced properly
      chai.expect(replacedElem.id).to.equal(elemObj.id);
      chai.expect(replacedElem.name).to.equal(elemObj.name);
      chai.expect(replacedElem.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(replacedElem.project).to.equal(projID);

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(replacedElem.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(replacedElem.source).to.equal(elemObj.source);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(replacedElem.target).to.equal(elemObj.target);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(replacedElem.parent).to.equal(elemObj.parent);
      }

      // Verify additional properties
      chai.expect(replacedElem.createdBy).to.equal(adminUser._id);
      chai.expect(replacedElem.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedElem.createdOn).to.not.equal(null);
      chai.expect(replacedElem.updatedOn).to.not.equal(null);
      chai.expect(replacedElem.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(replacedElem).to.not.have.any.keys('archivedOn', 'archivedBy',
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
 * @description Verifies GET
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * finds a single element.
 */
async function getElement() {
  try {
    const elemData = testData.elements[0];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements/${elemData.id}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const foundElement = res.data[0];

    // Verify element created properly
    chai.expect(foundElement.id).to.equal(elemData.id);
    chai.expect(foundElement.name).to.equal(elemData.name);
    chai.expect(foundElement.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(foundElement.project).to.equal(projID);

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(foundElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(foundElement.source).to.equal(elemData.source);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(foundElement.target).to.equal(elemData.target);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(foundElement.parent).to.equal(elemData.parent);
    }

    // Verify additional properties
    chai.expect(foundElement.createdBy).to.equal(adminUser._id);
    chai.expect(foundElement.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundElement.createdOn).to.not.equal(null);
    chai.expect(foundElement.updatedOn).to.not.equal(null);
    chai.expect(foundElement.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundElement).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * finds multiple elements.
 */
async function getElements() {
  try {
    const elemData = [
      testData.elements[1],
      testData.elements[2],
      testData.elements[3],
      testData.elements[4],
      testData.elements[5],
      testData.elements[6]
    ];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements`,
      headers: testUtils.getHeaders(),
      params: {
        ids: elemData.map(e => e.id).toString()
      }
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const foundElements = res.data;

    // Expect foundElements not to be empty
    chai.expect(foundElements.length).to.equal(elemData.length);

    // Convert foundElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, foundElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const foundElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(foundElement.id).to.equal(elemObj.id);
      chai.expect(foundElement.name).to.equal(elemObj.name);
      chai.expect(foundElement.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(foundElement.project).to.equal(projID);

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(foundElement.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(foundElement.source).to.equal(elemObj.source);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(foundElement.target).to.equal(elemObj.target);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(foundElement.parent).to.equal(elemObj.parent);
      }

      // Verify additional properties
      chai.expect(foundElement.createdBy).to.equal(adminUser._id);
      chai.expect(foundElement.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundElement.createdOn).to.not.equal(null);
      chai.expect(foundElement.updatedOn).to.not.equal(null);
      chai.expect(foundElement.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundElement).to.not.have.any.keys('archivedOn', 'archivedBy',
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
 * @description Verifies GET
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/search
 * searches for elements using text based search.
 *
 */
async function searchElement() {
  try {
    const elemData = testData.elements[0];
    const options = {
      method: 'get',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements/search?q="${elemData.name}"`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const resp = res.data;

    // Expect resp array to contains 1 element
    chai.expect(resp.length).to.equal(1);
    const foundElement = resp[0];

    // Verify element created properly
    chai.expect(foundElement.id).to.equal(elemData.id);
    chai.expect(foundElement.name).to.equal(elemData.name);
    chai.expect(foundElement.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(foundElement.project).to.equal(projID);

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(foundElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(foundElement.source).to.equal(elemData.source);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(foundElement.target).to.equal(elemData.target);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(foundElement.parent).to.equal(elemData.parent);
    }

    // Verify additional properties
    chai.expect(foundElement.createdBy).to.equal(adminUser._id);
    chai.expect(foundElement.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundElement.createdOn).to.not.equal(null);
    chai.expect(foundElement.updatedOn).to.not.equal(null);
    chai.expect(foundElement.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundElement).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PATCH
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * updates a single element.
 *
 */
async function patchElement() {
  try {
    const elemData = testData.elements[0];
    const updateObj = {
      id: elemData.id,
      name: `${elemData.name}_edit`
    };
    const options = {
      method: 'patch',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements/${elemData.id}`,
      headers: testUtils.getHeaders(),
      data: updateObj
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const updatedElement = res.data[0];

    // Verify element updated properly
    chai.expect(updatedElement.id).to.equal(elemData.id);
    chai.expect(updatedElement.name).to.equal(updateObj.name);
    chai.expect(updatedElement.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(updatedElement.project).to.equal(projID);

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(updatedElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(updatedElement.source).to.equal(elemData.source);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(updatedElement.target).to.equal(elemData.target);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(updatedElement.parent).to.equal(elemData.parent);
    }

    // Verify additional properties
    chai.expect(updatedElement.createdBy).to.equal(adminUser._id);
    chai.expect(updatedElement.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedElement.createdOn).to.not.equal(null);
    chai.expect(updatedElement.updatedOn).to.not.equal(null);
    chai.expect(updatedElement.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(updatedElement).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * updates multiple elements.
 */
async function patchElements() {
  try {
    const elemData = [
      testData.elements[1],
      testData.elements[2],
      testData.elements[3],
      testData.elements[4],
      testData.elements[5],
      testData.elements[6]
    ];
    const updateObj = elemData.map(e => ({
      id: e.id,
      name: `${e.name}_edit`
    }));
    const options = {
      method: 'patch',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements`,
      headers: testUtils.getHeaders(),
      data: updateObj
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const updatedElements = res.data;

    // Expect updatedElements not to be empty
    chai.expect(updatedElements.length).to.equal(elemData.length);

    // Convert updatedElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, updatedElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const updatedElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(updatedElement.id).to.equal(elemObj.id);
      chai.expect(updatedElement.name).to.equal(`${elemObj.name}_edit`);
      chai.expect(updatedElement.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(updatedElement.project).to.equal(projID);

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(updatedElement.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(updatedElement.source).to.equal(elemObj.source);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(updatedElement.target).to.equal(elemObj.target);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(updatedElement.parent).to.equal(elemObj.parent);
      }

      // Verify additional properties
      chai.expect(updatedElement.createdBy).to.equal(adminUser._id);
      chai.expect(updatedElement.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedElement.createdOn).to.not.equal(null);
      chai.expect(updatedElement.updatedOn).to.not.equal(null);
      chai.expect(updatedElement.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(updatedElement).to.not.have.any.keys('archivedOn',
        'archivedBy', '__v', '_id');
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * deletes a single element.
 *
 */
async function deleteElement() {
  try {
    const elemData = testData.elements[0];
    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements/${elemData.id}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const deleteElementID = res.data[0];

    // Verify correct element deleted
    chai.expect(deleteElementID).to.equal(elemData.id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * deletes multiple elements.
 */
async function deleteElements() {
  try {
    const elemData = [
      testData.elements[1],
      testData.elements[2],
      testData.elements[3],
      testData.elements[4],
      testData.elements[5],
      testData.elements[6]
    ];

    const elemIDs = elemData.map(e => e.id);
    const ids = elemIDs.join(',');
    const options = {
      method: 'delete',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/elements?ids=${ids}`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);

    // Verify response body
    const deletedElementIDs = res.data;
    chai.expect(deletedElementIDs).to.have.members(elemIDs);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
