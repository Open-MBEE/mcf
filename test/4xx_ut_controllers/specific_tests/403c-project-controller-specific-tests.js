/**
 * @classification UNCLASSIFIED
 *
 * @module test.403c-project-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description These tests test for specific use cases within the project
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const OrgController = M.require('controllers.organization-controller');
const ProjectController = M.require('controllers.project-controller');
const Project = M.require('models.project');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let projects = null;


/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create admin and create organization.
   */
  before(async () => {
    try {
      // Connect db
      await db.connect();
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create a global organization
      org = await testUtils.createTestOrg(adminUser);

      // Create projects for the tests to utilize
      projects = await ProjectController.create(adminUser, org._id, testData.projects);
      // Sort the projects; they will be returned out of order if custom id validators are used
      projects = projects.sort((a, b) => {
        if (Number(a.name.slice(-2)) > Number(b.name.slice(-2))) return 1;
        else return -1;
      });
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove admin and organization.
   */
  after(async () => {
    try {
      // Removing the organization created
      await testUtils.removeTestOrg(adminUser);
      // Remove the admin user
      await testUtils.removeTestAdmin();
      await db.disconnect();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  it('should find an \'internal\' project if a user is not part of the project,'
    + ' but is a member of the org', findInternalProject);
  it('should populate find results', optionPopulateFind);
  it('should include archived projects in the find results', optionIncludeArchivedFind);
  it('should only return the specified fields', optionFieldsFind);
  it('should limit the number of search results', optionLimitFind);
  it('should skip over find results', optionSkipFind);
  it('should sort find results', optionSortFind);
  it('should find a project with a specific name', optionNameFind);
  it('should find projects with a certain level of visibility', optionVisibilityFind);
  it('should find a project created by a specific user', optionCreatedByFind);
  it('should find a project last modified by a specific user', optionLastModifiedByFind);
  it('should only find archived projects', optionArchivedFind);
  it('should find a project archived by a specific user', optionArchivedByFind);
  it('should find a project based on its custom data', optionCustomFind);
  // ------------- Create -------------
  it('should populate the return object from create', optionPopulateCreate);
  it('should only return specified fields from create', optionFieldsCreate);
  // ------------- Update -------------
  it('should populate the return object from update', optionPopulateUpdate);
  it('should only return specified fields from update', optionFieldsUpdate);
  // ------------- Replace ------------
  it('should populate the return object from createOrReplace', optionPopulateReplace);
  it('should only return specified fields from createOrReplace', optionFieldsReplace);
  // ------------- Remove -------------
});

/* --------------------( Tests )-------------------- */

/**
 * @description Verifies that a user with no permissions on a project can still
 * retrieve it if the project visibility is internal and the user has at least
 * read permissions on the organization.
 */
async function findInternalProject() {
  try {
    // Create the non-admin user
    const user = await testUtils.createNonAdminUser();
    const updateObj = { id: org._id, permissions: {} };
    updateObj.permissions[user._id] = 'read';
    // Add user to organization
    await OrgController.update(adminUser, updateObj);
    // Update project visibility to internal
    const projUpdate = { id: utils.parseID(projects[1]._id).pop(), visibility: 'internal' };
    await ProjectController.update(adminUser, org._id, projUpdate);

    // Verify the user can find the internal project
    await ProjectController.find(user, org._id, utils.parseID(projects[1]._id).pop());

    // Cleanup test: delete non-admin user and reset project visibility
    await testUtils.removeNonAdminUser();
    projUpdate.visibility = 'private';
    await ProjectController.update(adminUser, org._id, projUpdate);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can be populated.
 */
async function optionPopulateFind() {
  try {
    // Select a project to test
    const project = projects[1];

    // Get populate options, without archivedBy because this project isn't archived
    let fields = Project.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Perform a find on the project
    const foundProjects = await ProjectController.find(adminUser, org._id,
      utils.parseID(project._id).pop(), options);
    // There should be one project
    chai.expect(foundProjects.length).to.equal(1);
    const foundProject = foundProjects[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in foundProject).to.equal(true);
      if (Array.isArray(foundProject[field])) {
        foundProject[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (foundProject[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof foundProject[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in foundProject[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can include archived results.
 */
async function optionIncludeArchivedFind() {
  try {
    // Select projects to test
    const project = projects[1];
    const projectID = utils.parseID(project._id).pop();
    const archivedProject = projects[2];
    const archivedID = utils.parseID(archivedProject._id).pop();

    // Create find option
    const options = { includeArchived: true };

    // Archive the second project
    const archiveUpdate = {
      id: archivedID,
      archived: true
    };
    await ProjectController.update(adminUser, org._id, archiveUpdate);

    // Perform a find on the projects
    const foundProject = await ProjectController.find(adminUser, org._id,
      [projectID, archivedID]);
    // There should be one project
    chai.expect(foundProject.length).to.equal(1);
    chai.expect(foundProject[0]._id).to.equal(project._id);

    // Perform a find on the projects
    const foundProjects = await ProjectController.find(adminUser, org._id,
      [projectID, archivedID], options);
    // There should be two projects
    chai.expect(foundProjects.length).to.equal(2);
    chai.expect(foundProjects.map(p => p._id)).to.have.members([project._id, archivedProject._id]);

    // Clean up for the following tests
    archiveUpdate.archived = false;
    await ProjectController.update(adminUser, org._id, archiveUpdate);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results only return specified fields.
 */
async function optionFieldsFind() {
  try {
    // Select a project to test
    const project = projects[1];
    const projectID = utils.parseID(project._id).pop();

    // Create fields option
    const fields = ['name', 'permissions'];
    const options = { fields: fields };

    // Perform a find on the project
    const foundProjects = await ProjectController.find(adminUser, org._id,
      projectID, options);
    // There should be one project
    chai.expect(foundProjects.length).to.equal(1);
    const foundProject = foundProjects[0];

    const keys = Object.keys(foundProject);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the number of find results can be limited.
 */
async function optionLimitFind() {
  try {
    // Create limit option
    const options = { limit: 3 };
    const numProjects = projects.length;

    // Find all the projects just to check
    const allProjects = await ProjectController.find(adminUser, org._id);
    chai.expect(allProjects.length).to.equal(numProjects);

    // Find all the projects with the limit option
    const limitProjects = await ProjectController.find(adminUser, org._id, options);
    // There should only be as many projects as specified in the limit option
    chai.expect(limitProjects.length).to.equal(options.limit);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that find results can be skipped over.
 */
async function optionSkipFind() {
  try {
    // Create skip option
    const options = { skip: 3 };
    const numProjects = projects.length;

    // Find all the projects just to check
    const allProjects = await ProjectController.find(adminUser, org._id);
    chai.expect(allProjects.length).to.equal(numProjects);

    // Find all the projects with the skip option
    const skipProjects = await ProjectController.find(adminUser, org._id, options);
    chai.expect(skipProjects.length).to.equal(numProjects - options.skip);
    // Check that the first 3 projects were skipped
    chai.expect(skipProjects[0]._id).to.equal(allProjects[3]._id);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can be sorted.
 */
async function optionSortFind() {
  try {
    // Update the test project objects
    const testProjects = [
      {
        id: utils.parseID(projects[0]._id).pop(),
        name: 'b'
      },
      {
        id: utils.parseID(projects[1]._id).pop(),
        name: 'c'
      },
      {
        id: utils.parseID(projects[2]._id).pop(),
        name: 'a'
      }];
    // Create sort options
    const sortOption = { sort: 'name' };
    const sortOptionReverse = { sort: '-name' };

    // Update the projects
    const updatedProjects = await ProjectController.update(adminUser, org._id, testProjects);
    // Expect updatedProjects array to contain 3 projects
    chai.expect(updatedProjects.length).to.equal(3);

    const foundProjects = await ProjectController.find(adminUser, org._id,
      testProjects.map((p) => p.id), sortOption);
    // Expect to find 3 projects
    chai.expect(foundProjects.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundProjects[0].name).to.equal('a');
    chai.expect(foundProjects[0]._id).to.equal(projects[2]._id);
    chai.expect(foundProjects[1].name).to.equal('b');
    chai.expect(foundProjects[1]._id).to.equal(projects[0]._id);
    chai.expect(foundProjects[2].name).to.equal('c');
    chai.expect(foundProjects[2]._id).to.equal(projects[1]._id);

    // Find the projects and return them sorted in reverse
    const reverseProjects = await ProjectController.find(adminUser, org._id,
      testProjects.map((p) => p.id), sortOptionReverse);

    // Expect to find 3 projects
    chai.expect(reverseProjects.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(reverseProjects[0].name).to.equal('c');
    chai.expect(reverseProjects[0]._id).to.equal(projects[1]._id);
    chai.expect(reverseProjects[1].name).to.equal('b');
    chai.expect(reverseProjects[1]._id).to.equal(projects[0]._id);
    chai.expect(reverseProjects[2].name).to.equal('a');
    chai.expect(reverseProjects[2]._id).to.equal(projects[2]._id);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that projects with a specific name can be found.
 */
async function optionNameFind() {
  try {
    // Create name option
    const options = { name: 'Project 04' };

    // Find the project
    const foundProjects = await ProjectController.find(adminUser, org._id, options);

    // There should be one project found
    chai.expect(foundProjects.length).to.equal(1);
    const foundProject = foundProjects[0];

    // Validate that the correct project has been found
    chai.expect(foundProject.name).to.equal('Project 04');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that projects with a specific visibility can be found.
 */
async function optionVisibilityFind() {
  try {
    // Update the visibility of a project
    const update = {
      id: utils.parseID(projects[0]._id).pop(),
      visibility: 'internal'
    };
    await ProjectController.update(adminUser, org._id, update);

    // Create visibility option
    const options = { visibility: 'internal' };

    // Find the project
    const foundProjects = await ProjectController.find(adminUser, org._id, options);

    // There should be one project found
    chai.expect(foundProjects.length).to.equal(1);
    const foundProject = foundProjects[0];

    // Validate that the correct project has been found
    chai.expect(foundProject.visibility).to.equal('internal');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that projects created by a specific user can be found.
 */
async function optionCreatedByFind() {
  try {
    // Create createdBy option
    const options = { createdBy: 'test_admin' };

    // Find the project
    const foundProjects = await ProjectController.find(adminUser, org._id, options);

    // Validate that each project was created by the test admin
    foundProjects.forEach((project) => {
      chai.expect(project.createdBy).to.equal('test_admin');
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that projects last modified by a specific user can be found.
 */
async function optionLastModifiedByFind() {
  try {
    // Create lastModifiedBy option
    const options = { lastModifiedBy: 'test_admin' };

    // Find the project
    const foundProjects = await ProjectController.find(adminUser, org._id, options);

    // Validate that each project was created by the test admin
    foundProjects.forEach((project) => {
      chai.expect(project.lastModifiedBy).to.equal('test_admin');
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that only archived projects will be returned with the archived option.
 */
async function optionArchivedFind() {
  try {
    // Select projects to test
    const project = projects[1];
    const projectID = utils.parseID(project._id).pop();
    const archivedProject = projects[2];
    const archivedID = utils.parseID(archivedProject._id).pop();

    // Create find option
    const options = { archived: true };

    // Archive the second project
    const archiveUpdate = {
      id: archivedID,
      archived: true
    };
    await ProjectController.update(adminUser, org._id, archiveUpdate);

    // Perform a find on the projects
    const foundProjects = await ProjectController.find(adminUser, org._id,
      [projectID, archivedID]);
    // There should be one unarchived project
    chai.expect(foundProjects.length).to.equal(1);
    chai.expect(foundProjects[0]._id).to.equal(project._id);
    chai.expect(foundProjects[0].archived).to.equal(false);

    // Perform a find on the projects
    const archivedProjects = await ProjectController.find(adminUser, org._id,
      [projectID, archivedID], options);
    // There should be one archived project
    chai.expect(archivedProjects.length).to.equal(1);
    chai.expect(archivedProjects[0]._id).to.equal(archivedProject._id);
    chai.expect(archivedProjects[0].archived).to.equal(true);

    // Clean up for the following tests
    archiveUpdate.archived = false;
    await ProjectController.update(adminUser, org._id, archiveUpdate);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that projects archived by a specific user can be found.
 */
async function optionArchivedByFind() {
  try {
    // Archive a project
    const update = {
      id: utils.parseID(projects[0]._id).pop(),
      archived: true
    };
    await ProjectController.update(adminUser, org._id, update);

    // Create archivedBy option
    const options = { archivedBy: 'test_admin', includeArchived: true };

    // Find the project
    const foundProjects = await ProjectController.find(adminUser, org._id, options);

    // Validate that each project was archived by the test admin
    foundProjects.forEach((project) => {
      chai.expect(project.archivedBy).to.equal('test_admin');
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that projects with specific custom data can be found.
 */
async function optionCustomFind() {
  try {
    // Create custom option
    const options = { 'custom.location': 'Location 02' };

    // Find the project
    const foundProjects = await ProjectController.find(adminUser, org._id, options);
    // There should be one project found
    chai.expect(foundProjects.length).to.equal(1);
    const foundProject = foundProjects[0];

    // Validate the found project has the custom data
    chai.expect(foundProject.custom).to.deep.equal({ location: 'Location 02' });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the return object from create() can be populated.
 */
async function optionPopulateCreate() {
  try {
    // Select a project to test
    const projectID = utils.parseID(projects[1]._id).pop();
    const projectObj = {
      id: projectID,
      name: 'Project01'
    };

    // Delete the project
    await ProjectController.remove(adminUser, org._id, projectID);

    // Get populate options, without archivedBy because this project isn't archived
    let fields = Project.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Create the project
    const createdProjects = await ProjectController.create(adminUser, org._id, projectObj, options);
    // There should be one project
    chai.expect(createdProjects.length).to.equal(1);
    const createdProject = createdProjects[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in createdProject).to.equal(true);
      if (Array.isArray(createdProject[field])) {
        createdProject[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (createdProject[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof createdProject[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in createdProject[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the create results only return specified fields.
 */
async function optionFieldsCreate() {
  try {
    // Select a project to test
    const projectID = utils.parseID(projects[1]._id).pop();
    const projectObj = {
      id: projectID,
      name: 'Project01'
    };

    // Delete the project
    await ProjectController.remove(adminUser, org._id, projectID);

    // Create fields option
    const fields = ['name', 'visibility'];
    const options = { fields: fields };

    // Create the project
    const createdProjects = await ProjectController.create(adminUser, org._id,
      projectObj, options);
    // There should be one project
    chai.expect(createdProjects.length).to.equal(1);
    const foundProject = createdProjects[0];

    const keys = Object.keys(foundProject);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the return object from update() can be populated.
 */
async function optionPopulateUpdate() {
  try {
    // Select a project to test
    const projectID = utils.parseID(projects[1]._id).pop();
    const projectObj = {
      id: projectID,
      name: 'Project01 populate update'
    };

    // Get populate options, without archivedBy because this project isn't archived
    let fields = Project.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Update the project
    const updatedProjects = await ProjectController.update(adminUser, org._id,
      projectObj, options);
    // There should be one project
    chai.expect(updatedProjects.length).to.equal(1);
    const updatedProject = updatedProjects[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in updatedProject).to.equal(true);
      if (Array.isArray(updatedProject[field])) {
        updatedProject[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (updatedProject[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof updatedProject[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in updatedProject[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the update results only return specified fields.
 */
async function optionFieldsUpdate() {
  try {
    // Select a project to test
    const projectID = utils.parseID(projects[1]._id).pop();
    const projectObj = {
      id: projectID,
      name: 'Project01 fields update'
    };

    // Create fields option
    const fields = ['name', 'visibility'];
    const options = { fields: fields };

    // Update the project
    const updatedProjects = await ProjectController.update(adminUser, org._id,
      projectObj, options);
    // There should be one project
    chai.expect(updatedProjects.length).to.equal(1);
    const foundProject = updatedProjects[0];

    const keys = Object.keys(foundProject);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the return object from create() can be populated.
 */
async function optionPopulateReplace() {
  try {
    // Select a project to test
    const projectID = utils.parseID(projects[1]._id).pop();
    const projectObj = {
      id: projectID,
      name: 'Project01'
    };

    // Get populate options, without archivedBy because this project isn't archived
    let fields = Project.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Replace the project
    const createdProjects = await ProjectController.createOrReplace(adminUser, org._id, projectObj,
      options);
    // There should be one project
    chai.expect(createdProjects.length).to.equal(1);
    const createdProject = createdProjects[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in createdProject).to.equal(true);
      if (Array.isArray(createdProject[field])) {
        createdProject[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (createdProject[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof createdProject[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in createdProject[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the create results only return specified fields.
 */
async function optionFieldsReplace() {
  try {
    // Select a project to test
    const projectID = utils.parseID(projects[1]._id).pop();
    const projectObj = {
      id: projectID,
      name: 'Project01'
    };

    // Create fields option
    const fields = ['name', 'visibility'];
    const options = { fields: fields };

    // Replace the project
    const createdProjects = await ProjectController.createOrReplace(adminUser, org._id,
      projectObj, options);
    // There should be one project
    chai.expect(createdProjects.length).to.equal(1);
    const foundProject = createdProjects[0];

    const keys = Object.keys(foundProject);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}
