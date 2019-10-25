/**
 * @classification UNCLASSIFIED
 *
 * @module test.302b-org-model-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Tests for expected errors within the org model.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Org = M.require('models.organization');
const db = M.require('lib.db');
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
  it('should reject an invalid org ID', invalidID);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject if no name is provided', nameNotProvided);
  it('should reject if the permissions object in invalid', permissionsInvalid);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create an org with an id that is too short.
 */
async function idTooShort() {
  const orgData = Object.assign({}, testData.orgs[0]);

  // Change id to be too short.
  orgData._id = '0';

  // Create org object
  const orgObject = Org.createDocument(orgData);

  // Save org
  await orgObject.save().should.eventually.be.rejectedWith('Organization validation failed:'
    + ` _id: Org ID length [${orgData._id.length}] must not be less than 2 characters.`);
}

/**
 * @description Attempts to create an org with an id that is too long.
 */
async function idTooLong() {
  const orgData = Object.assign({}, testData.orgs[0]);

  // Change id to be too long (64 characters max)
  orgData._id = '01234567890123456789012345678901234567890123456789012345678912345';

  // Create org object
  const orgObject = Org.createDocument(orgData);

  // Save org
  await orgObject.save().should.eventually.be.rejectedWith('Organization validation failed: '
    + `_id: Org ID length [${orgData._id.length}] must not be more than `
    + `${validators.org.idLength} characters.`);
}

/**
 * @description Attempts to create an org with an invalid ID.
 */
async function invalidID() {
  if (customValidators.hasOwnProperty('org_id') || customValidators.hasOwnProperty('id')) {
    M.log.verbose('Skipping valid org id test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  const orgData = Object.assign({}, testData.orgs[0]);

  // Change id to be invalid
  orgData._id = 'INVALID_ID';

  // Create org object
  const orgObject = Org.createDocument(orgData);

  // Save org
  await orgObject.save().should.eventually.be.rejectedWith('Organization validation failed: '
    + `_id: Invalid org ID [${orgData._id}].`);
}

/**
 * @description Attempts to create an org with no id.
 */
async function idNotProvided() {
  const orgData = Object.assign({}, testData.orgs[0]);

  // Create org object
  const orgObject = Org.createDocument(orgData);

  // Save org
  await orgObject.save().should.eventually.be.rejectedWith('Organization validation failed: '
    + '_id: Path `_id` is required.');
}

/**
 * @description Attempts to create an org with no name.
 */
async function nameNotProvided() {
  const orgData = Object.assign({}, testData.orgs[0]);
  orgData._id = orgData.id;

  // Delete org name
  delete orgData.name;

  // Create org object
  const orgObject = Org.createDocument(orgData);

  // Save org
  await orgObject.save().should.eventually.be.rejectedWith('Organization validation failed: '
    + 'name: Path `name` is required.');
}

/**
 * @description Attempts to create an org with an invalid permissions object.
 */
async function permissionsInvalid() {
  const orgData = Object.assign({}, testData.orgs[0]);
  orgData._id = orgData.id;

  // Set invalid permissions
  orgData.permissions = {
    invalid: 'permissions'
  };

  // Create org object
  const orgObject = Org.createDocument(orgData);

  // Expect save() to fail with specific error message
  await orgObject.save().should.eventually.be.rejectedWith(
    'Organization validation failed: permissions: The organization permissions '
    + 'object is not properly formatted.'
  );
}
