/**
 * @classification UNCLASSIFIED
 *
 * @module test.304b-branch-model-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests for expected errors within the branch model.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Branch = M.require('models.branch');
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
  it('should reject when a branch ID is too short', idTooShort);
  it('should reject when a branch ID is too long', idTooLong);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject an invalid branch ID', invalidID);
  it('should reject if no project is provided', projectNotProvided);
  it('should reject if the project is invalid', projectInvalid);
  it('should reject if the source is invalid', sourceInvalid);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create a branch with an id that is too short.
 */
async function idTooShort() {
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData.project = 'org:proj';
    branchData.branch = 'org:proj:branch';

    // Change id to be too short.
    branchData._id = '01:01:0';
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith('Branch '
      + `validation failed: _id: Branch ID length [${utils.parseID(branchData._id).pop().length}] `
      + 'must not be less than 2 characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a branch with an id that is too long.
 */
async function idTooLong() {
  if (customValidators.hasOwnProperty('branch_id') || customValidators.hasOwnProperty('id')
    || customValidators.hasOwnProperty('branch_id_length')
    || customValidators.hasOwnProperty('id_length')) {
    M.log.verbose('Skipping valid branch id test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData.project = 'org:proj';

    // Change id to be too long.
    branchData._id = '012345678901234567890123456789012345:01234567890123456789'
      + '0123456789012345:01234567890123456789012345678901234560987890987098789';
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith('Branch validation '
      + `failed: _id: Branch ID length [${branchData._id.length - validators.project.idLength - 1}]`
      + ` must not be more than ${validators.branch.idLength - validators.project.idLength - 1}`
      + ' characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a branch with no id.
 */
async function idNotProvided() {
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData.project = 'org:proj';
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith('Branch'
      + ' validation failed: _id: Path `_id` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a branch with an invalid id.
 */
async function invalidID() {
  if (customValidators.hasOwnProperty('branch_id') || customValidators.hasOwnProperty('id')) {
    M.log.verbose('Skipping valid branch id test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData.project = 'org:proj';

    // Change id to be invalid.
    branchData._id = '!!!!!!!!';
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith('Branch'
      + ` validation failed: _id: Invalid branch ID [${branchData._id}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a branch with no project.
 */
async function projectNotProvided() {
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData._id = `org:proj:${branchData.id}`;
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith('Branch'
      + ' validation failed: project: Path `project` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a branch with an invalid project.
 */
async function projectInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('project_id')) {
    M.log.verbose('Skipping valid branch project test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData._id = `org:proj:${branchData.id}`;

    // Set invalid project
    branchData.project = '!!';
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith(
      `Branch validation failed: project: ${branchData.project} is not a valid `
      + 'project ID.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create a branch with an invalid source.
 */
async function sourceInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('branch_id')) {
    M.log.verbose('Skipping valid branch source test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const branchData = Object.assign({}, testData.branches[0]);
    branchData._id = `org:proj:${branchData.id}`;
    branchData.project = 'org:proj';

    // Set invalid source
    branchData.source = '!!!!!!!!';
    delete branchData.id;

    // Expect insertMany() to fail with specific error message
    await Branch.insertMany(branchData).should.eventually.be.rejectedWith(
      `Branch validation failed: source: ${branchData.source} is not a valid `
      + 'source ID.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
