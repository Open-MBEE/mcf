/**
 * @classification UNCLASSIFIED
 *
 * @module test.505a-element-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE elements.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const ProjectController = M.require('controllers.project-controller');
const APIController = M.require('controllers.api-controller');
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
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
   * Before: Create a global admin user, organization, and project.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
      org = await testUtils.createTestOrg(adminUser);
      proj = await ProjectController.create(adminUser, org._id, testData.projects[0]);
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
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  it('should POST an element', postElement);
  it('should POST multiple elements', postElements);
  it('should PUT an element', putElement);
  it('should PUT multiple elements', putElements);
  it('should GET an element', getElement);
  it('should GET multiple elements', getElements);
  it('should GET ALL elements', getAllElements);
  it('should GET an element through text search', searchElement);
  it('should PATCH an element', patchElement);
  it('should PATCH multiple elements', patchElements);
  it('should DELETE an element', deleteElement);
  it('should DELETE multiple elements', deleteElements);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock POST request to create an element.
 *
 * @param {Function} done - The mocha callback.
 */
function postElement(done) {
  const elemData = testData.elements[0];
  // Create request object
  const body = elemData;
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID,
    elementid: elemData.id
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
    const createdElement = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // POST an element
  APIController.postElement(req, res, next(req, res));
}

/**
 * @description Verifies mock POST request to create multiple elements.
 *
 * @param {Function} done - The mocha callback.
 */
function postElements(done) {
  // Create request object
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5]
  ];
  const params = { orgid: org._id, projectid: projID, branchid: branchID };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, elemData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const createdElements = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // POST multiple elements
  APIController.postElements(req, res, next(req, res));
}

/**
 * @description Verifies mock PUT request to create/replace an element.
 *
 * @param {Function} done - The mocha callback.
 */
function putElement(done) {
  const elemData = testData.elements[0];
  // Create request object
  const body = elemData;
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID,
    elementid: elemData.id
  };
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const replacedElem = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PUTs an element
  APIController.putElement(req, res, next(req, res));
}

/**
 * @description Verifies mock PUT request to create/replace multiple elements.
 *
 * @param {Function} done - The mocha callback.
 */
function putElements(done) {
  // Create request object
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];
  const params = { orgid: org._id, projectid: projID, branchid: branchID };
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, elemData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const replacedElements = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PUTs multiple elements
  APIController.putElements(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to get an element.
 *
 * @param {Function} done - The mocha callback.
 */
function getElement(done) {
  const elemData = testData.elements[0];
  // Create request object
  const body = {};
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID,
    elementid: elemData.id
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
    const foundElement = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET an element
  APIController.getElement(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to get multiple elements.
 *
 * @param {Function} done - The mocha callback.
 */
function getElements(done) {
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create request object
  const params = { orgid: org._id, projectid: projID, branchid: branchID };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, elemData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const foundElements = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET multiple elements
  APIController.getElements(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to get all elements.
 *
 * @param {Function} done - The mocha callback.
 */
function getAllElements(done) {
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create request object
  const params = { orgid: org._id, projectid: projID, branchid: branchID };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const foundElements = JSON.parse(_data);

    // Expect foundElements not to be empty
    chai.expect(foundElements.length).to.be.at.least(elemData.length);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET multiple elements
  APIController.getElements(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to search elements.
 *
 * @param {Function} done - The mocha callback.
 */
function searchElement(done) {
  const elemData = testData.elements[0];
  // Create request object
  const body = {};
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID,
    elementid: elemData.id
  };
  const query = { q: `"${elemData.name}"` };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, body, method, query);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const response = JSON.parse(_data);

    // Expect response array to contains 1 element
    chai.expect(response.length).to.equal(1);
    const foundElement = response[0];

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET elements through text search
  APIController.searchElements(req, res, next(req, res));
}

/**
 * @description Verifies mock PATCH request to update an element.
 *
 * @param {Function} done - The mocha callback.
 */
function patchElement(done) {
  const elemData = testData.elements[0];
  // Create updated elem object
  const updateObj = {
    id: elemData.id,
    name: `${elemData.name}_edit`
  };

  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID,
    elementid: testData.elements[0].id
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
    const updatedElement = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PATCH an element
  APIController.patchElement(req, res, next(req, res));
}

/**
 * @description Verifies mock PATCH request to update multiple elements.
 *
 * @param {Function} done - The mocha callback.
 */
function patchElements(done) {
  // Create request object
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create objects to update elements
  const arrUpdateObjects = elemData.map(e => ({
    name: `${e.name}_edit`,
    id: e.id
  }));

  const params = { orgid: org._id, projectid: projID, branchid: branchID };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, arrUpdateObjects, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Verify response body
    const updatedElements = JSON.parse(_data);

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

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PATCH multiple elements
  APIController.patchElements(req, res, next(req, res));
}

/**
 * @description Verifies mock DELETE request to delete an element.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteElement(done) {
  // Create request object
  const body = {};
  const params = {
    orgid: org._id,
    projectid: projID,
    branchid: branchID,
    elementid: testData.elements[0].id
  };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, body, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const elementid = JSON.parse(_data);
    chai.expect(elementid).to.equal(testData.elements[0].id);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // DELETE an element
  APIController.deleteElement(req, res, next(req, res));
}

/**
 * @description Verifies mock DELETE request to delete multiple elements.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteElements(done) {
  // Create request object
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];
  const elemIDs = elemData.map(e => e.id);

  const params = { orgid: org._id, projectid: projID, branchid: branchID };
  const method = 'DELETE';
  const req = testUtils.createRequest(adminUser, params, elemIDs, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    const arrDeletedElemIDs = JSON.parse(_data);
    chai.expect(arrDeletedElemIDs).to.have.members(elemData.map(p => p.id));

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // DELETE multiple elements
  APIController.deleteElements(req, res, next(req, res));
}
