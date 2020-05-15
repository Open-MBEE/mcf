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
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData.org = 'org';

    // Change id to be too short.
    projData._id = '01:0';
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith('Project'
      + ` validation failed: _id: Project ID length [${utils.parseID(projData._id).pop().length}]`
      + ' must not be less than 2 characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with an id that is too long.
 */
async function idTooLong() {
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData.org = 'org';

    // Change id to be too long.
    projData._id = '012345678901234567890123456789012345:01234567890123456789'
      + '01234567890123456789012123';
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith('Project validation'
      + ` failed: _id: Project ID length [${projData._id.length - validators.org.idLength - 1}]`
      + ` must not be more than ${validators.project.idLength - validators.org.idLength - 1}`
      + ' characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with no id.
 */
async function idNotProvided() {
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData.org = 'org';
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith('Project'
      + ' validation failed: _id: Path `_id` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
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
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData.org = 'org';

    // Change id to be invalid
    projData._id = '!!!!!';
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith('Project'
      + ` validation failed: _id: Invalid project ID [${projData._id}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with no org.
 */
async function orgNotProvided() {
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData._id = `org:${projData.id}`;
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith('Project'
      + ' validation failed: org: Path `org` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with an invalid org.
 */
async function orgInvalid() {
  if (customValidators.hasOwnProperty('org_id') || customValidators.hasOwnProperty('id')) {
    M.log.verbose('Skipping valid project org test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData._id = `org:${projData.id}`;
    projData.org = '!!';
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith(
      `Project validation failed: org: ${projData.org} is not a valid org ID.`
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with no name.
 */
async function nameNotProvided() {
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData._id = `org:${projData.id}`;
    projData.org = 'org';

    // Delete name and id key
    delete projData.name;
    delete projData.id;

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith('Project'
      + ' validation failed: name: Path `name` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with an invalid permissions object.
 */
async function permissionsInvalid() {
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData._id = `org:${projData.id}`;
    projData.org = 'org';
    delete projData.id;

    // Set invalid permissions
    projData.permissions = {
      invalid: 'permissions'
    };

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith(
      'Project validation failed: permissions: The project permissions object '
      + 'is not properly formatted.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a project with an invalid visibility.
 */
async function visibilityInvalid() {
  try {
    const projData = Object.assign({}, testData.projects[0]);
    projData._id = `org:${projData.id}`;
    projData.org = 'org';
    delete projData.id;

    // Set invalid visibility
    projData.visibility = 'public';

    // Expect insertMany() to fail with specific error message
    await Project.insertMany(projData).should.eventually.be.rejectedWith(
      `Project validation failed: visibility: \`${projData.visibility}\` is not`
      + ' a valid enum value for path `visibility`.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
