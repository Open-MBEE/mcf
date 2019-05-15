/**
 * Classification: UNCLASSIFIED
 *
 * @module test.301b-user-model-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests for expected errors within the user model.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const User = M.require('models.user');
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
   * Before: runs before all tests. Open the database connection.
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
  it('should reject when a username is too short', usernameTooShort);
  it('should reject when a username is too long', usernameTooLong);
  it('should reject when a first name is too long', fnameTooLong);
  it('should reject when a last name is too long', lnameTooLong);
  it('should reject when a preferred name is too long', preferredNameTooLong);
  it('should reject if the admin field is not a boolean', adminNotBoolean);
  it('should reject if the provider field is not a string', providerNotString);
  it('should reject if no username (_id) is provided', usernameNotProvided);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Attempts to create a user with a username that is too short.
 */
function usernameTooShort(done) {
  const userData = Object.assign({}, testData.users[0]);

  // Change username to be too short.
  userData._id = 'ab';

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: _id: '
        + 'Too few characters in username');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with a username that is too long.
 */
function usernameTooLong(done) {
  const userData = Object.assign({}, testData.users[0]);

  // Change username to be too long.
  userData._id = 'usernamewiththirtysevencharacters1234';

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: _id: '
        + 'Too many characters in username');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with a first name that is too long.
 */
function fnameTooLong(done) {
  const userData = Object.assign({}, testData.users[0]);
  userData._id = userData.username;

  // Change fname to be too long.
  userData.fname = 'thisusersfnameisthirtysevencharacters';

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: fname: '
        + 'Too many characters in first name');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with a last name that is too long.
 */
function lnameTooLong(done) {
  const userData = Object.assign({}, testData.users[0]);
  userData._id = userData.username;

  // Change lname to be too long.
  userData.lname = 'thisuserslnameisthirtysevencharacters';

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: lname: '
        + 'Too many characters in last name');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with a preferred name that's too long.
 */
function preferredNameTooLong(done) {
  const userData = Object.assign({}, testData.users[0]);
  userData._id = userData.username;

  // Change preferredName to be too long.
  userData.preferredName = 'apreferrednameisthirtysevencharacters';

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: '
        + 'preferredName: Too many characters in preferred name');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with an admin that's not a boolean.
 */
function adminNotBoolean(done) {
  const userData = Object.assign({}, testData.users[0]);
  userData._id = userData.username;

  // Change admin to not be a boolean.
  userData.admin = 123;

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: admin: '
        + 'Cast to Boolean failed for value "123" at path "admin"');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with a provider that's not a string.
 */
function providerNotString(done) {
  const userData = Object.assign({}, testData.users[0]);
  userData._id = userData.username;

  // Change provider to not be a string.
  userData.provider = {};

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: provider: '
        + 'Cast to String failed for value "{}" at path "provider"');
      done();
    }
  });
}

/**
 * @description Attempts to create a user with no username.
 */
function usernameNotProvided(done) {
  const userData = Object.assign({}, testData.users[0]);

  // Create user object
  const userObject = new User(userData);

  // Save user
  userObject.save()
  .then(() => {
    // Should not succeed, force to fail
    chai.assert.fail(true, false, 'User created successfully.');
  })
  .catch((error) => {
    // If user created successfully, fail the test
    if (error.message === 'User created successfully.') {
      done(error);
    }
    else {
      // Ensure error message is correct
      chai.expect(error.message).to.equal('User validation failed: _id: '
          + 'Username is required.');
      done();
    }
  });
}
