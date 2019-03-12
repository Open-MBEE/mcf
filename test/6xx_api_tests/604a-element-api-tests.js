/**
 * Classification: UNCLASSIFIED
 *
 * @module test.604a-element-api-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests the element API controller functionality:
 * GET, POST, PATCH, and DELETE of an element.
 */

// Node modules
const chai = require('chai');
const request = require('request');
const path = require('path');

// MBEE modules
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
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
  it('should POST an element', postElement);
  it('should POST multiple elements', postElements);
  it('should GET an element', getElement);
  it('should GET multiple elements', getElements);
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
function postElement(done) {
  const elemData = testData.elements[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements/${elemData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(elemData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdElement = JSON.parse(body);


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
  });
}

/**
 * @description Verifies POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * creates multiple elements.
 */
function postElements(done) {
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(elemData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdElements = JSON.parse(body);

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
  });
}

/**
 * @description Verifies GET
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * finds a single element.
 */
function getElement(done) {
  const elemData = testData.elements[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements/${elemData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundElement = JSON.parse(body);

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
  });
}

/**
 * @description Verifies GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * finds multiple elements.
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
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET',
    body: JSON.stringify(elemData.map(e => e.id))
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundElements = JSON.parse(body);

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
  });
}

/**
 * @description Verifies PATCH
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * updates a single element.
 */
function patchElement(done) {
  const elemData = testData.elements[0];
  const updateObj = {
    id: elemData.id,
    name: `${elemData.name}_edit`
  };
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements/${elemData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(updateObj)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedElement = JSON.parse(body);

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
  });
}

/**
 * @description Verifies PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * updates multiple elements.
 */
function patchElements(done) {
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
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(updateObj)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedElements = JSON.parse(body);

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
  });
}

/**
 * @description Verifies DELETE
 * /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 * deletes a single element.
 */
function deleteElement(done) {
  const elemData = testData.elements[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements/${elemData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deleteElementID = JSON.parse(body);

    // Verify correct element deleted
    chai.expect(deleteElementID).to.equal(elemData.id);
    done();
  });
}

/**
 * @description Verifies DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 * deletes multiple elements.
 */
function deleteElements(done) {
  const elemData = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projID}/branches/master/elements`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE',
    body: JSON.stringify(elemData.map(e => e.id))
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedElementIDs = JSON.parse(body);
    chai.expect(deletedElementIDs).to.have.members(elemData.map(p => p.id));
    done();
  });
}
