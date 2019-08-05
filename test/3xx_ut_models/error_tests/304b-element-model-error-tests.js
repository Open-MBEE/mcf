/**
 * Classification: UNCLASSIFIED
 *
 * @module test.304b-element-model-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests for expected errors within the element model.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const Element = M.require('models.element');
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
   * Before: runs before all tests. Open database connection and create test
   * element.
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
   * After: runs after all tests. Close database connection and delete test
   * element.
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
  it('should reject when an element ID is too short', idTooShort);
  it('should reject when an element ID is too long', idTooLong);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject if no project is provided', projectNotProvided);
  it('should reject if no branch is provided', branchNotProvided);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create an element with an id that is too short.
 */
function idTooShort(done) {
  const elemData = Object.assign({}, testData.elements[0]);
  elemData.project = 'org:proj';
  elemData.branch = 'org:proj:branch';

  // Change id to be too short.
  elemData._id = '01:01:01:0';

  // Create element object
  const elemObject = new Element(elemData);

  // Save element
  elemObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Element created successfully.');
  })
  .catch((error) => {
    // If element created successfully, fail the test
    if (error.message === 'Element created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Element validation failed: _id: '
        + 'Too few characters in ID');
      done();
    }
  });
}

/**
 * @description Attempts to create an element with an id that is too long.
 */
function idTooLong(done) {
  const elemData = Object.assign({}, testData.elements[0]);
  elemData.project = 'org:proj';
  elemData.branch = 'org:proj:branch';

  // Change id to be too long.
  elemData._id = '012345678901234567890123456789012345:01234567890123456789'
    + '0123456789012345:012345678901234567890123456789012345:0123456789012345'
    + '67890123456789012345678901234567890123456789012345678901234567890123456'
    + '789012345678901234567890123456789012345678901234567890123456789012345678'
    + '901234567890123456789012';


  // Create element object
  const elemObject = new Element(elemData);

  // Save element
  elemObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Element created successfully.');
  })
  .catch((error) => {
    // If element created successfully, fail the test
    if (error.message === 'Element created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Element validation failed: _id: '
        + 'Too many characters in ID');
      done();
    }
  });
}

/**
 * @description Attempts to create an element with no id.
 */
function idNotProvided(done) {
  const elemData = Object.assign({}, testData.elements[0]);
  elemData.project = 'org:proj';
  elemData.branch = 'org:proj:branch';

  // Create element object
  const elemObject = new Element(elemData);

  // Save element
  elemObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Element created successfully.');
  })
  .catch((error) => {
    // If element created successfully, fail the test
    if (error.message === 'Element created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Element validation failed: _id: '
        + 'Path `_id` is required.');
      done();
    }
  });
}

/**
 * @description Attempts to create an element with no project.
 */
function projectNotProvided(done) {
  const elemData = Object.assign({}, testData.elements[0]);
  elemData._id = `org:proj:branch:${elemData.id}`;
  elemData.branch = 'org:proj:branch';


  // Create element object
  const elemObject = new Element(elemData);

  // Save element
  elemObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Element created successfully.');
  })
  .catch((error) => {
    // If element created successfully, fail the test
    if (error.message === 'Element created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Element validation failed: project: '
        + 'Path `project` is required.');
      done();
    }
  });
}

/**
 * @description Attempts to create an element with no project.
 */
function branchNotProvided(done) {
  const elemData = Object.assign({}, testData.elements[0]);
  elemData._id = `org:proj:branch:${elemData.id}`;
  elemData.project = 'org:proj';

  // Create element object
  const elemObject = new Element(elemData);

  // Save element
  elemObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Element created successfully.');
  })
  .catch((error) => {
    // If element created successfully, fail the test
    if (error.message === 'Element created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Element validation failed: branch: '
        + 'Path `branch` is required.');
      done();
    }
  });
}
