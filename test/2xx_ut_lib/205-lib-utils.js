/**
 * Classification: UNCLASSIFIED
 *
 * @module test.205-lib-utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file tests the utility functions.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const utils = M.require('lib.utils');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should check that a string is a string and succeed', stringIsString);
  it('should check that a number is a string and fail', numberIsString);
  it('should check that an object is an object and succeed', objectIsObject);
  it('should check that the key project.id exists and succeed', projectIDExists);
  it('should check that the key project.user exists and fail', projectUserExists);
  it('should check that multiple keys exists and succeed', multipleExist);
  it('should check that a user is an admin which they are', userIsAdmin);
  it('should check that a user is an admin which they are not', userIsNotAdmin);
  it('should create a valid uid', validUID);
  it('should try to create a uid from invalid parameters and fail', invalidUID);
  it('should parse a valid uid', parseValidUID);
  it('should try to parse an invalid uid and fail', parseInvalidUID);
  it('should parse a valid uid and get the second element', parseValidUIDSecondElement);
  it('should title-case a valid word', validTitleCase);
  it('should NOT title-case an invalid word', invalidTitleCase);
}); // END: describe()

/* --------------------( Test Data )-------------------- */
const sampleObj = {
  project: {
    id: 'myID',
    name: 'The Name',
    org: {
      id: 'myOrgID'
    }
  },
  type: 'Element'
};

/* --------------------( Tests )-------------------- */
/**
 * @description Test assertType() correctly checks for valid type.
 * Note: Possible types: string, object, number, undefined, boolean, symbol
 */
function stringIsString(done) {
  try {
    // Check content of array is of type string.
    utils.assertType(['hello', 'goodbye'], 'string');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  }
  // Checks for correct type and returns a boolean
  chai.expect(utils.checkType(['hello', 'goodbye'], 'string')).to.equal(true);
  done();
}

/**
 * @description Test assertType() correctly checks for WRONG type within an array.
 * Note: Possible types: string, object, number, undefined, boolean, symbol
 */
function numberIsString(done) {
  try {
    // Check if array content are of string type
    utils.assertType([1, 2], 'string');
    // Check for false, number do not equal string
    chai.expect(true).to.equal(false);
    done();
  }
  catch (error) {
    chai.expect(error.message).to.equal('Bad Request');
  }
  // Checks for correct type and returns a boolean
  chai.expect(utils.checkType([1, 2], 'string')).to.equal(false);
  done();
}

/**
 * @description Checks that an object is an object.
 */
function objectIsObject(done) {
  try {
    utils.assertType([{ hello: 'string' }], 'object');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  }
  // Checks for correct type and returns a boolean
  chai.expect(utils.checkType([{ hello: 'string' }], 'object')).to.equal(true);
  done();
}

/**
 * @description Checks that the key project.id exists.
 */
function projectIDExists(done) {
  try {
    utils.assertExists(['project.id'], sampleObj);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
  // Checks for correct key and returns true
  chai.expect(utils.checkExists(['project.id'], sampleObj)).to.equal(true);
  done();
}

/**
 * @description Checks that the key project.user exists. Errors if not exist
 */
function projectUserExists(done) {
  try {
    // Check if key 'project.user' exist in sampleObj
    utils.assertExists(['project.user'], sampleObj);
    chai.expect(true).to.equal(false);
  }
  catch (error) {
    chai.expect(error.message).to.equal('Bad Request');
  }
  // Checks for INCORRECT key and returns false
  chai.expect(utils.checkExists(['project.user'], sampleObj)).to.equal(false);
  done();
}

/**
 * @description Checks that all keys within an array exist else error.
 */
function multipleExist(done) {
  try {
    utils.assertExists(['project.id', 'project.name', 'project.org.id', 'type'], sampleObj);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
  chai.expect(utils.checkExists(['project.name', 'project.org.id'], sampleObj)).to.equal(true);
  done();
}

/**
 * @description Check that a user is an admin and succeed.
 */
function userIsAdmin(done) {
  const user = { name: 'Sample Name', admin: true };
  try {
    utils.assertAdmin(user);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
  chai.expect(user.admin).to.equal(true);
  done();
}

/**
 * @description Check that a user is an admin and fails.
 */
function userIsNotAdmin(done) {
  const user = { name: 'Sample User', admin: false };
  try {
    utils.assertAdmin(user);
    chai.expect(true).to.equal(false);
  }
  catch (error) {
    chai.expect(error.message).to.equal('Unauthorized');
  }
  chai.expect(user.admin).to.equal(false);
  done();
}

/**
 * @description Creates a uid from valid parameters
 */
function validUID(done) {
  try {
    const uid = utils.createID('org', 'project', 'element');
    chai.expect(uid).to.equal('org:project:element');
    done();
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  }
}

/**
 * @description Creates a uid from invalid parameters
 */
function invalidUID(done) {
  try {
    utils.createID('org', 'project', 9);
    chai.expect(true).to.equal(false);
    done();
  }
  catch (error) {
    chai.expect(error.message).to.equal('Bad Request');
    done();
  }
}

/**
 * @description Parse a valid uid. Checks array element exist.
 */
function parseValidUID(done) {
  try {
    const uid = utils.parseID('org:project:element');
    chai.expect(uid).to.include('org');
    chai.expect(uid).to.include('project');
    chai.expect(uid).to.include('element');
    done();
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  }
}

/**
 * @description Parse an invalid uid. Expected error.
 */
function parseInvalidUID(done) {
  try {
    utils.parseID('not a valid uid');
    chai.assert(true === false);
    done();
  }
  catch (error) {
    chai.expect(error.message).to.equal('Bad Request');
    done();
  }
}

/**
 * @description Parse a valid uid and get the 2nd element.
 */
function parseValidUIDSecondElement(done) {
  try {
    const project = utils.parseID('org:project:element')[2];
    chai.expect(project).to.equal('element');
    done();
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  }
}

/**
 * @description Test a valid word is title-cased.
 */
function validTitleCase(done) {
  // Initialize valid word
  const word = 'heLLo156';

  // Title-Case the word
  const titleCased = utils.toTitleCase(word);

  // Expect word to be title-cased
  chai.expect(titleCased).to.equal('Hello156');
  done();
}

/**
 * @description Tests an invalid word is NOT title-cased
 */
function invalidTitleCase(done) {
  // Initialize invalid word
  const word = '123 Goodbye';

  // Title-Case the word
  const titleCased = utils.toTitleCase(word);

  // Expect the word to NOT have changed
  chai.expect(titleCased).to.equal(word);
  done();
}
