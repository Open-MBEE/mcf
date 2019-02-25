/**
 * Classification: UNCLASSIFIED
 *
 * @module  test.207-custom-validators
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file tests that custom validators work as expected.
 * It is not a comprehensive set of tests and does not test every possible
 * custom validator. This file is meant as a basic sanity check on the initial
 * development of custom validators.
 *
 * This test suite SHOULD ONLY BE RUN MANUALLY! Do not run this with automated
 * CI tests. This is because it is heavily dependant on the configuration and
 * keep both the tests and the configuration up to date with the code is likely
 * unmaintainable. As a result, the string 'MANUAL-' is prepended to the test
 * name below (e.g. see the first arg of the `describe` function) to ensure
 * that is does not automatically get run along with the other tests.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const validators = M.require('lib.validators');
const utils = M.require('lib.utils');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(`MANUAL-${M.getModuleName(module.filename)}`, () => {
  it('should use a default validator by default', verifyDefaultValidator);
  it('should use a custom validator when set', verifyCustomValidator);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies username validator is the default when a custom
 * validator is not specified in the config file.
 *
 */
function verifyDefaultValidator(done) {
  const A = validators.user.username;
  const B = '^([a-z])([a-z0-9_]){0,}$';
  chai.expect(A).to.equal(B);
  done();
}

/**
 * @description Verifies the ID validator is overwritten with a UUID validator
 * that is specified in the config file.
 */
function verifyCustomValidator(done) {
  const A = validators.element.id;
  const B = M.config.validators.id;
  const C = `^${B}${utils.ID_DELIMITER}${B}${utils.ID_DELIMITER}${B}$`;
  chai.expect(A).to.equal(C);
  done();
}
