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
  it('should create a valid uid', validUID);
  it('should try to create a uid from invalid parameters and fail', invalidUID);
  it('should parse a valid uid', parseValidUID);
  it('should try to parse an invalid uid and fail', parseInvalidUID);
  it('should parse a valid uid and get the second element', parseValidUIDSecondElement);
  it('should title-case a valid word', validTitleCase);
  it('should NOT title-case an invalid word', invalidTitleCase);
});

/* --------------------( Tests )-------------------- */
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
