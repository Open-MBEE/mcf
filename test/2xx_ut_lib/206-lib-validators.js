/**
 * @classification UNCLASSIFIED
 *
 * @module test.206-lib-validators
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description This file tests the validator functions.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const validators = M.require('lib.validators');
const customValidators = M.config.validators || {};

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should verify valid and invalid org ids', verifyOrgID);
  it('should verify valid and invalid project ids', verifyProjectID);
  it('should verify valid and invalid branch ids', verifyBranchID);
  it('should verify valid and invalid element ids', verifyElementID);
  it('should verify valid and invalid user usernames', verifyUserUsername);
  it('should verify valid and invalid user emails', verifyUserEmail);
  it('should verify valid and invalid user first name', verifyUserFName);
  it('should verify valid and invalid user last name', verifyUserLName);
  it('should verify valid and invalid url paths', verifyURLPath);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies valid and invalid org IDs.
 */
async function verifyOrgID() {
  // Skip this test if a custom validator is defined
  if (customValidators.org_id) this.skip();

  // Valid IDs
  chai.expect(RegExp(validators.org.id).test('org3')).to.equal(true);
  chai.expect(RegExp(validators.org.id).test('validorgid')).to.equal(true);
  chai.expect(RegExp(validators.org.id).test('3org-id')).to.equal(true);
  chai.expect(RegExp(validators.org.id).test('underscore_allowed')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.org.id).test('Org3')).to.equal(false);
  chai.expect(RegExp(validators.org.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.org.id).test('')).to.equal(false);
}

/**
 * @description Verifies valid and invalid project IDs.
 */
async function verifyProjectID() {
  // Skip this test if a custom validator is defined
  if (customValidators.project_id) this.skip();

  // Valid IDs
  chai.expect(RegExp(validators.project.id).test('someorgid:proj3')).to.equal(true);
  chai.expect(RegExp(validators.project.id).test('anotherorgid:3proj-id')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.project.id).test('Proj3')).to.equal(false);
  chai.expect(RegExp(validators.project.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.project.id).test('')).to.equal(false);
}

/**
 * @description Verifies valid and invalid branch IDs.
 */
async function verifyBranchID() {
  // Skip this test if a custom validator is defined
  if (customValidators.branch_id) this.skip();

  // Valid IDs
  chai.expect(RegExp(validators.branch.id).test('org:proj:branch1')).to.equal(true);
  chai.expect(RegExp(validators.branch.id).test('org:proj:3branch-id')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.project.id).test('Branch3')).to.equal(false);
  chai.expect(RegExp(validators.project.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.project.id).test('')).to.equal(false);
}

/**
 * @description Verifies valid and invalid element ids.
 */
async function verifyElementID() {
  // Skip this test if a custom validator is defined
  if (customValidators.element_id) this.skip();

  // Valid IDs
  chai.expect(RegExp(validators.element.id).test('org:proj:branch:elem3')).to.equal(true);
  chai.expect(RegExp(validators.element.id).test('org:proj:branch:3elem-id')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.element.id).test('Elem3')).to.equal(false);
  chai.expect(RegExp(validators.element.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.element.id).test('')).to.equal(false);
  chai.expect(RegExp(validators.element.id).test('elem3')).to.equal(false);
}

/**
 * @description Verifies valid and invalid user usernames.
 */
async function verifyUserUsername() {
  // Skip this test if a custom validator is defined
  if (customValidators.user_username) this.skip();

  // Valid usernames
  chai.expect(RegExp(validators.user.username).test('testuser')).to.equal(true);
  chai.expect(RegExp(validators.user.username).test('my_username01')).to.equal(true);

  // Invalid usernames
  chai.expect(RegExp(validators.user.username).test('123allaboutme')).to.equal(false);
  chai.expect(RegExp(validators.user.username).test('Username')).to.equal(false);
  chai.expect(RegExp(validators.user.username).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.user.username).test('_first')).to.equal(false);
  chai.expect(RegExp(validators.user.username).test('')).to.equal(false);
  chai.expect(RegExp(validators.user.username).test('space middle')).to.equal(false);
}

/**
 * @description Verifies valid and invalid user emails.
 */
async function verifyUserEmail() {
  // Skip this test if a custom validator is defined
  if (customValidators.user_email) this.skip();

  // Valid emails
  chai.expect(RegExp(validators.user.email).test('valid@test.com')).to.equal(true);
  chai.expect(RegExp(validators.user.email).test('test-email.123@test-email.com')).to.equal(true);

  // Invalid emails
  chai.expect(RegExp(validators.user.email).test('tooshortadd@test.a')).to.equal(false);
  chai.expect(RegExp(validators.user.email).test('toolongadd@test.organization')).to.equal(false);
  chai.expect(RegExp(validators.user.email).test('missingattest.com')).to.equal(false);
  chai.expect(RegExp(validators.user.email).test('special*char@test.com')).to.equal(false);
  chai.expect(RegExp(validators.user.email).test('missingdot@testcom')).to.equal(false);
  chai.expect(RegExp(validators.user.email).test('@test.com')).to.equal(false);
  chai.expect(RegExp(validators.user.email).test('missingadd@.a')).to.equal(false);
}

/**
 * @description Verifies valid and invalid user first names.
 */
async function verifyUserFName() {
  // Skip this test if a custom validator is defined
  if (customValidators.user_fname) this.skip();

  // Valid names
  chai.expect(validators.user.fname('First Last')).to.equal(true);

  // Invalid names
  chai.expect(validators.user.fname('9first')).to.equal(false);
  chai.expect(validators.user.fname('-first')).to.equal(false);
}

/**
 * @description Verifies valid and invalid user last names.
 */
async function verifyUserLName() {
  // Skip this test if a custom validator is defined
  if (customValidators.user_lname) this.skip();

  // Valid names
  chai.expect(validators.user.lname('First-Middle Last')).to.equal(true);

  // Invalid names
  chai.expect(validators.user.lname(' space first')).to.equal(false);
}

/**
 * @description Verifies valid and invalid url paths.
 */
async function verifyURLPath() {
  // Skip this test if a custom validator is defined
  if (customValidators.url_next) this.skip();

  // Valid paths
  chai.expect(RegExp(validators.url.next).test('/login')).to.equal(true);

  // Invalid paths
  chai.expect(RegExp(validators.url.next).test('login')).to.equal(false);
  chai.expect(RegExp(validators.url.next).test('//login')).to.equal(false);
}
