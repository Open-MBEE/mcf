/**
 * Classification: UNCLASSIFIED
 *
 * @module  test.303-project-model-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests the Project Model functionality. The project
 * model tests, create, find, update, and delete projects. THe tests also
 * test the max character limit on the ID field.
 */

// Node modules
const chai = require('chai');
const path = require('path');

// MBEE modules
const Org = M.require('models.organization');
const Project = M.require('models.project');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
const testData = testUtils.importTestData();
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
   * Before: runs before all tests. Creates an organization to be used
   * in tests.
   */
  before((done) => {
    db.connect()
    .then(() => {
      // Create a parent organization before creating any projects
      org = new Org({
        id: testData.orgs[0].id,
        name: testData.orgs[0].name
      });

      // Save the org via the org model
      return org.save();
    })
    .then((retOrg) => {
      // Set org
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
   * After: runs after all tests. Deletes the organization.
   */
  after((done) => {
    // Delete the org
    Org.findOneAndRemove({ id: org.id })
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });
  // creates a user adds them to the org and then deletes them to check if it worked.

  /* Execute the tests */
  it('should create a project', createProject);
  it('should find a project', findProject);
  it('should update a project', updateProject);
  it('should delete a project', deleteProject);
  it('should reject creating a project with a long ID', verifyProjectFieldMaxChar);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a project using the project model and saves it to the
 * database.
 */
function createProject(done) {
  // Create a project model object
  const newProject = new Project({
    id: utils.createID(org.id, testData.projects[0].id),
    name: testData.projects[0].name,
    org: org._id
  });
  // Save project model object to database
  newProject.save()
  .then(() => done())
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
    done();
  });
}

/**
 * @description Finds a previously created project
 */
function findProject(done) {
  // Find the project
  Project.findOne({ id: utils.createID(org.id, testData.projects[0].id) })
  .then((proj) => {
    // Ensure project data is correct
    chai.expect(proj.name).to.equal(testData.projects[0].name);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
    done();
  });
}

/**
 * @description Updates a projects name
 */
function updateProject(done) {
  // Find and update project previously created in createProject test
  Project.findOneAndUpdate({
    id: utils.createID(org.id, testData.projects[0].id) },
  { name: testData.projects[1].name })
  // Find previously updated project
  .then(() => Project.findOne({
    id: utils.createID(org.id, testData.projects[0].id)
  }))
  .then((proj) => {
    // Ensure project name was successfully updated
    chai.expect(proj.name).to.equal(testData.projects[1].name);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
    done();
  });
}

/**
 * @description Deletes the project previously created in createProject test.
 */
function deleteProject(done) {
  // Find and remove the project previously created in createProject test.
  Project.findOneAndRemove({ id: utils.createID(org.id, testData.projects[0].id) })
  .then(() => Project.find({ id: utils.createID(org.id, testData.projects[0].id) }))
  .then((projects) => {
    // Expect to find no projects
    chai.expect(projects.length).to.equal(0);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
    done();
  });
}

/**
 * @description Verifies invalid field string with over 36 characters when creating a project.
 * Expected error thrown: 'Project validation failed: id: Too many characters in username'
 */
function verifyProjectFieldMaxChar(done) {
  // Create a new model project
  const newProject = new Project({
    id: utils.createID(org.id, testData.projects[3].id),
    name: testData.projects[3].name,
    org: org._id
  });

  // Save project model object to database
  newProject.save()
  .then(() => {
    chai.assert(true === false, 'Fail, project should not have been created.');
    done();
  })
  .catch((error) => {
    // Expected error thrown: 'Project validation failed: id: Too many characters in username'
    chai.expect(error.message).to.equal('Project validation failed: id: Too many characters in username');
    done();
  });
}
