/**
 * @classification UNCLASSIFIED
 *
 * @module test.503a-project-mock-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Austin Bieber
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE projects.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const APIController = M.require('controllers.api-controller');
const jmi = M.require('lib.jmi-conversions');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
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
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
      org = await testUtils.createTestOrg(adminUser);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Delete admin user and test org.
   */
  after(async () => {
    try {
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
  it('should POST a project', postProject);
  it('should POST multiple projects', postProjects);
  it('should PUT a project', putProject);
  it('should PUT multiple projects', putProjects);
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
 *
 * @param {Function} done - The mocha callback.
 */
function postProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org._id,
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
    const createdProj = JSON.parse(_data)[0];

    // Verify project created properly
    chai.expect(createdProj.id).to.equal(projData.id);
    chai.expect(createdProj.name).to.equal(projData.name);
    chai.expect(createdProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(createdProj.permissions[adminUser._id]).to.equal('admin');
    chai.expect(createdProj.org).to.equal(org._id);
    chai.expect(createdProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(createdProj.createdBy).to.equal(adminUser._id);
    chai.expect(createdProj.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdProj.createdOn).to.not.equal(null);
    chai.expect(createdProj.updatedOn).to.not.equal(null);
    chai.expect(createdProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // POST a project
  APIController.postProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock POST request to create multiple projects.
 *
 * @param {Function} done - The mocha callback.
 */
function postProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3]
  ];
  const params = {
    orgid: org._id
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
    const jmi2Projects = jmi.convertJMI(1, 2, createdProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const createdProj = jmi2Projects[projDataObject.id];

      // Verify project created properly
      chai.expect(createdProj.id).to.equal(projDataObject.id);
      chai.expect(createdProj.name).to.equal(projDataObject.name);
      chai.expect(createdProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(createdProj.permissions[adminUser._id]).to.equal('admin');
      chai.expect(createdProj.org).to.equal(org._id);
      chai.expect(createdProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(createdProj.createdBy).to.equal(adminUser._id);
      chai.expect(createdProj.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdProj.createdOn).to.not.equal(null);
      chai.expect(createdProj.updatedOn).to.not.equal(null);
      chai.expect(createdProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(createdProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // POST multiple projects
  APIController.postProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock PUT request to create/replace a project.
 *
 * @param {Function} done - The mocha callback.
 */
function putProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org._id,
    projectid: testData.projects[0].id
  };
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, projData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const replacedProj = JSON.parse(_data)[0];

    // Verify project created/replaced properly
    chai.expect(replacedProj.id).to.equal(projData.id);
    chai.expect(replacedProj.name).to.equal(projData.name);
    chai.expect(replacedProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(replacedProj.permissions[adminUser._id]).to.equal('admin');
    chai.expect(replacedProj.org).to.equal(org._id);
    chai.expect(replacedProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(replacedProj.createdBy).to.equal(adminUser._id);
    chai.expect(replacedProj.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedProj.createdOn).to.not.equal(null);
    chai.expect(replacedProj.updatedOn).to.not.equal(null);
    chai.expect(replacedProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(replacedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PUTs a project
  APIController.putProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock PUT request to create/replace multiple projects.
 *
 * @param {Function} done - The mocha callback.
 */
function putProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const params = {
    orgid: org._id
  };
  const method = 'PUT';
  const req = testUtils.createRequest(adminUser, params, projData, method);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const replacedProjects = JSON.parse(_data);
    chai.expect(replacedProjects.length).to.equal(projData.length);

    // Convert replacedProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, replacedProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const replacedProj = jmi2Projects[projDataObject.id];

      // Verify project created/replaced properly
      chai.expect(replacedProj.id).to.equal(projDataObject.id);
      chai.expect(replacedProj.name).to.equal(projDataObject.name);
      chai.expect(replacedProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(replacedProj.permissions[adminUser._id]).to.equal('admin');
      chai.expect(replacedProj.org).to.equal(org._id);
      chai.expect(replacedProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(replacedProj.createdBy).to.equal(adminUser._id);
      chai.expect(replacedProj.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedProj.createdOn).to.not.equal(null);
      chai.expect(replacedProj.updatedOn).to.not.equal(null);
      chai.expect(replacedProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(replacedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PUTs multiple projects
  APIController.putProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to find a project.
 *
 * @param {Function} done - The mocha callback.
 */
function getProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org._id,
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
    const foundProj = JSON.parse(_data)[0];

    // Verify correct project found
    chai.expect(foundProj.id).to.equal(projData.id);
    chai.expect(foundProj.name).to.equal(projData.name);
    chai.expect(foundProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(foundProj.permissions[adminUser._id]).to.equal('admin');
    chai.expect(foundProj.org).to.equal(org._id);
    chai.expect(foundProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(foundProj.createdBy).to.equal(adminUser._id);
    chai.expect(foundProj.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundProj.createdOn).to.not.equal(null);
    chai.expect(foundProj.updatedOn).to.not.equal(null);
    chai.expect(foundProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET a project
  APIController.getProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to find multiple projects.
 *
 * @param {Function} done - The mocha callback.
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
    orgid: org._id
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
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projDataObject.id);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(foundProj.permissions[adminUser._id]).to.equal('admin');
      chai.expect(foundProj.org).to.equal(org._id);
      chai.expect(foundProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser._id);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);
      chai.expect(foundProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET multiple projects
  APIController.getProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to find all projects in an org.
 *
 * @param {Function} done - The mocha callback.
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
    orgid: org._id
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
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projDataObject.id);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(foundProj.permissions[adminUser._id]).to.equal('admin');
      chai.expect(foundProj.org).to.equal(org._id);
      chai.expect(foundProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser._id);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);
      chai.expect(foundProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET multiple projects
  APIController.getProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock GET request to find all projects a user has access
 * to.
 *
 * @param {Function} done - The mocha callback.
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
    chai.expect(foundProjects.length).to.be.at.least(projData.length);

    // Account for other projects on different orgs that may exist in the database.
    // This mitigates collisions in the jmi converter between projects of the same name.
    foundProjects.forEach((p) => {
      if (p.org !== org._id) {
        p.id = utils.createID(p.org, p.id);
      }
    });

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Check the projects that were created in tests
      if (foundProj.org !== testData.orgs[0].id) {
        // Verify correct project found
        chai.expect(foundProj.id).to.equal(projDataObject.id);
        chai.expect(foundProj.name).to.equal(projDataObject.name);
        chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom || {});
        chai.expect(foundProj.permissions[adminUser._id]).to.equal('admin');
        chai.expect(foundProj.org).to.equal(org._id);
        chai.expect(foundProj.visibility).to.equal(projDataObject.visibility || 'private');

        // Verify additional properties
        chai.expect(foundProj.createdBy).to.equal(adminUser._id);
        chai.expect(foundProj.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(foundProj.createdOn).to.not.equal(null);
        chai.expect(foundProj.updatedOn).to.not.equal(null);
        chai.expect(foundProj.archived).to.equal(false);

        // Verify specific fields not returned
        chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
          '__v', '_id');
      }
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // GET multiple projects
  APIController.getAllProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock PATCH request to update a project.
 *
 * @param {Function} done - The mocha callback.
 */
function patchProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org._id,
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
    const updatedProj = JSON.parse(_data)[0];

    // Verify correct project updated
    chai.expect(updatedProj.id).to.equal(projData.id);
    chai.expect(updatedProj.name).to.equal(updateObj.name);
    chai.expect(updatedProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(updatedProj.permissions[adminUser._id]).to.equal('admin');
    chai.expect(updatedProj.org).to.equal(org._id);
    chai.expect(updatedProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(updatedProj.createdBy).to.equal(adminUser._id);
    chai.expect(updatedProj.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedProj.createdOn).to.not.equal(null);
    chai.expect(updatedProj.updatedOn).to.not.equal(null);
    chai.expect(updatedProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(updatedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PATCH a project
  APIController.patchProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock PATCH request to update multiple projects.
 *
 * @param {Function} done - The mocha callback.
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
    orgid: org._id
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
    const jmi2Projects = jmi.convertJMI(1, 2, updateProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const updatedProj = jmi2Projects[projDataObject.id];

      // Verify correct project updated
      chai.expect(updatedProj.id).to.equal(projDataObject.id);
      chai.expect(updatedProj.name).to.equal('Updated Name');
      chai.expect(updatedProj.custom).to.deep.equal(projDataObject.custom || {});
      chai.expect(updatedProj.permissions[adminUser._id]).to.equal('admin');
      chai.expect(updatedProj.org).to.equal(org._id);
      chai.expect(updatedProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(updatedProj.createdBy).to.equal(adminUser._id);
      chai.expect(updatedProj.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedProj.createdOn).to.not.equal(null);
      chai.expect(updatedProj.updatedOn).to.not.equal(null);
      chai.expect(updatedProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(updatedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // PATCH multiple projects
  APIController.patchProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock DELETE request to delete a project.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteProject(done) {
  // Create request object
  const projData = testData.projects[0];
  const params = {
    orgid: org._id,
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
    const deletedID = JSON.parse(_data)[0];

    // Verify correct project deleted
    chai.expect(deletedID).to.equal(projData.id);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // DELETE a project
  APIController.deleteProjects(req, res, next(req, res));
}

/**
 * @description Verifies mock DELETE request to delete multiple project.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteProjects(done) {
  // Create request object
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];

  const projIDs = projData.map(p => p.id);
  const ids = projIDs.join(',');

  const body = {};
  const query = { ids: ids };
  const params = { orgid: org._id };
  const method = 'PATCH';

  const req = testUtils.createRequest(adminUser, params, body, method, query);

  // Set response as empty object
  const res = {};

  // Verifies status code and headers
  testUtils.createResponse(res);

  // Verifies the response data
  res.send = function send(_data) {
    // Parse the JSON response
    const deletedIDs = JSON.parse(_data);

    // Verify correct project found
    chai.expect(deletedIDs).to.have.members(projIDs);

    // Expect the statusCode to be 200
    chai.expect(res.statusCode).to.equal(200);

    done();
  };

  // DELETE multiple project
  APIController.deleteProjects(req, res, next(req, res));
}
