/**
 * Classification: UNCLASSIFIED
 *
 * @module test.206-lib-validators
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file tests the validator functions.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const validators = M.require('lib.validators');

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
  it('should verify valid and invalid element ids', verifyElementID);
  it('should verify valid and invalid user usernames', verifyUserUsername);
  it('should verify valid and invalid user emails', verifyUserEmail);
  it('should verify valid and invalid user names', verifyUserName);
  it('should verify valid and invalid url paths', verifyURLPath);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies valid and invalid org IDs
 */
function verifyOrgID(done) {
  // Valid IDs
  chai.expect(RegExp(validators.org.id).test('org3')).to.equal(true);
  chai.expect(RegExp(validators.org.id).test('validorgid')).to.equal(true);
  chai.expect(RegExp(validators.org.id).test('3org-id')).to.equal(true);
  chai.expect(RegExp(validators.org.id).test('underscore_allowed')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.org.id).test('Org3')).to.equal(false);
  chai.expect(RegExp(validators.org.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.org.id).test('')).to.equal(false);
  done();
}

/**
 * @description Verifies valid and invalid project IDs
 */
function verifyProjectID(done) {
  // Valid IDs
  chai.expect(RegExp(validators.project.id).test('someorgid:proj3')).to.equal(true);
  chai.expect(RegExp(validators.project.id).test('anotherorgid:3proj-id')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.project.id).test('Proj3')).to.equal(false);
  chai.expect(RegExp(validators.project.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.project.id).test('')).to.equal(false);
  done();
}

/**
 * @description Verifies valid and invalid element ids
 */
function verifyElementID(done) {
  // Valid IDs
  chai.expect(RegExp(validators.element.id).test('org:proj:elem3')).to.equal(true);
  chai.expect(RegExp(validators.element.id).test('org:proj:3elem-id')).to.equal(true);

  // Invalid IDs
  chai.expect(RegExp(validators.element.id).test('Elem3')).to.equal(false);
  chai.expect(RegExp(validators.element.id).test('special*')).to.equal(false);
  chai.expect(RegExp(validators.element.id).test('')).to.equal(false);
  chai.expect(RegExp(validators.element.id).test('elem3')).to.equal(false);
  done();
}

/**
 * @description Verifies valid and invalid user usernames
 */
function verifyUserUsername(done) {
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
  done();
}

/**
 * @description Verifies valid and invalid user emails
 */
function verifyUserEmail(done) {
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
  done();
}

/**
 * @description Verifies valid and invalid user names
 */
function verifyUserName(done) {
  // Valid names
  chai.expect(RegExp(validators.user.fname).test('First Last')).to.equal(true);
  chai.expect(RegExp(validators.user.lname).test('First-Middle Last')).to.equal(true);

  // Invalid names
  chai.expect(RegExp(validators.user.fname).test('9first')).to.equal(false);
  chai.expect(RegExp(validators.user.lname).test(' space first')).to.equal(false);
  chai.expect(RegExp(validators.user.fname).test('-first')).to.equal(false);
  done();
}

/**
 * @description Verifies valid and invalid url paths
 */
function verifyURLPath(done) {
  // Valid paths
  chai.expect(RegExp(validators.url.next).test('/login')).to.equal(true);

  // Invalid paths
  chai.expect(RegExp(validators.url.next).test('login')).to.equal(false);
  chai.expect(RegExp(validators.url.next).test('//login')).to.equal(false);
  done();
}
