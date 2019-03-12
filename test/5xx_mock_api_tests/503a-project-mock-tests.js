/**
 * Classification: UNCLASSIFIED
 *
 * @module test.503a-project-mock-tests
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

// MBEE modules
const APIController = M.require('controllers.api-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
const testData = testUtils.importTestData('test_data.json');
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
   * Before: Run before all tests. Creates the admin user and test org.
   */
  before((done) => {
    // Connect db
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      // Set global admin user
      adminUser = _adminUser;

      // Create test org
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
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
   * After: Delete admin user and test org.
   */
  after((done) => {
    // Removing the test organization
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
  it('should POST a project', postProject);
  it('should POST multiple projects', postProjects);
  it('should GET a project', getProject);
  it('should GET multiple projects', getProjects);
  it('should GET all projects on an organization', getAllProjectsOnOrg);
  it('should GET all projects a user has access to', getAllProjects);
  it('should PATCH a project', patchProject);
  it('should PATCH multiple projects', patchProjects);
  it('should DELETE a project', deleteProject);
  it('should DELETE multiple projects', deleteProjects);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies mock POST request to create a project.
 */
function postProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org.id,
    projectid: testData.projects[0].id
  };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, projData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const createdProj = JSON.parse(_data);

    // Verify project created properly
    chai.expect(createdProj.id).to.equal(projData.id);
    chai.expect(createdProj.name).to.equal(projData.name);
    chai.expect(createdProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(createdProj.permissions[adminUser.username]).to.equal('admin');
    chai.expect(createdProj.org).to.equal(org.id);
    chai.expect(createdProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(createdProj.createdBy).to.equal(adminUser.username);
    chai.expect(createdProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(createdProj.createdOn).to.not.equal(null);
    chai.expect(createdProj.updatedOn).to.not.equal(null);

    // Verify specific fields not returned
    chai.expect(createdProj).to.not.have.keys(['archived', 'archivedOn',
      'archivedBy', '__v', '_id']);
    done();
  };

  // POSTs a project
  APIController.postProject(req, res);
}

/**
 * @description Verifies mock POST request to create multiple projects.
 */
function postProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const params = {
    orgid: org.id
  };
  const method = 'POST';
  const req = testUtils.createRequest(adminUser, params, projData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const createdProjects = JSON.parse(_data);
    chai.expect(createdProjects.length).to.equal(projData.length);

    // Convert createdProjects to JMI type 2 for easier lookup
    const jmi2Projects = utils.convertJMI(1, 2, createdProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const createdProj = jmi2Projects[projDataObject.id];

      // Verify project created properly
      chai.expect(createdProj.id).to.equal(projDataObject.id);
      chai.expect(createdProj.name).to.equal(projDataObject.name);
      chai.expect(createdProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(createdProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(createdProj.org).to.equal(org.id);
      chai.expect(createdProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(createdProj.createdBy).to.equal(adminUser.username);
      chai.expect(createdProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(createdProj.createdOn).to.not.equal(null);
      chai.expect(createdProj.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(createdProj).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // POSTs multiple projects
  APIController.postProjects(req, res);
}

/**
 * @description Verifies mock GET request to find a project.
 */
function getProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org.id,
    projectid: testData.projects[0].id
  };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const foundProj = JSON.parse(_data);

    // Verify correct project found
    chai.expect(foundProj.id).to.equal(projData.id);
    chai.expect(foundProj.name).to.equal(projData.name);
    chai.expect(foundProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(foundProj.permissions[adminUser.username]).to.equal('admin');
    chai.expect(foundProj.org).to.equal(org.id);
    chai.expect(foundProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(foundProj.createdBy).to.equal(adminUser.username);
    chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(foundProj.createdOn).to.not.equal(null);
    chai.expect(foundProj.updatedOn).to.not.equal(null);

    // Verify specific fields not returned
    chai.expect(foundProj).to.not.have.keys(['archived', 'archivedOn',
      'archivedBy', '__v', '_id']);
    done();
  };

  // GETs a project
  APIController.getProject(req, res);
}

/**
 * @description Verifies mock GET request to find multiple projects.
 */
function getProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const params = {
    orgid: org.id
  };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, projData.map(p => p.id), method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const foundProjects = JSON.parse(_data);
    chai.expect(Array.isArray(foundProjects)).to.equal(true);
    chai.expect(foundProjects.length).to.equal(projData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = utils.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projDataObject.id);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(foundProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(foundProj.org).to.equal(org.id);
      chai.expect(foundProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser.username);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // GETs multiple projects
  APIController.getProjects(req, res);
}

/**
 * @description Verifies mock GET request to find all projects in an org.
 */
function getAllProjectsOnOrg(done) {
  // Create request object
  const projData = [
    testData.projects[0],
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const params = {
    orgid: org.id
  };
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const foundProjects = JSON.parse(_data);
    chai.expect(Array.isArray(foundProjects)).to.equal(true);
    chai.expect(foundProjects.length).to.equal(projData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = utils.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projDataObject.id);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(foundProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(foundProj.org).to.equal(org.id);
      chai.expect(foundProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser.username);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // GETs multiple projects
  APIController.getProjects(req, res);
}

/**
 * @description Verifies mock GET request to find all projects a user has access
 * to.
 */
function getAllProjects(done) {
  // Create request object
  const projData = [
    testData.projects[0],
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const method = 'GET';
  const req = testUtils.createRequest(adminUser, {}, {}, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const foundProjects = JSON.parse(_data);
    chai.expect(Array.isArray(foundProjects)).to.equal(true);
    chai.expect(foundProjects.length).to.equal(projData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = utils.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projDataObject.id);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(foundProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(foundProj.org).to.equal(org.id);
      chai.expect(foundProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser.username);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // GETs multiple projects
  APIController.getAllProjects(req, res);
}

/**
 * @description Verifies mock PATCH request to update a project.
 */
function patchProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org.id,
    projectid: testData.projects[0].id
  };
  const method = 'PATCH';
  const updateObj = {
    id: projData.id,
    name: 'Updated Name'
  };
  const req = testUtils.createRequest(adminUser, params, updateObj, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const updatedProj = JSON.parse(_data);

    // Verify correct project updated
    chai.expect(updatedProj.id).to.equal(projData.id);
    chai.expect(updatedProj.name).to.equal(updateObj.name);
    chai.expect(updatedProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(updatedProj.permissions[adminUser.username]).to.equal('admin');
    chai.expect(updatedProj.org).to.equal(org.id);
    chai.expect(updatedProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(updatedProj.createdBy).to.equal(adminUser.username);
    chai.expect(updatedProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(updatedProj.createdOn).to.not.equal(null);
    chai.expect(updatedProj.updatedOn).to.not.equal(null);

    // Verify specific fields not returned
    chai.expect(updatedProj).to.not.have.keys(['archived', 'archivedOn',
      'archivedBy', '__v', '_id']);
    done();
  };

  // PATCHs a project
  APIController.patchProject(req, res);
}

/**
 * @description Verifies mock PATCH request to update multiple projects.
 */
function patchProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const params = {
    orgid: org.id
  };
  const method = 'PATCH';
  const updateObj = projData.map((p) => ({
    id: p.id,
    name: 'Updated Name'
  }));
  const req = testUtils.createRequest(adminUser, params, updateObj, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const updateProjects = JSON.parse(_data);
    chai.expect(Array.isArray(updateProjects)).to.equal(true);
    chai.expect(updateProjects.length).to.equal(projData.length);

    // Convert updateProjects to JMI type 2 for easier lookup
    const jmi2Projects = utils.convertJMI(1, 2, updateProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const updatedProj = jmi2Projects[projDataObject.id];

      // Verify correct project updated
      chai.expect(updatedProj.id).to.equal(projDataObject.id);
      chai.expect(updatedProj.name).to.equal('Updated Name');
      chai.expect(updatedProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(updatedProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(updatedProj.org).to.equal(org.id);
      chai.expect(updatedProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(updatedProj.createdBy).to.equal(adminUser.username);
      chai.expect(updatedProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(updatedProj.createdOn).to.not.equal(null);
      chai.expect(updatedProj.updatedOn).to.not.equal(null);

      // Verify specific fields not returned
      chai.expect(updatedProj).to.not.have.keys(['archived', 'archivedOn',
        'archivedBy', '__v', '_id']);
    });
    done();
  };

  // PATCHs multiple projects
  APIController.patchProjects(req, res);
}

/**
 * @description Verifies mock DELETE request to delete a project.
 */
function deleteProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org.id,
    projectid: testData.projects[0].id
  };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, {}, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const deletedID = JSON.parse(_data);

    // Verify correct project deleted
    chai.expect(deletedID).to.equal(projData.id);
    done();
  };

  // DELETEs a project
  APIController.deleteProject(req, res);
}

/**
 * @description Verifies mock DELETE request to delete multiple project.
 */
function deleteProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const params = {
    orgid: org.id
  };
  const method = 'PATCH';
  const req = testUtils.createRequest(adminUser, params, projData.map(p => p.id), method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const deletedIDs = JSON.parse(_data);

    // Verify correct project found
    chai.expect(deletedIDs).to.have.members(projData.map(p => p.id));
    done();
  };

  // DELETEs multiple project
  APIController.deleteProjects(req, res);
}
