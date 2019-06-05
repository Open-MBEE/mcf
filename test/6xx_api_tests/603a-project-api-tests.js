/**
 * Classification: UNCLASSIFIED
 *
 * @module test.603a-project-api-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests the project API controller functionality:
 * GET, POST, PATCH, and DELETE of a project.
 */

// NPM modules
const chai = require('chai');
const request = require('request');

// MBEE modules
const db = M.require('lib.db');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
let org = null;
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
 * @description Verifies POST /api/orgs/:orgid/projects/:projectid creates a
 * project.
 */
function postProject(done) {
  const projData = testData.projects[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(projData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdProj = JSON.parse(body);

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
    chai.expect(createdProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(createdProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}

/**
 * @description Verifies POST /api/orgs/:orgid/projects creates multiple
 * projects.
 */
function postProjects(done) {
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3]
  ];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(projData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const createdProjects = JSON.parse(body);
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
      chai.expect(createdProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(createdProj.org).to.equal(org.id);
      chai.expect(createdProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(createdProj.createdBy).to.equal(adminUser.username);
      chai.expect(createdProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(createdProj.createdOn).to.not.equal(null);
      chai.expect(createdProj.updatedOn).to.not.equal(null);
      chai.expect(createdProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(createdProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
    done();
  });
}

/**
 * @description Verifies PUT /api/orgs/:orgid/projects/:projectid creates or
 * replaces a project.
 */
function putProject(done) {
  const projData = testData.projects[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PUT',
    body: JSON.stringify(projData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const replacedProj = JSON.parse(body);

    // Verify project created/replaced properly
    chai.expect(replacedProj.id).to.equal(projData.id);
    chai.expect(replacedProj.name).to.equal(projData.name);
    chai.expect(replacedProj.custom).to.deep.equal(projData.custom || {});
    chai.expect(replacedProj.permissions[adminUser.username]).to.equal('admin');
    chai.expect(replacedProj.org).to.equal(org.id);
    chai.expect(replacedProj.visibility).to.equal(projData.visibility || 'private');

    // Verify additional properties
    chai.expect(replacedProj.createdBy).to.equal(adminUser.username);
    chai.expect(replacedProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(replacedProj.createdOn).to.not.equal(null);
    chai.expect(replacedProj.updatedOn).to.not.equal(null);
    chai.expect(replacedProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(replacedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}

/**
 * @description Verifies PUT /api/orgs/:orgid/projects creates or replaces
 * multiple projects.
 */
function putProjects(done) {
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PUT',
    body: JSON.stringify(projData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const replacedProjects = JSON.parse(body);
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
      chai.expect(replacedProj.permissions[adminUser.username]).to.equal('admin');
      chai.expect(replacedProj.org).to.equal(org.id);
      chai.expect(replacedProj.visibility).to.equal(projDataObject.visibility || 'private');

      // Verify additional properties
      chai.expect(replacedProj.createdBy).to.equal(adminUser.username);
      chai.expect(replacedProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(replacedProj.createdOn).to.not.equal(null);
      chai.expect(replacedProj.updatedOn).to.not.equal(null);
      chai.expect(replacedProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(replacedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
    done();
  });
}

/**
 * @description Verifies GET /api/orgs/:orgid/projects/:projectid finds a
 * project.
 */
function getProject(done) {
  const projData = testData.projects[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projData.id}`,
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
    const foundProj = JSON.parse(body);

    // Verify project created properly
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
    chai.expect(foundProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}


/**
 * @description Verifies GET /api/orgs/:orgid/projects finds multiple
 * projects.
 */
function getProjects(done) {
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  const projIDs = projData.map(p => p.id).join(',');
  request({
    url: `${test.url}/api/orgs/${org.id}/projects?ids=${projIDs}`,
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
    const foundProjects = JSON.parse(body);
    chai.expect(foundProjects.length).to.equal(projData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify project created properly
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
      chai.expect(foundProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
    done();
  });
}

/**
 * @description Verifies GET /api/orgs/:orgid/projects finds all projects in
 * an org when no body or query parameters are provided.
 */
function getAllProjectsOnOrg(done) {
  const projData = [
    testData.projects[0],
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects`,
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
    const foundProjects = JSON.parse(body);
    chai.expect(foundProjects.length).to.equal(projData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify project created properly
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
      chai.expect(foundProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
    done();
  });
}

/**
 * @description Verifies GET /api/projects finds all projects a user has access
 * to.
 */
function getAllProjects(done) {
  const projData = [
    testData.projects[0],
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  request({
    url: `${test.url}/api/projects`,
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
    const foundProjects = JSON.parse(body);
    chai.expect(foundProjects.length).to.equal(projData.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const foundProj = jmi2Projects[projDataObject.id];

      // Verify project created properly
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
      chai.expect(foundProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(foundProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
    done();
  });
}

/**
 * @description Verifies PATCH /api/orgs/:orgid/projects/:projectid updates a
 * project.
 */
function patchProject(done) {
  const projData = testData.projects[0];
  const updateObj = {
    id: projData.id,
    name: 'Updated Name'
  };
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projData.id}`,
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
    const updatedProj = JSON.parse(body);

    // Verify project updated properly
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
    chai.expect(updatedProj.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(updatedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');
    done();
  });
}

/**
 * @description Verifies PATCH /api/orgs/:orgid/projects updates multiple
 * projects.
 */
function patchProjects(done) {
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  // Update each project name
  const updateObj = projData.map((p) => ({
    id: p.id,
    name: 'Updated Name'
  }));
  request({
    url: `${test.url}/api/orgs/${org.id}/projects`,
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
    const updatedProjects = JSON.parse(body);
    chai.expect(updatedProjects.length).to.equal(projData.length);

    // Convert updatedProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, updatedProjects, 'id');
    // Loop through each project data object
    projData.forEach((projDataObject) => {
      const updatedProj = jmi2Projects[projDataObject.id];

      // Verify project updated properly
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
      chai.expect(updatedProj.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(updatedProj).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');
    });
    done();
  });
}

/**
 * @description Verifies DELETE /api/orgs/:orgid/projects/:projectid deletes a
 * project.
 */
function deleteProject(done) {
  const projData = testData.projects[0];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects/${projData.id}`,
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
    const deletedID = JSON.parse(body);

    // Verify correct project deleted
    chai.expect(deletedID).to.equal(projData.id);
    done();
  });
}

/**
 * @description Verifies DELETE /api/orgs/:orgid/projects deletes multiple
 * projects.
 */
function deleteProjects(done) {
  const projData = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];
  request({
    url: `${test.url}/api/orgs/${org.id}/projects`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE',
    body: JSON.stringify(projData.map(p => p.id))
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedIDs = JSON.parse(body);

    // Verify correct project deleted
    chai.expect(deletedIDs).to.have.members(projData.map(p => p.id));
    done();
  });
}
