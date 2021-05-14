/**
 * @classification UNCLASSIFIED
 *
 * @module test.205-lib-utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description This file tests the utility functions.
 */

// NPM modules
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
  it('should parse a valid uid and get the second element', parseValidUIDSecondElement);
  it('should title-case a valid word', validTitleCase);
  it('should NOT title-case an invalid word', invalidTitleCase);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a uid from valid parameters.
 */
async function validUID() {
  try {
    const uid = utils.createID('org', 'project', 'branch', 'element');
    chai.expect(uid).to.equal('org:project:branch:element');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Creates a uid from invalid parameters.
 */
async function invalidUID() {
  try {
    utils.createID('org', 'project', 'master', 9);
    chai.expect(true).to.equal(false);
  }
  catch (error) {
    chai.expect(error.message).to.equal('Argument is not a string.');
  }
}

/**
 * @description Parse a valid uid. Checks array element exist.
 */
async function parseValidUID() {
  try {
    const uid = utils.parseID('org:project:element');
    chai.expect(uid).to.include('org');
    chai.expect(uid).to.include('project');
    chai.expect(uid).to.include('element');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Parse a valid uid and get the 2nd element.
 */
async function parseValidUIDSecondElement() {
  try {
    const project = utils.parseID('org:project:element')[2];
    chai.expect(project).to.equal('element');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Test a valid word is title-cased.
 */
async function validTitleCase() {
  // Initialize valid word
  const word = 'heLLo156';

  // Title-Case the word
  const titleCased = utils.toTitleCase(word);

  // Expect word to be title-cased
  chai.expect(titleCased).to.equal('Hello156');
}

/**
 * @description Tests an invalid word is NOT title-cased.
 */
async function invalidTitleCase() {
  // Initialize invalid word
  const word = '123 Goodbye';

  // Title-Case the word
  const titleCased = utils.toTitleCase(word);

  // Expect the word to NOT have changed
  chai.expect(titleCased).to.equal(word);
}
