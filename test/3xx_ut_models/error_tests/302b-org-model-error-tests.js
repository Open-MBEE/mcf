/**
 * Classification: UNCLASSIFIED
 *
 * @module test.302b-org-model-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests for expected errors within the org model.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const Org = M.require('models.organization');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: runs before all tests. Open database connection.
   */
  before((done) => {
    db.connect()
    .then(() => done())
    .catch((error) => {
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /**
   * After: runs after all tests. Close database connection.
   */
  after((done) => {
    db.disconnect()
    .then(() => done())
    .catch((error) => {
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  it('should reject when an org ID is too short', idTooShort);
  it('should reject when an org ID is too long', idTooLong);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject if no name is provided', nameNotProvided);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create an org with an id that is too short.
 */
function idTooShort(done) {
  const orgData = Object.assign({}, testData.orgs[0]);

  // Change id to be too short.
  orgData._id = '0';

  // Create org object
  const orgObject = new Org(orgData);

  // Save org
  orgObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Org created successfully.');
  })
  .catch((error) => {
    // If org created successfully, fail the test
    if (error.message === 'Org created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Organization validation failed:'
        + ' _id: Too few characters in ID');
      done();
    }
  });
}

/**
 * @description Attempts to create an org with an id that is too long.
 */
function idTooLong(done) {
  const orgData = Object.assign({}, testData.orgs[0]);

  // Change id to be too long (64 characters max)
  orgData._id = '01234567890123456789012345678901234567890123456789012345678912345';

  // Create org object
  const orgObject = new Org(orgData);

  // Save org
  orgObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Org created successfully.');
  })
  .catch((error) => {
    // If org created successfully, fail the test
    if (error.message === 'Org created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Organization validation failed: '
        + '_id: Too many characters in ID');
      done();
    }
  });
}

/**
 * @description Attempts to create an org with no id.
 */
function idNotProvided(done) {
  const orgData = Object.assign({}, testData.orgs[0]);

  // Create org object
  const orgObject = new Org(orgData);

  // Save org
  orgObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Org created successfully.');
  })
  .catch((error) => {
    // If org created successfully, fail the test
    if (error.message === 'Org created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Organization validation failed: '
        + '_id: Path `_id` is required.');
      done();
    }
  });
}

/**
 * @description Attempts to create an org with no name.
 */
function nameNotProvided(done) {
  const orgData = Object.assign({}, testData.orgs[0]);
  orgData._id = orgData.id;

  // Delete org name
  delete orgData.name;

  // Create org object
  const orgObject = new Org(orgData);

  // Save org
  orgObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Org created successfully.');
  })
  .catch((error) => {
    // If org created successfully, fail the test
    if (error.message === 'Org created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Organization validation failed: '
        + 'name: Path `name` is required.');
      done();
    }
  });
}
