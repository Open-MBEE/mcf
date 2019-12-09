/**
 * @classification UNCLASSIFIED
 *
 * @module test.db_tests.811-mongoose-mongodb-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description Tests the exported functions and classes from the
 * mongoose-mongodb-strategy. If this strategy is NOT selected in the running
 * config, the tests will be skipped.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const mongoStrategy = M.require('db.mongoose-mongodb-strategy.mongoose-mongodb-strategy');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /* Execute the tests */
  it('should sanitize data specific to mongoDB', sanitizeTest);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies the sanitization function properly sanitizes keys
 * with '$'.
 */
async function sanitizeTest() {
  // If not using the mongoose-mongodb-strategy strategy, skip this test
  if (M.config.db.strategy !== 'mongoose-mongodb-strategy') {
    M.log.verbose('Test skipped because the mongoose-mongodb-strategy is not '
      + 'being used.');
    this.skip();
  }

  // Sanitize the data
  const mongoSan = mongoStrategy.sanitize({ $lt: 10 });
  // Verify data correctly sanitized
  chai.expect(Object.keys(mongoSan).length).to.equal(0);
}
