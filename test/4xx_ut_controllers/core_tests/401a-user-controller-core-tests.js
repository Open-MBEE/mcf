/**
 * @classification UNCLASSIFIED
 *
 * @module test.401a-user-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Austin Bieber
 * @author Connor Doyle
 *
 * @description Tests the user controller functionality: create,
 * delete, update, and find users.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const User = M.require('models.user');
const UserController = M.require('controllers.user-controller');
const Organization = M.require('models.organization');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
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
   * Before: Create admin user.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Delete admin user.
   */
  after(async () => {
    try {
      // Removing admin user
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // ------------- Create -------------
  it('should create a user', createUser);
  it('should create multiple users', createUsers);
  // -------------- Find --------------
  it('should find a user', findUser);
  it('should find multiple users', findUsers);
  it('should find all users', findAllUsers);
  // ------------- Update -------------
  it('should update a user', updateUser);
  it('should update multiple users', updateUsers);
  // ------------- Replace ------------
  it('should create or replace a user', createOrReplaceUser);
  it('should create and replace multiple users', createOrReplaceUsers);
  // --------- Update Password --------
  it('should update a users password', updateUserPassword);
  // ------------- Search -------------
  it('should find a user through text search', searchUser);
  // ------------- Remove -------------
  it('should delete a user', deleteUser);
  it('should delete multiple users', deleteUsers);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the User Controller can create a user.
 *
 * @param {Function} done - The Mocha callback.
 */
function createUser(done) {
  const userData = testData.users[0];

  // Create user via controller
  UserController.create(adminUser, userData)
  .then((createdUsers) => {
    // Expect createdUsers array to contain 1 user
    chai.expect(createdUsers.length).to.equal(1);
    const createdUser = createdUsers[0];

    // Verify user created properly
    chai.expect(createdUser._id).to.equal(userData.username);
    chai.expect(createdUser.preferredName).to.equal(userData.preferredName);
    chai.expect(createdUser.fname).to.equal(userData.fname);
    chai.expect(createdUser.lname).to.equal(userData.lname);
    chai.expect(createdUser.admin).to.equal(userData.admin);
    chai.expect(createdUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(createdUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(createdUser.createdBy).to.equal(adminUser._id);
    chai.expect(createdUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdUser.archivedBy).to.equal(null);
    chai.expect(createdUser.createdOn).to.not.equal(null);
    chai.expect(createdUser.updatedOn).to.not.equal(null);
    chai.expect(createdUser.archivedOn).to.equal(null);

    // Find the default org
    return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  })
  .then((defaultOrg) => {
    // Verify the user has read/write permission on the default org
    chai.expect(defaultOrg.permissions[userData.username]).to.include('read');
    chai.expect(defaultOrg.permissions[userData.username]).to.include('write');
    chai.expect(defaultOrg.permissions[userData.username]).to.not.include('admin');
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can create multiple users.
 *
 * @param {Function} done - The Mocha callback.
 */
function createUsers(done) {
  const userDataObjects = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Create users via controller
  UserController.create(adminUser, userDataObjects)
  .then((createdUsers) => {
    // Expect createdUsers not to be empty
    chai.expect(createdUsers.length).to.equal(userDataObjects.length);

    // Convert createdUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, createdUsers);
    // Loops through each user data object
    userDataObjects.forEach((userDataObject) => {
      const createdUser = jmi2Users[userDataObject.username];

      // Verify user created properly
      chai.expect(createdUser._id).to.equal(userDataObject.username);
      chai.expect(createdUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(createdUser.fname).to.equal(userDataObject.fname);
      chai.expect(createdUser.lname).to.equal(userDataObject.lname);
      chai.expect(createdUser.admin).to.equal(userDataObject.admin);
      chai.expect(createdUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(createdUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(createdUser.createdBy).to.equal(adminUser._id);
      chai.expect(createdUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdUser.archivedBy).to.equal(null);
      chai.expect(createdUser.createdOn).to.not.equal(null);
      chai.expect(createdUser.updatedOn).to.not.equal(null);
      chai.expect(createdUser.archivedOn).to.equal(null);
    });

    // Find the default org
    return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  })
  .then((defaultOrg) => {
    const usernames = userDataObjects.map(u => u.username);
    // Verify the user has read/write permission on the default org
    usernames.forEach((username) => {
      chai.expect(defaultOrg.permissions[username]).to.include('read');
      chai.expect(defaultOrg.permissions[username]).to.include('write');
      chai.expect(defaultOrg.permissions[username]).to.not.include('admin');
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can create or replace a user.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrReplaceUser(done) {
  const userData = testData.users[0];

  // Create or replace user via controller
  UserController.createOrReplace(adminUser, userData)
  .then((replacedUsers) => {
    // Expect replacedUsers array to contain 1 user
    chai.expect(replacedUsers.length).to.equal(1);
    const replacedUser = replacedUsers[0];

    // Verify user created/replaced properly
    chai.expect(replacedUser._id).to.equal(userData.username);
    chai.expect(replacedUser.preferredName).to.equal(userData.preferredName);
    chai.expect(replacedUser.fname).to.equal(userData.fname);
    chai.expect(replacedUser.lname).to.equal(userData.lname);
    chai.expect(replacedUser.admin).to.equal(userData.admin);
    chai.expect(replacedUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(replacedUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(replacedUser.createdBy).to.equal(adminUser._id);
    chai.expect(replacedUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedUser.archivedBy).to.equal(null);
    chai.expect(replacedUser.createdOn).to.not.equal(null);
    chai.expect(replacedUser.updatedOn).to.not.equal(null);
    chai.expect(replacedUser.archivedOn).to.equal(null);

    // Find the default org
    return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  })
  .then((defaultOrg) => {
    // Verify the user has read/write permission on the default org
    chai.expect(defaultOrg.permissions[userData.username]).to.include('read');
    chai.expect(defaultOrg.permissions[userData.username]).to.include('write');
    chai.expect(defaultOrg.permissions[userData.username]).to.not.include('admin');
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can create or replace multiple users.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrReplaceUsers(done) {
  const userDataObjects = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Create/replaces users via controller
  UserController.createOrReplace(adminUser, userDataObjects)
  .then((replacedUsers) => {
    // Expect replacedUsers not to be empty
    chai.expect(replacedUsers.length).to.equal(userDataObjects.length);

    // Convert replacedUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, replacedUsers);
    // Loops through each user data object
    userDataObjects.forEach((userDataObject) => {
      const replacedUser = jmi2Users[userDataObject.username];

      // Verify user created/replaced properly
      chai.expect(replacedUser._id).to.equal(userDataObject.username);
      chai.expect(replacedUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(replacedUser.fname).to.equal(userDataObject.fname);
      chai.expect(replacedUser.lname).to.equal(userDataObject.lname);
      chai.expect(replacedUser.admin).to.equal(userDataObject.admin);
      chai.expect(replacedUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(replacedUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(replacedUser.createdBy).to.equal(adminUser._id);
      chai.expect(replacedUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedUser.archivedBy).to.equal(null);
      chai.expect(replacedUser.createdOn).to.not.equal(null);
      chai.expect(replacedUser.updatedOn).to.not.equal(null);
      chai.expect(replacedUser.archivedOn).to.equal(null);
    });

    // Find the default org
    return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  })
  .then((defaultOrg) => {
    const usernames = userDataObjects.map(u => u.username);
    // Verify the user has read/write permission on the default org
    usernames.forEach((username) => {
      chai.expect(defaultOrg.permissions[username]).to.include('read');
      chai.expect(defaultOrg.permissions[username]).to.include('write');
      chai.expect(defaultOrg.permissions[username]).to.not.include('admin');
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can find a user.
 *
 * @param {Function} done - The Mocha callback.
 */
function findUser(done) {
  const userData = testData.users[0];

  // Find user via controller
  UserController.find(adminUser, userData.username)
  .then((foundUsers) => {
    // Expect foundUsers array to contain 1 user
    chai.expect(foundUsers.length).to.equal(1);
    const foundUser = foundUsers[0];

    // Verify user created properly
    chai.expect(foundUser._id).to.equal(userData.username);
    chai.expect(foundUser.preferredName).to.equal(userData.preferredName);
    chai.expect(foundUser.fname).to.equal(userData.fname);
    chai.expect(foundUser.lname).to.equal(userData.lname);
    chai.expect(foundUser.admin).to.equal(userData.admin);
    chai.expect(foundUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(foundUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(foundUser.createdBy).to.equal(adminUser._id);
    chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundUser.archivedBy).to.equal(null);
    chai.expect(foundUser.createdOn).to.not.equal(null);
    chai.expect(foundUser.updatedOn).to.not.equal(null);
    chai.expect(foundUser.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can find multiple users.
 *
 * @param {Function} done - The Mocha callback.
 */
function findUsers(done) {
  const userDataObjects = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Create list of usernames to find
  const usernames = userDataObjects.map(u => u.username);

  // Find users via controller
  UserController.find(adminUser, usernames)
  .then((foundUsers) => {
    // Expect foundUsers not to be empty
    chai.expect(foundUsers.length).to.equal(userDataObjects.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, foundUsers);
    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];

      // Verify user created properly
      chai.expect(foundUser._id).to.equal(userDataObject.username);
      chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(foundUser.fname).to.equal(userDataObject.fname);
      chai.expect(foundUser.lname).to.equal(userDataObject.lname);
      chai.expect(foundUser.admin).to.equal(userDataObject.admin);
      chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(foundUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(foundUser.createdBy).to.equal(adminUser._id);
      chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundUser.archivedBy).to.equal(null);
      chai.expect(foundUser.createdOn).to.not.equal(null);
      chai.expect(foundUser.updatedOn).to.not.equal(null);
      chai.expect(foundUser.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can find all users.
 *
 * @param {Function} done - The Mocha callback.
 */
function findAllUsers(done) {
  const userDataObjects = [
    testData.adminUser,
    testData.users[0],
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Find users via controller
  UserController.find(adminUser)
  .then((foundUsers) => {
    // Expect to find at least the same number of users as in userDataObjects
    chai.expect(foundUsers.length).to.be.at.least(userDataObjects.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, foundUsers);

    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];
      // Ensure user was found
      chai.expect(foundUser).to.not.equal(undefined);

      if (foundUser._id !== adminUser._id) {
        // Verify user created properly
        chai.expect(foundUser._id).to.equal(userDataObject.username);
        chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
        chai.expect(foundUser.fname).to.equal(userDataObject.fname);
        chai.expect(foundUser.lname).to.equal(userDataObject.lname);
        chai.expect(foundUser.admin).to.equal(userDataObject.admin);
        chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);

        // Expect the password to be hashed
        chai.expect(foundUser.password).to.not.equal(userDataObject.password);

        // Verify additional properties
        chai.expect(foundUser.createdBy).to.equal(adminUser._id);
        chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(foundUser.archivedBy).to.equal(null);
        chai.expect(foundUser.createdOn).to.not.equal(null);
        chai.expect(foundUser.updatedOn).to.not.equal(null);
        chai.expect(foundUser.archivedOn).to.equal(null);
      }
      // Admin user special cases
      else {
        chai.expect(foundUser._id).to.equal(userDataObject.username);
        chai.expect(foundUser.password).to.not.equal(userDataObject.password);
      }
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can find a user through text based search.
 *
 * @param {Function} done - The Mocha callback.
 */
function searchUser(done) {
  const userData = [
    testData.users[0],
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Find user via controller
  UserController.search(adminUser, `"${userData[0].fname}"`, {})
  .then((foundUsers) => {
    // Expect foundUsers array to contain all users with the same first name (all 4)
    chai.expect(foundUsers.length).to.equal(userData.length);

    // Convert foundUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, foundUsers, '_id');
    // Loop through each user data object
    userData.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];
      // Ensure user was found
      chai.expect(foundUser).to.not.equal(undefined);

      // Verify expected response
      chai.expect(foundUser._id).to.equal(userDataObject.username);
      chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(foundUser.fname).to.equal(userDataObject.fname);
      chai.expect(foundUser.lname).to.equal(userDataObject.lname);
      chai.expect(foundUser.admin).to.equal(userDataObject.admin);
      chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(foundUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(foundUser.createdBy).to.equal(adminUser._id);
      chai.expect(foundUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundUser.archivedBy).to.equal(null);
      chai.expect(foundUser.createdOn).to.not.equal(null);
      chai.expect(foundUser.updatedOn).to.not.equal(null);
      chai.expect(foundUser.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}


/**
 * @description Validates that the User Controller can update a user.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateUser(done) {
  const userData = testData.users[0];

  // Create object to update user
  const updateObj = {
    preferredName: 'Name Updated',
    username: userData.username
  };

  // Update user via controller
  UserController.update(adminUser, updateObj)
  .then((updatedUsers) => {
    // Expect updatedUsers array to contain 1 user
    chai.expect(updatedUsers.length).to.equal(1);
    const updatedUser = updatedUsers[0];

    // Verify user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.preferredName).to.equal(updateObj.preferredName);
    chai.expect(updatedUser.fname).to.equal(userData.fname);
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(updatedUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(updatedUser.createdBy).to.equal(adminUser._id);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedUser.archivedBy).to.equal(null);
    chai.expect(updatedUser.createdOn).to.not.equal(null);
    chai.expect(updatedUser.updatedOn).to.not.equal(null);
    chai.expect(updatedUser.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can update multiple users.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateUsers(done) {
  const userDataObjects = [
    testData.users[0],
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Create object to update user
  const updateObjects = userDataObjects.map((u) => ({
    preferredName: 'Name Updated',
    username: u.username
  }));

  // Update user via controller
  UserController.update(adminUser, updateObjects)
  .then((updatedUsers) => {
    // Expect updatedUsers array to not be empty
    chai.expect(updatedUsers.length).to.equal(userDataObjects.length);

    // Convert updatedUsers to JMI type 2 for easier lookup
    const jmi2Users = jmi.convertJMI(1, 2, updatedUsers);
    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      const updatedUser = jmi2Users[userDataObject.username];

      // Verify user updated properly
      chai.expect(updatedUser._id).to.equal(userDataObject.username);
      chai.expect(updatedUser.preferredName).to.equal('Name Updated');
      chai.expect(updatedUser.fname).to.equal(userDataObject.fname);
      chai.expect(updatedUser.lname).to.equal(userDataObject.lname);
      chai.expect(updatedUser.admin).to.equal(userDataObject.admin);
      chai.expect(updatedUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(updatedUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(updatedUser.createdBy).to.equal(adminUser._id);
      chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedUser.archivedBy).to.equal(null);
      chai.expect(updatedUser.createdOn).to.not.equal(null);
      chai.expect(updatedUser.updatedOn).to.not.equal(null);
      chai.expect(updatedUser.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can update a user's password.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateUserPassword(done) {
  const userData = testData.users[0];
  const newPassword = 'NewPass1234?';
  let foundUser = null;

  // Get the user object
  UserController.find(adminUser, userData.username)
  .then((user) => {
    foundUser = user[0];
    // Update the password via the controller
    return UserController.updatePassword(foundUser, foundUser._id, userData.password, newPassword,
      newPassword);
  })
  .then((updatedUser) => {
    // Verify user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.preferredName).to.equal(userData.preferredName);
    chai.expect(updatedUser.fname).to.equal(userData.fname);
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(updatedUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(updatedUser.createdBy).to.equal(adminUser._id);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedUser.archivedBy).to.equal(null);
    chai.expect(updatedUser.createdOn).to.not.equal(null);
    chai.expect(updatedUser.updatedOn).to.not.equal(null);
    chai.expect(updatedUser.archivedOn).to.equal(null);

    // Verify the new password is correct
    return User.verifyPassword(updatedUser, newPassword);
  })
  .then((success) => {
    // Expect success to be true, meaning password is correct
    chai.expect(success).to.equal(true);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can delete a user.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteUser(done) {
  const userData = testData.users[0];

  // Delete user via controller
  UserController.remove(adminUser, userData.username)
  .then((deletedUsers) => {
    // Expect deletedUsers array to contain 1 user
    chai.expect(deletedUsers.length).to.equal(1);

    // Verify correct user deleted
    chai.expect(deletedUsers).to.include(userData.username);

    // Attempt to find the deleted user
    return UserController.find(adminUser, userData.username, { archived: true });
  })
  .then((foundUsers) => {
    // Expect foundUsers array to be empty
    chai.expect(foundUsers.length).to.equal(0);

    // Find the default org
    return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  })
  .then((defaultOrg) => {
    // Verify the user is NOT part of the default org
    chai.expect(defaultOrg.permissions).to.not.include.keys(userData.username);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the User Controller can delete multiple users.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteUsers(done) {
  const userDataObjects = [
    testData.users[1],
    testData.users[2],
    testData.users[3]
  ];

  // Create list of usernames to delete
  const usernames = userDataObjects.map(u => u.username);

  // Delete users via controller
  UserController.remove(adminUser, usernames)
  .then((deletedUsers) => {
    // Expect deletedUsers not to be empty
    chai.expect(deletedUsers.length).to.equal(userDataObjects.length);

    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      // Verify correct user deleted
      chai.expect(deletedUsers).to.include(userDataObject.username);
    });

    // Attempt to find the deleted users
    return UserController.find(adminUser, usernames, { archived: true });
  })
  .then((foundUsers) => {
    // Expect foundUsers array to be empty
    chai.expect(foundUsers.length).to.equal(0);

    // Find the default org
    return Organization.findOne({ _id: M.config.server.defaultOrganizationId });
  })
  .then((defaultOrg) => {
    // Verify the users are NOT part of the default org
    chai.expect(defaultOrg.permissions).to.not.include.keys(usernames);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
