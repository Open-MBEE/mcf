/**
 * Classification: UNCLASSIFIED
 *
 * @module test.401c-user-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description These tests test for specific use cases within the user
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM Modules
const chai = require('chai');

// MBEE Modules
const UserController = M.require('controllers.user-controller');
const User = M.require('models.user');
const db = M.require('lib.db');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
let adminUser = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Connect to the database, create an admin user
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set global admin user
      adminUser = user;
      done();
    })
    .catch((error) => {
      M.log.error(error.message);
      // Expect no error
      chai.expect(error.message).to.equal(null);
      done();
    });
  });

  /**
   * After: Delete admin user, disconnect from database
   */
  after((done) => {
    testUtils.removeTestAdmin()
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error.message);
      // Expect no error
      chai.expect(error.message).to.equal(null);
    });
  });

  /* Execute the tests */
  it('should create an archived user', createArchivedUser);
  it('should return a raw JSON version of a user instead of a mongoose '
    + 'object from create()', optionLeanCreate);
  it('should populate allowed fields when creating a user', optionPopulateCreate);
  it('should return a user with only the specific fields specified from'
    + ' create()', optionFieldsCreate);
  it('should archive a user', archiveUser);
  it('should find an archived user when the option archived is provided', optionArchivedFind);
  it('should return a raw JSON version of a user instead of a mongoose '
    + 'object from find()', optionLeanFind);
  it('should populate allowed fields when finding a user', optionPopulateFind);
  it('should return a limited number of users from find()', optionLimitFind);
  it('should return a second batch of users with the limit and skip option'
    + ' from find()', optionSkipFind);
  it('should return a raw JSON version of a user instead of a mongoose '
    + 'object from update()', optionLeanUpdate);
  it('should populate allowed fields when updating a user', optionPopulateUpdate);
  it('should return a raw JSON version of a user instead of a mongoose '
    + 'object from createOrReplace()', optionLeanReplace);
  it('should populate allowed fields when replacing a user', optionPopulateReplace);
  it('should return a user with only the specific fields specified from'
    + ' createOrReplace()', optionFieldsReplace);
  it('should search an archived user when the option archived is provided',
    optionArchivedSearch);
  it('should return a raw JSON version of a user instead of a mongoose '
    + 'object from search()', optionLeanSearch);
  it('should populate allowed fields when searching a user', optionPopulateSearch);
  it('should return a limited number of users from search()', optionLimitSearch);
  it('should return a second batch of users with the limit and skip option '
    + 'from search()', optionSkipSearch);
  it('should sort find results', optionSortFind);
  it('should sort search results', optionSortSearch);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that an archived user can be created
 */
function createArchivedUser(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test',
    archived: true
  };

  // Create user via UserController
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];
    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify that the user is archived
    chai.expect(createdUser.archived).to.equal(true);
    chai.expect(createdUser.archivedBy).to.equal(adminUser.username);
    chai.expect(createdUser.archivedOn).to.not.equal(null);
  })
  // Remove the test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the lean option returns a raw JSON object
 * rather than a user object when a user is created with the lean option
 */
function optionLeanCreate(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // create options object to specify lean
  const options = { lean: true };

  // Create the user with the lean option
  UserController.create(adminUser, userData, options)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Test that the returned object is lean
    chai.expect(createdUser instanceof User).to.equal(false);
  })
  // Remove the test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that specified populate fields will be returned when
 * creating a user
 */
function optionPopulateCreate(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Get the valid populate fields
  const pop = User.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };

  UserController.create(adminUser, userData, options)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // For each field in pop
    pop.forEach((field) => {
      // If the field is defined in the returned user
      if (createdUser.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof createdUser.field).to.equal('object');
        // Expect each populated field to at least have an _id
        chai.expect(createdUser.field.hasOwnProperty('_id')).to.equal(true);
      }
    });
  })
  // Remove the test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the fields option when specified with the create function
 * will cause the returned objects to return the specified fields
 */
function optionFieldsCreate(done) {
  // Create user objects
  const userObjFind = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'TestFind'
  };
  const userObjNotFind = {
    username: 'testuser01',
    password: 'Abc123!@',
    fname: 'TestNotFind'
  };
  // Create the options object with the list of fields specifically to find
  const findOptions = { fields: ['fname', 'createdBy'] };
  // Create the options object with the list of fields to specifically NOT find
  const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
  // Create the list of fields which are always provided no matter what
  const fieldsAlwaysProvided = ['_id'];

  // Create the user only with specific fields returned
  UserController.create(adminUser, userObjFind, findOptions)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible user fields.
    const visibleFields = Object.keys(createdUser._doc);

    // Check that the only keys in the user are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Create the user without the notFind fields
    return UserController.create(adminUser, userObjNotFind, notFindOptions);
  })
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Create a list of visible user fields. Object.keys(createdUser) returns hidden fields as well
    const visibleFields = Object.keys(createdUser._doc);

    // Check that the keys in the notFindOptions are not in createdUser
    chai.expect(Object.keys(visibleFields)).to.not.have.members(['createdOn', 'updatedOn']);
  })
  // Remove the test user
  .then(() => UserController.remove(adminUser, [userObjFind.username, userObjNotFind.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that a user can be archived
 */
function archiveUser(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the update object
  const updateObj = {
    username: userData.username,
    archived: true
  };
  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify that the user is not archived
    chai.expect(createdUser.archived).to.equal(false);

    // Update the user
    return UserController.update(adminUser, updateObj);
  })
  .then((updatedUsers) => {
    const updatedUser = updatedUsers[0];

    // Verify user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(userData.fname);

    // Verify that the user has been archived
    chai.expect(updatedUser.archived).to.equal(true);
    chai.expect(updatedUser.archivedBy).to.equal(adminUser.username);
    chai.expect(updatedUser.archivedOn).to.not.equal(null);
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies that archived users can be found in the find()
 * function using the option 'archived'.
 */
function optionArchivedFind(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test',
    archived: true
  };
  // Create the options object
  const options = { archived: true };

  // Create an archived user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify that the user is archived
    chai.expect(createdUser.archived).to.equal(true);

    // Attempt to find the user without providing options
    return UserController.find(adminUser, userData.username);
  })
  .then((foundUsers) => {
    // Expect the array to be empty since the option archived: true was not provided
    chai.expect(foundUsers.length).to.equal(0);

    // Attempt the find the user WITH providing the archived option
    return UserController.find(adminUser, userData.username, options);
  })
  .then((foundUsers) => {
    // Expect the array to be of length 1
    chai.expect(foundUsers.length).to.equal(1);
    const foundUser = foundUsers[0];

    // Verify all of the archived fields are properly set
    chai.expect(foundUser.archived).to.equal(true);
    chai.expect(foundUser.archivedOn).to.not.equal(null);
    chai.expect(foundUser.archivedBy).to.equal(adminUser.username);
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the lean option will return raw JSON when
 * specified to the find function
 */
function optionLeanFind(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the options object with lean: true
  const options = { lean: true };

  // Create a user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Find the user with the lean option
    return UserController.find(adminUser, userData.username, options);
  })
  .then((foundUsers) => {
    const foundUser = foundUsers[0];

    // Verify found user
    chai.expect(foundUser._id).to.equal(userData.username);
    chai.expect(foundUser.fname).to.equal(userData.fname);

    // Verify that the user is NOT a mongoose object
    chai.expect(foundUser instanceof User).to.equal(false);
  })
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies that the fields specified in the user model function
 * getValidPopulateFields() can all be populated in the find() function using
 * the option 'populate'.
 */
function optionPopulateFind(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Get the valid populate fields
  const pop = User.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };

  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);

    // Find the user with the populate option
    return UserController.find(adminUser, userData.username, options);
  })
  .then((foundUsers) => {
    const foundUser = foundUsers[0];

    // Verify user found
    chai.expect(foundUser._id).to.equal(userData.username);
    chai.expect(foundUser.username).to.equal(userData.username);

    // For each field in pop
    pop.forEach((field) => {
      if (foundUser.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof foundUser.field).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect(foundUser.field.hasOwnProperty('_id')).to.equal(true);
      }
    });
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies a limited number of users are returned when the
 * option 'limit' is supplied to the find() function.
 */
function optionLimitFind(done) {
  // Create user objects
  const user1 = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  const user2 = {
    username: 'testuser01',
    password: 'Abc123!@',
    fname: 'Test'
  };
  const user3 = {
    username: 'testuser02',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the options object with a limit of 2
  const options = { limit: 2 };

  // Create test users
  UserController.create(adminUser, [user1, user2, user3])
  .then((createdUsers) => {
    // Verify that 3 users were created
    chai.expect(createdUsers.length).to.equal(3);
    // Find all users
    return UserController.find(adminUser, options);
  })
  .then((foundUsers) => {
    // Verify that no more than 2 users were found
    chai.expect(foundUsers).to.have.lengthOf.at.most(2);
  })
  // Remove test users
  .then(() => UserController.remove(adminUser, [user1.username, user2.username, user3.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies that a second batch of users are returned when using
 * the 'skip' and 'limit' option together in the find() function
 */
function optionSkipFind(done) {
  // Create user objects
  const user1 = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  const user2 = {
    username: 'testuser01',
    password: 'Abc123!@',
    fname: 'Test'
  };
  const user3 = {
    username: 'testuser02',
    password: 'Abc123!@',
    fname: 'Test'
  };
  const user4 = {
    username: 'testuser03',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create an array to store first batch of user ids
  let firstBatchIDs = [];
  // Create the first options object with just a limit
  const firstOptions = { limit: 2 };
  // Create the second options object with a limit and skip
  const secondOptions = { limit: 2, skip: 2 };

  // Create the test users
  UserController.create(adminUser, [user1, user2, user3, user4])
  .then((createdUsers) => {
    // Verify that four users were created
    chai.expect(createdUsers.length).to.equal(4);

    // Find the first two users
    return UserController.find(adminUser, firstOptions);
  })
  .then((foundUsers) => {
    // Verify that no more than 2 users were found
    chai.expect(foundUsers.length).to.equal(2);
    // Add user ids to the firstBatchIDs array
    firstBatchIDs = foundUsers.map(u => u._id);

    // Find the next batch of users
    return UserController.find(adminUser, secondOptions);
  })
  .then((foundUsers) => {
    // Verify that no more than 2 users were found
    chai.expect(foundUsers).to.have.lengthOf.at.most(2);
    // Verify the second batch of users are not the same as the first
    const secondBatchIDs = foundUsers.map(u => u._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);
  })
  .then(() => UserController.remove(adminUser, [user1.username,
    user2.username, user3.username, user4.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the lean option when specified with the update function
 * will cause the returned objects to be lean
 */
function optionLeanUpdate(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the update object
  const updateUser = {
    username: userData.username,
    fname: 'Updated'
  };
  // Create options object
  const options = { lean: true };

  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Validate user properties
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Update the user
    return UserController.update(adminUser, updateUser, options);
  })
  .then((updatedUsers) => {
    const updatedUser = updatedUsers[0];

    // Verify user properties
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(updateUser.fname);

    // Verify that the returned user object is lean
    chai.expect(updatedUser instanceof User).to.equal(false);
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the populate option when specified with the update
 * function will cause the returned objects to populate the specified fields with objects
 */
function optionPopulateUpdate(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the update object
  const updateUser = {
    username: userData.username,
    fname: 'Update'
  };
  // Get valid populate options
  const pop = User.getValidPopulateFields();
  // Create options object
  const options = { populate: pop };

  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Validate user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Update the user
    return UserController.update(adminUser, updateUser, options);
  })
  .then((updatedUsers) => {
    const updatedUser = updatedUsers[0];

    // Validate that the user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.fname).to.equal(updateUser.fname);

    // Validate that the returned object has populated fields
    pop.forEach((field) => {
      if (updatedUser.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof updatedUser.field).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect(updatedUser.field.hasOwnProperty('_id')).to.equal(true);
      }
    });
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the lean option when specified with the createOrReplace function
 * will cause the returned objects to be lean
 */
function optionLeanReplace(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the replace user object
  const replaceUserObj = {
    username: userData.username,
    password: 'Abc123!@',
    fname: 'Replaced'
  };
  // Create the options object
  const options = { lean: true };

  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Validate created user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Replace the user
    return UserController.createOrReplace(adminUser, replaceUserObj, options);
  })
  .then((replacedUsers) => {
    const replacedUser = replacedUsers[0];

    // Check that user was replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(replaceUserObj.fname);

    // Check that the returned object is lean
    chai.expect(replacedUser instanceof User).to.equal(false);
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the populate option when specified with the createOrReplace
 * function will cause the returned objects to populate the specified fields with objects
 */
function optionPopulateReplace(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the replace user object
  const replaceUserObj = {
    username: userData.username,
    password: 'Abc123!@',
    fname: 'Replaced'
  };
  // Get valid populate options
  const pop = User.getValidPopulateFields();
  // Create options object
  const options = { populate: pop };

  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Validate created user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Replace the user
    return UserController.createOrReplace(adminUser, replaceUserObj, options);
  })
  .then((replacedUsers) => {
    const replacedUser = replacedUsers[0];

    // Validate that user was replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.username).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(replaceUserObj.fname);

    // Validate that the returned object has populated fields
    pop.forEach((field) => {
      if (replacedUser.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof replacedUser.field).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect(replacedUser.field.hasOwnProperty('_id')).to.equal(true);
      }
    });
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the fields option when specified with the createOrReplace function
 * will cause the returned objects to return the specified fields
 */
function optionFieldsReplace(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'Test'
  };
  // Create the replace user objects
  const replaceUserObj1 = {
    username: userData.username,
    password: 'Abc123!@',
    fname: 'Replaced'
  };
  const replaceUserObj2 = {
    username: userData.username,
    password: 'Abc123!@',
    fname: 'ReplacedAgain'
  };
  // Create the options object with the list of fields specifically to find
  const findOptions = { fields: ['fname', 'createdBy'] };
  // Create the options object with the list of fields to specifically NOT find
  const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
  // Create the list of fields which are always provided no matter what
  const fieldsAlwaysProvided = ['_id'];

  // Create the test user
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Validate created user
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Replace a user with field find options
    return UserController.createOrReplace(adminUser, replaceUserObj1, findOptions);
  })
  .then((replacedUsers) => {
    const replacedUser = replacedUsers[0];

    // Validate that user was replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.username).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(replaceUserObj1.fname);

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible user fields.
    const visibleFields = Object.keys(replacedUser._doc);

    // Check that the only keys in the user are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    return UserController.createOrReplace(adminUser, replaceUserObj2, notFindOptions);
  })
  .then((replacedUsers) => {
    const replacedUser = replacedUsers[0];

    // Validate user replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.username).to.equal(userData.username);
    chai.expect(replacedUser.fname).to.equal(replaceUserObj2.fname);

    // Create a list of visible user fields.
    const visibleFields = Object.keys(replacedUser._doc);

    // Check that the keys in the notFindOptions are not in createdUser
    chai.expect(Object.keys(visibleFields)).to.not.have.members(['createdOn', 'updatedOn']);
  })
  // Remove test user
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the archived option when specified in the search function
 * allows for archived results to be returned
 */
function optionArchivedSearch(done) {
  // Create user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'FirstName',
    archived: true
  };
  // Search term
  const searchQuery = 'FirstName';
  // Create options object
  const options = { archived: true };

  // Create user via UserController
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Verify user archived
    chai.expect(createdUser.archived).to.equal(true);

    // Search for users
    return UserController.search(adminUser, searchQuery, options);
  })
  .then((foundUsers) => {
    // Expect to find at least one user
    chai.expect(foundUsers).to.have.lengthOf.at.least(1);
    // Validate search text in found users
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
    });
  })
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the lean option when specified in the search function
 * returns lean results
 */
function optionLeanSearch(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'First'
  };
  // Search term
  const searchQuery = 'First';
  // Create options object
  const options = { lean: true };
  // Create user via UserController
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Search for users
    return UserController.search(adminUser, searchQuery, options);
  })
  .then((foundUsers) => {
    foundUsers.forEach((foundUser) => {
      // Validate search text in found users
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
      // Expect every returned user object to be lean
      chai.expect(foundUser instanceof User).to.equal(false);
    });
  })
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the populated parameter will cause specified fields to
 * be populated in the search results when used with the search function
 */
function optionPopulateSearch(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'First'
  };
  // Search term
  const searchQuery = 'First';
  // Get valid populate fields
  const pop = User.getValidPopulateFields();
  // Create options object
  const options = { populate: pop };

  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Search for users
    return UserController.search(adminUser, searchQuery, options);
  })
  .then((foundUsers) => {
    // Validate search function
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
    });

    // Validate that fields were populated
    pop.forEach((field) => {
      foundUsers.forEach((foundUser) => {
        if (foundUser.hasOwnProperty(field)) {
          // Expect the populated field to be an object
          chai.expect(typeof foundUser.field).to.equal('object');
          // Expect the field to have at least an _id property
          chai.expect(foundUser.field.hasOwnProperty('_id')).to.equal(true);
        }
      });
    });
  })
  .then(() => UserController.remove(adminUser, userData.username))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the limit parameter will limit the number of search
 * results returned when used with the search function
 */
function optionLimitSearch(done) {
  // Create the user object
  const userData = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'First'
  };
  const userData2 = {
    username: 'testuser01',
    password: 'Abc123!@',
    fname: 'First'
  };
  // Search term
  const searchQuery = 'First';
  // Create options object
  const options = { limit: 1 };
  UserController.create(adminUser, [userData, userData2])
  .then((createdUsers) => {
    const createdUser = createdUsers[0];

    // Verify user created
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.fname).to.equal(userData.fname);

    // Search for users
    return UserController.search(adminUser, searchQuery, options);
  })
  .then((foundUsers) => {
    // Expect only one users to be returned
    chai.expect(foundUsers.length).to.equal(1);

    // Validate search function
    foundUsers.forEach((foundUser) => {
      chai.expect(foundUser.fname || foundUser.lname
        || foundUser.preferredName).to.equal(searchQuery);
    });
  })
  .then(() => UserController.remove(adminUser, [userData.username, userData2.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the skip parameter will skip search results when used
 * with the search function
 */
function optionSkipSearch(done) {
  // Create user objects
  const user1 = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'First'
  };
  const user2 = {
    username: 'testuser01',
    password: 'Abc123!@',
    fname: 'First'
  };
  const user3 = {
    username: 'testuser02',
    password: 'Abc123!@',
    fname: 'First'
  };
  let firstBatchIDs = [];
  // Search term
  const searchQuery = 'First';
  // Create the first options object with just a limit
  const firstOptions = { limit: 2 };
  // Create the second options object with a limit and skip
  const secondOptions = { limit: 1, skip: 2 };

  // Create test users
  UserController.create(adminUser, [user1, user2, user3])
  .then((createdUsers) => {
    // Validate that 3 users were created
    chai.expect(createdUsers.length).to.equal(3);

    // Search for users
    return UserController.search(adminUser, searchQuery, firstOptions);
  })
  .then((foundUsers) => {
    // Expect to find the first two users
    chai.expect(foundUsers.length).to.equal(2);

    // Add user ids to the firstBatchIDs array
    firstBatchIDs = foundUsers.map(u => u._id);

    // Search for next batch of users
    return UserController.search(adminUser, searchQuery, secondOptions);
  })
  .then((foundUsers) => {
    // Expect to find one user
    chai.expect(foundUsers.length).to.equal(1);

    // Expect the second search to return different users than the first
    const secondBatchIDs = foundUsers.map(u => u._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);
  })
  .then(() => UserController.remove(adminUser, [user1.username, user2.username, user3.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the find results can be sorted
 */
function optionSortFind(done) {
  // Create user objects
  const user1 = {
    username: 'testuser0',
    password: 'Abc123!@',
    fname: 'c'
  };
  const user2 = {
    username: 'testuser1',
    password: 'Abc123!@',
    fname: 'a'
  };
  const user3 = {
    username: 'testuser2',
    password: 'Abc123!@',
    fname: 'b'
  };
  // Create sort options
  const sortOption = { sort: 'fname' };
  const sortOptionReverse = { sort: '-fname' };

  // Create the test users
  UserController.create(adminUser, [user1, user2, user3])
  .then((createdUsers) => {
    // Validate that 3 users were created
    chai.expect(createdUsers.length).to.equal(3);

    // Find the users and return them sorted
    return UserController.find(adminUser, [user1.username, user2.username, user3.username],
      sortOption);
  })
  .then((foundUsers) => {
    // Expect to find all three users
    chai.expect(foundUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundUsers[0].fname).to.equal('a');
    chai.expect(foundUsers[0].username).to.equal('testuser1');
    chai.expect(foundUsers[1].fname).to.equal('b');
    chai.expect(foundUsers[1].username).to.equal('testuser2');
    chai.expect(foundUsers[2].fname).to.equal('c');
    chai.expect(foundUsers[2].username).to.equal('testuser0');

    // Find the users and return them sorted in reverse
    return UserController.find(adminUser, [user1.username, user2.username, user3.username],
      sortOptionReverse);
  })
  .then((foundUsers) => {
    // Expect to find all three users
    chai.expect(foundUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundUsers[0].fname).to.equal('c');
    chai.expect(foundUsers[0].username).to.equal('testuser0');
    chai.expect(foundUsers[1].fname).to.equal('b');
    chai.expect(foundUsers[1].username).to.equal('testuser2');
    chai.expect(foundUsers[2].fname).to.equal('a');
    chai.expect(foundUsers[2].username).to.equal('testuser1');
  })
  .then(() => UserController.remove(adminUser, [user1.username, user2.username, user3.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the search results can be sorted
 */
function optionSortSearch(done) {
  // Create user objects
  const user1 = {
    username: 'testuser00',
    password: 'Abc123!@',
    fname: 'b',
    lname: 'searchme'
  };
  const user2 = {
    username: 'testuser01',
    password: 'Abc123!@',
    fname: 'c',
    lname: 'searchme'
  };
  const user3 = {
    username: 'testuser02',
    password: 'Abc123!@',
    fname: 'a',
    lname: 'searchme'
  };
  const user4 = {
    username: 'testuser03',
    password: 'Abc123!@',
    fname: 'd',
    lname: 'no'
  };

  // Create sort options
  const sortOption = { sort: 'fname' };
  const sortOptionReverse = { sort: '-fname' };
  // Search term
  const searchQuery = 'searchme';

  // Create the test users
  UserController.create(adminUser, [user1, user2, user3, user4])
  .then((createdUsers) => {
    // Validate that 4 users were created
    chai.expect(createdUsers.length).to.equal(4);

    // Search the users and return them sorted
    return UserController.search(adminUser, searchQuery, sortOption);
  })
  .then((foundUsers) => {
    // Expect to only find three users
    chai.expect(foundUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundUsers[0].fname).to.equal('a');
    chai.expect(foundUsers[0].username).to.equal('testuser02');
    chai.expect(foundUsers[1].fname).to.equal('b');
    chai.expect(foundUsers[1].username).to.equal('testuser00');
    chai.expect(foundUsers[2].fname).to.equal('c');
    chai.expect(foundUsers[2].username).to.equal('testuser01');

    // Search the users and return them sorted in reverse
    return UserController.search(adminUser, searchQuery, sortOptionReverse);
  })
  .then((foundUsers) => {
    // Expect to find three users
    chai.expect(foundUsers.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundUsers[0].fname).to.equal('c');
    chai.expect(foundUsers[0].username).to.equal('testuser01');
    chai.expect(foundUsers[1].fname).to.equal('b');
    chai.expect(foundUsers[1].username).to.equal('testuser00');
    chai.expect(foundUsers[2].fname).to.equal('a');
    chai.expect(foundUsers[2].username).to.equal('testuser02');
  })
  .then(() => UserController.remove(adminUser, [user1.username, user2.username,
    user3.username, user4.username]))
  .then(() => done())
  .catch((error) => {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
