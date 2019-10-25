/**
 * @classification UNCLASSIFIED
 *
 * @module test.303b-project-model-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests for expected errors within the project model.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Project = M.require('models.project');
const db = M.require('lib.db');
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const customValidators = M.config.validators || {};

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: runs before all tests. Open database connection.
   */
  before((done) => {
    db.connect()
    .then(() => done())
    .catch((error) => {
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /**
   * After: runs after all tests. Close database connection.
   */
  after((done) => {
    db.disconnect()
    .then(() => done())
    .catch((error) => {
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  it('should reject when a project ID is too short', idTooShort);
  it('should reject when a project ID is too long', idTooLong);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject an invalid project ID', invalidID);
  it('should reject if no org is provided', orgNotProvided);
  it('should reject if the org is invalid', orgInvalid);
  it('should reject if no name is provided', nameNotProvided);
  it('should reject if the permissions object in invalid', permissionsInvalid);
  it('should reject if the visibility is invalid', visibilityInvalid);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create a project with an id that is too short.
 */
async function idTooShort() {
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Change id to be too short.
  projData._id = '01:0';

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith('Project validation failed: _id: '
    + `Project ID length [${utils.parseID(projData._id).pop().length}] must not`
    + ' be less than 2 characters.');
}

/**
 * @description Attempts to create a project with an id that is too long.
 */
async function idTooLong() {
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Change id to be too long.
  projData._id = '012345678901234567890123456789012345:01234567890123456789'
    + '01234567890123456';

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith('Project validation failed: _id: '
    + `Project ID length [${projData._id.length - validators.org.idLength - 1}]`
    + ` must not be more than ${validators.project.idLength - validators.org.idLength - 1}`
    + ' characters.');
}

/**
 * @description Attempts to create a project with no id.
 */
async function idNotProvided() {
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith('Project validation failed: _id: '
    + 'Path `_id` is required.');
}

/**
 * @description Attempts to create a project with an invalid id.
 */
async function invalidID() {
  if (customValidators.hasOwnProperty('project_id') || customValidators.hasOwnProperty('id')) {
    M.log.verbose('Skipping valid project id test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Change id to be invalid
  projData._id = 'INVALID_ID';

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith('Project validation failed: '
    + `_id: Invalid project ID [${projData._id}].`);
}

/**
 * @description Attempts to create a project with no org.
 */
async function orgNotProvided() {
  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith('Project validation failed: org: '
    + 'Path `org` is required.');
}

/**
 * @description Attempts to create a project with an invalid org.
 */
async function orgInvalid() {
  if (customValidators.hasOwnProperty('id')) {
    M.log.verbose('Skipping valid project org test due to an existing custom'
      + ' validator.');
    this.skip();
  }

  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;
  projData.org = 'INVALID';

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith(
    `Project validation failed: org: ${projData.org} is not a valid org ID.`
  );
}

/**
 * @description Attempts to create a project with no name.
 */
async function nameNotProvided() {
  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;
  projData.org = 'org';

  // Delete name key
  delete projData.name;

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  projObject.save().should.eventually.be.rejectedWith('Project validation failed: '
    + 'name: Path `name` is required.');
}

/**
 * @description Attempts to create a project with an invalid permissions object.
 */
async function permissionsInvalid() {
  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;
  projData.org = 'org';

  // Set invalid permissions
  projData.permissions = {
    invalid: 'permissions'
  };

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith(
    'Project validation failed: permissions: The project permissions object is '
    + 'not properly formatted.'
  );
}

/**
 * @description Attempts to create a project with an invalid visibility.
 */
async function visibilityInvalid() {
  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;
  projData.org = 'org';

  // Set invalid visibility
  projData.visibility = 'public';

  // Create project object
  const projObject = Project.createDocument(projData);

  // Expect save() to fail with specific error message
  await projObject.save().should.eventually.be.rejectedWith(
    `Project validation failed: visibility: \`${projData.visibility}\` is not a`
    + ' valid enum value for path `visibility`.'
  );
}
