/**
 * Classification: UNCLASSIFIED
 *
 * @module test.303b-project-model-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests for expected errors within the project model.
 */

// Node modules
const path = require('path');
const chai = require('chai');

// MBEE modules
const Project = M.require('models.project');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
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
  it('should reject when a project ID is too short', idTooShort);
  it('should reject when a project ID is too long', idTooLong);
  it('should reject if no id (_id) is provided', idNotProvided);
  it('should reject if no org is provided', orgNotProvided);
  it('should reject if no name is provided', nameNotProvided);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create a project with an id that is too short.
 */
function idTooShort(done) {
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Change id to be too short.
  projData._id = '01:0';

  // Create project object
  const projObject = new Project(projData);

  // Save project
  projObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Project created successfully.');
  })
  .catch((error) => {
    // If project created successfully, fail the test
    if (error.message === 'Project created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Project validation failed: _id: '
        + 'Too few characters in ID');
      done();
    }
  });
}

/**
 * @description Attempts to create a project with an id that is too long.
 */
function idTooLong(done) {
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Change id to be too long.
  projData._id = '012345678901234567890123456789012345:01234567890123456789'
    + '01234567890123456';

  // Create project object
  const projObject = new Project(projData);

  // Save project
  projObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Project created successfully.');
  })
  .catch((error) => {
    // If project created successfully, fail the test
    if (error.message === 'Project created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Project validation failed: _id: '
        + 'Too many characters in ID');
      done();
    }
  });
}

/**
 * @description Attempts to create a project with no id.
 */
function idNotProvided(done) {
  const projData = Object.assign({}, testData.projects[0]);
  projData.org = 'org';

  // Create project object
  const projObject = new Project(projData);

  // Save project
  projObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Project created successfully.');
  })
  .catch((error) => {
    // If project created successfully, fail the test
    if (error.message === 'Project created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Project validation failed: _id: '
        + 'Path `_id` is required.');
      done();
    }
  });
}

/**
 * @description Attempts to create a project with no org.
 */
function orgNotProvided(done) {
  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;

  // Create project object
  const projObject = new Project(projData);

  // Save project
  projObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Project created successfully.');
  })
  .catch((error) => {
    // If project created successfully, fail the test
    if (error.message === 'Project created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Project validation failed: org: '
        + 'Path `org` is required.');
      done();
    }
  });
}

/**
 * @description Attempts to create a project with no name.
 */
function nameNotProvided(done) {
  const projData = Object.assign({}, testData.projects[0]);
  projData._id = `org:${projData.id}`;
  projData.org = 'org';

  // Delete name key
  delete projData.name;

  // Create project object
  const projObject = new Project(projData);

  // Save project
  projObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'Project created successfully.');
  })
  .catch((error) => {
    // If project created successfully, fail the test
    if (error.message === 'Project created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('Project validation failed: '
        + 'name: Path `name` is required.');
      done();
    }
  });
}
