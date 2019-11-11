/**
 * @classification UNCLASSIFIED
 *
 * @module test.305b-element-model-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests for expected errors within the element model.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Element = M.require('models.element');
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
   * Before: runs before all tests. Open database connection and create test
   * element.
   */
  before(async () => {
    try {
      db.connect();
    }
    catch (error) {
      chai.expect(error.message).to.equal(null);
    }
  });

  /**
   * After: runs after all tests. Close database connection and delete test
   * element.
   */
  after(async () => {
    try {
      db.disconnect();
    }
    catch (error) {
      chai.expect(error.message).to.equal(null);
    }
  });

  /* Execute the tests */
  it('should reject when an element ID is too short', idTooShort);
  it('should reject when an element ID is too long', idTooLong);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject an invalid element ID', invalidID);
  it('should reject if no project is provided', projectNotProvided);
  it('should reject if a project is invalid', projectInvalid);
  it('should reject if no branch is provided', branchNotProvided);
  it('should reject if a branch is invalid', branchInvalid);
  it('should reject if a parent is invalid', parentInvalid);
  it('should reject if a source is invalid', sourceInvalid);
  it('should reject if a source is provided with no target', sourceWithNoTarget);
  it('should reject if a target is invalid', targetInvalid);
  it('should reject if a target is provided with no source', targetWithNoSource);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create an element with an id that is too short.
 */
async function idTooShort() {
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';

    // Change id to be too short.
    elemData._id = '01:01:01:0';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith('Element'
      + ` validation failed: _id: Element ID length [${utils.parseID(elemData._id).pop().length}]`
      + ' must not be less than 2 characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an id that is too long.
 */
async function idTooLong() {
  if (customValidators.hasOwnProperty('element_id') || customValidators.hasOwnProperty('id')
    || customValidators.hasOwnProperty('element_id_length')
    || customValidators.hasOwnProperty('id_length')) {
    M.log.verbose('Skipping valid element id test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';

    // Change id to be too long.
    elemData._id = '012345678901234567890123456789012345:01234567890123456789'
      + '0123456789012345:012345678901234567890123456789012345:0123456789012345'
      + '67890123456789012345678901234567890123456789012345678901234567890123456'
      + '789012345678901234567890123456789012345678901234567890123456789012345678'
      + '901234567890123456789012';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith('Element validation '
      + `failed: _id: Element ID length [${elemData._id.length - validators.branch.idLength - 1}]`
      + ` must not be more than ${validators.element.idLength - validators.branch.idLength - 1}`
      + ' characters.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with no id.
 */
async function idNotProvided() {
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith('Element '
      + 'validation failed: _id: Path `_id` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an invalid id.
 */
async function invalidID() {
  if (customValidators.hasOwnProperty('element_id') || customValidators.hasOwnProperty('id')) {
    M.log.verbose('Skipping valid element id test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';

    // Change id to be invalid
    elemData._id = '!!!!!!!!!!!';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith('Element '
      + `validation failed: _id: Invalid element ID [${elemData._id}].`);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with no project.
 */
async function projectNotProvided() {
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith('Element'
      + ' validation failed: project: Path `project` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an invalid project.
 */
async function projectInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('project_id')) {
    M.log.verbose('Skipping valid element project test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';

    // Set invalid project
    elemData.project = '!!';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      `Element validation failed: project: ${elemData.project} is not a valid `
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
 * @description Attempts to create an element with no branch.
 */
async function branchNotProvided() {
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.parent = 'org:proj:branch:model';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith('Element'
      + ' validation failed: branch: Path `branch` is required.');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an invalid branch.
 */
async function branchInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('branch_id')) {
    M.log.verbose('Skipping valid element branch test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.parent = 'org:proj:branch:model';

    // Set invalid branch
    elemData.branch = '!!';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      `Element validation failed: branch: ${elemData.branch} is not a valid `
      + 'branch ID.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an invalid parent.
 */
async function parentInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('element_id')) {
    M.log.verbose('Skipping valid element parent test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';

    // Set invalid parent
    elemData.parent = '!!';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      `Element validation failed: parent: ${elemData.parent} is not a valid `
      + 'parent ID.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an invalid source.
 */
async function sourceInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('element_id')) {
    M.log.verbose('Skipping valid element source test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';

    // Set invalid source
    elemData.source = '!!';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      `Element validation failed: source: ${elemData.source} is not a valid `
      + 'source ID.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with a valid source but no target.
 */
async function sourceWithNoTarget() {
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';
    elemData.source = 'org:proj:branch:model';

    // Set target to null
    elemData.target = null;
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      'Element validation failed: source: Target is required if source is '
      + 'provided.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with an invalid target.
 */
async function targetInvalid() {
  if (customValidators.hasOwnProperty('id') || customValidators.hasOwnProperty('element_id')) {
    M.log.verbose('Skipping valid element target test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';

    // Set invalid target
    elemData.target = '!!';
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      `Element validation failed: target: ${elemData.target} is not a valid `
      + 'target ID.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Attempts to create an element with a valid target but no source.
 */
async function targetWithNoSource() {
  try {
    const elemData = Object.assign({}, testData.elements[0]);
    elemData._id = `org:proj:branch:${elemData.id}`;
    elemData.project = 'org:proj';
    elemData.branch = 'org:proj:branch';
    elemData.parent = 'org:proj:branch:model';
    elemData.target = 'org:proj:branch:model';

    // Set source to null
    elemData.source = null;
    delete elemData.id;

    // Expect insertMany() to fail with specific error message
    await Element.insertMany(elemData).should.eventually.be.rejectedWith(
      'Element validation failed: target: Source is required if target is '
      + 'provided.'
    );
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
