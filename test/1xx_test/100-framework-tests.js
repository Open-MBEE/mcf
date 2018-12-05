/**
 * Classification: UNCLASSIFIED
 *
 * @module  test.100-framework-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description These tests are used to ensure that the Mocha test framework and
 * chai assertions library exist and are working as expected. If this test suite
 * fails, any subsequent failures are likely a result of problems with the mocha
 * or chai modules.
 */

// Node modules
const chai = require('chai');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should run an empty test case', emptyTest);
  it('should run simple assertions', assertionsTest);
});

/* --------------------( Tests )-------------------- */
/**
 * Runs an empty test case. This show that Mocha is working.
 */
function emptyTest(done) {
  done();
}

/**
 * Runs some simple assertions to verify chai is working.
 */
function assertionsTest(done) {
  chai.expect(2).to.equal(2);
  chai.expect(2).to.not.equal(3);
  chai.expect('0').to.not.equal(0);         // Tests type casting
  chai.expect(0.1 + 0.2).to.not.equal(0.3); // Tests floating point precision
  chai.expect({}).to.not.equal({});         // Tests object reference
  done();
}
