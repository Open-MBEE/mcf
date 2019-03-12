/**
 * Classification: UNCLASSIFIED
 *
 * @module test.504a-element-mock-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE elements.
 */

// NPM modules
const chai = require('chai');
const path = require('path');

// MBEE modules
const ProjController = M.require('controllers.project-controller');
const apiController = M.require('controllers.api-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
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
   * After: Connect to database. Create an admin user, organization, and project
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

      // Define project data
      const projData = testData.projects[0];

      // Create project
      return ProjController.create(adminUser, org.id, projData);
    })
    .then((retProj) => {
      // Set global project
      proj = retProj;
      projID = utils.parseID(proj[0].id).pop();
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
  it('should POST an element', postElement);
  it('should POST multiple elements', postElements);
  it('should GET an element', getElement);
  it('should GET multiple elements', getElements);
  it('should GET ALL elements', getAllElements);
  it('should PATCH an element', patchElement);
  it('should PATCH multiple elements', patchElements);
  it('should DELETE an element', deleteElement);
  it('should DELETE multiple elements', deleteElements);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock POST request to create an element.
 */
function postElement(done) {
  const elemData = testData.elements[0];
  // Create request object
  const body = elemData;
  const params = {
    orgid: org.id,
    projectid: projID,
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
    chai.expect(createdElement.custom).to.deep.equal(elemData.custom);
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
    chai.expect(createdElement.createdBy).to.equal(adminUser.username);
    chai.expect(createdElement.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(createdElement.createdOn).to.not.equal(null);
    chai.expect(createdElement.updatedOn).to.not.equal(null);

    // Verify specific fields not returned
    chai.expect(createdElement).to.not.have.keys(['archived', 'archivedOn',
      'archivedBy', '__v', '_id']);
    done();
  };

  // POSTs an element
  apiController.postElement(req, res);
}

/**
 * @description Verifies mock POST request to create multiple elements.
 */
function postElements(done) {
  // Create request object
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];
  const params = { orgid: org.id, projectid: projID };
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
    const jmi2Elements = utils.convertJMI(1, 2, createdElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const createdElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(createdElement.id).to.equal(elemObj.id);
      chai.expect(createdElement.name).to.equal(elemObj.name);
      chai.expect(createdElement.custom).to.deep.equal(elemObj.custom);
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
      chai.expect(createdElement.createdBy).to.equal(adminUser.username);
      chai.expect(createdElement.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(createdElement.createdOn).to.not.equal(null);
      chai.expect(createdElement.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(createdElement).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // POSTs multiple elements
  apiController.postElements(req, res);
}

/**
 * @description Verifies mock GET request to get an element.
 */
function getElement(done) {
  const elemData = testData.elements[0];
  // Create request object
  const body = {};
  const params = {
    orgid: org.id,
    projectid: projID,
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
    chai.expect(foundElement.custom).to.deep.equal(elemData.custom);
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
    chai.expect(foundElement.createdBy).to.equal(adminUser.username);
    chai.expect(foundElement.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(foundElement.createdOn).to.not.equal(null);
    chai.expect(foundElement.updatedOn).to.not.equal(null);

    // Verify specific fields not returned
    chai.expect(foundElement).to.not.have.keys(['archived', 'archivedOn',
      'archivedBy', '__v', '_id']);
    done();
  };

  // GETs an element
  apiController.getElement(req, res);
}

/**
 * @description Verifies mock GET request to get multiple elements.
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
  const params = { orgid: org.id, projectid: projID };
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
    const jmi2Elements = utils.convertJMI(1, 2, foundElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const foundElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(foundElement.id).to.equal(elemObj.id);
      chai.expect(foundElement.name).to.equal(elemObj.name);
      chai.expect(foundElement.custom).to.deep.equal(elemObj.custom);
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
      chai.expect(foundElement.createdBy).to.equal(adminUser.username);
      chai.expect(foundElement.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundElement.createdOn).to.not.equal(null);
      chai.expect(foundElement.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(foundElement).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // GETs multiple elements
  apiController.getElements(req, res);
}

/**
 * @description Verifies mock GET request to get all elements.
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
    const foundElements = JSON.parse(_data);

    // Expect foundElements not to be empty
    chai.expect(foundElements.length).to.be.at.least(elemData.length);

    // Convert foundElements to JMI type 2 for easier lookup
    const jmi2Elements = utils.convertJMI(1, 2, foundElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const foundElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(foundElement.id).to.equal(elemObj.id);
      chai.expect(foundElement.name).to.equal(elemObj.name);
      chai.expect(foundElement.custom).to.deep.equal(elemObj.custom);
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
      chai.expect(foundElement.createdBy).to.equal(adminUser.username);
      chai.expect(foundElement.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundElement.createdOn).to.not.equal(null);
      chai.expect(foundElement.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(foundElement).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // GETs multiple elements
  apiController.getElements(req, res);
}

/**
 * @description Verifies mock PATCH request to update an element.
 */
function patchElement(done) {
  const elemData = testData.elements[0];
  // Create updated elem object
  const updateObj = {
    id: elemData.id,
    name: `${elemData.name}_edit`
  };

  const params = {
    orgid: org.id,
    projectid: projID,
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
    chai.expect(updatedElement.custom).to.deep.equal(elemData.custom);
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
    chai.expect(updatedElement.createdBy).to.equal(adminUser.username);
    chai.expect(updatedElement.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(updatedElement.createdOn).to.not.equal(null);
    chai.expect(updatedElement.updatedOn).to.not.equal(null);

    // Verify specific fields not returned
    chai.expect(updatedElement).to.not.have.keys(['archived', 'archivedOn',
      'archivedBy', '__v', '_id']);
    done();
  };

  // PATCHs an element
  apiController.patchElement(req, res);
}

/**
 * @description Verifies mock PATCH request to update multiple elements.
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
  const arrUpdateObjects = elemData.map(p => ({
    name: `${p.name}_edit`,
    id: p.id
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
    const updatedElements = JSON.parse(_data);

    // Expect updatedElements not to be empty
    chai.expect(updatedElements.length).to.equal(elemData.length);

    // Convert updatedElements to JMI type 2 for easier lookup
    const jmi2Elements = utils.convertJMI(1, 2, updatedElements, 'id');
    // Loop through each element data object
    elemData.forEach((elemObj) => {
      const updatedElement = jmi2Elements[elemObj.id];

      // Verify elements created properly
      chai.expect(updatedElement.id).to.equal(elemObj.id);
      chai.expect(updatedElement.name).to.equal(`${elemObj.name}_edit`);
      chai.expect(updatedElement.custom).to.deep.equal(elemObj.custom);
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
      chai.expect(updatedElement.createdBy).to.equal(adminUser.username);
      chai.expect(updatedElement.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(updatedElement.createdOn).to.not.equal(null);
      chai.expect(updatedElement.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(updatedElement).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // PATCHs multiple elements
  apiController.patchElements(req, res);
}

/**
 * @description Verifies mock DELETE request to delete an element.
 */
function deleteElement(done) {
  // Create request object
  const body = {};
  const params = {
    orgid: org.id,
    projectid: projID,
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
    done();
  };

  // DELETEs an element
  apiController.deleteElement(req, res);
}

/**
 * @description Verifies mock DELETE request to delete multiple elements.
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

  const params = { orgid: org.id, projectid: projID };
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
    done();
  };

  // DELETEs multiple elements
  apiController.deleteElements(req, res);
}
