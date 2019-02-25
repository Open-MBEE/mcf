/**
 * Classification: UNCLASSIFIED
 *
 * @module test.401a-user-controller-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests the user controller functionality: create,
 * delete, update, and find users.
 */

// NPM modules
const chai = require('chai');
const path = require('path');

// MBEE modules
const UserController = M.require('controllers.user-controller');
const Organization = M.require('models.organization');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
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
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: Delete admin user.
   */
  after((done) => {
    // Removing admin user
    testUtils.removeTestAdmin()
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  it('should create a user', createUser);
  it('should create multiple users', createUsers);
  it('should find a user', findUser);
  it('should find multiple users', findUsers);
  it('should find all users', findAllUsers);
  it('should update a user', updateUser);
  it('should update multiple users', updateUsers);
  it('should update a users password', updateUserPassword);
  it('should delete a user', deleteUser);
  it('should delete multiple users', deleteUsers);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a user using the user controller
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
    chai.expect(createdUser.username).to.equal(userData.username);
    chai.expect(createdUser.preferredName).to.equal(userData.preferredName);
    chai.expect(createdUser.fname).to.equal(userData.fname);
    chai.expect(createdUser.lname).to.equal(userData.lname);
    chai.expect(createdUser.admin).to.equal(userData.admin);
    chai.expect(createdUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(createdUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(createdUser.createdBy).to.equal(adminUser.username);
    chai.expect(createdUser.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Creates multiple users using the user controller
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
    const jmi2Users = utils.convertJMI(1, 2, createdUsers);
    // Loops through each user data object
    userDataObjects.forEach((userDataObject) => {
      const createdUser = jmi2Users[userDataObject.username];

      // Verify user created properly
      chai.expect(createdUser._id).to.equal(userDataObject.username);
      chai.expect(createdUser.username).to.equal(userDataObject.username);
      chai.expect(createdUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(createdUser.fname).to.equal(userDataObject.fname);
      chai.expect(createdUser.lname).to.equal(userDataObject.lname);
      chai.expect(createdUser.admin).to.equal(userDataObject.admin);
      chai.expect(createdUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(createdUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(createdUser.createdBy).to.equal(adminUser.username);
      chai.expect(createdUser.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Finds a user using the user controller
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
    chai.expect(foundUser.username).to.equal(userData.username);
    chai.expect(foundUser.preferredName).to.equal(userData.preferredName);
    chai.expect(foundUser.fname).to.equal(userData.fname);
    chai.expect(foundUser.lname).to.equal(userData.lname);
    chai.expect(foundUser.admin).to.equal(userData.admin);
    chai.expect(foundUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(foundUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(foundUser.createdBy).to.equal(adminUser.username);
    chai.expect(foundUser.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Finds multiple users using the user controller
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
    const jmi2Users = utils.convertJMI(1, 2, foundUsers);
    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];

      // Verify user created properly
      chai.expect(foundUser._id).to.equal(userDataObject.username);
      chai.expect(foundUser.username).to.equal(userDataObject.username);
      chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
      chai.expect(foundUser.fname).to.equal(userDataObject.fname);
      chai.expect(foundUser.lname).to.equal(userDataObject.lname);
      chai.expect(foundUser.admin).to.equal(userDataObject.admin);
      chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(foundUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(foundUser.createdBy).to.equal(adminUser.username);
      chai.expect(foundUser.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Finds all users in the database using the user controller
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
    const jmi2Users = utils.convertJMI(1, 2, foundUsers);
    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      const foundUser = jmi2Users[userDataObject.username];
      // Ensure user was found
      chai.expect(foundUser).to.not.equal(undefined);

      if (foundUser.username !== adminUser.username) {
        // Verify user created properly
        chai.expect(foundUser._id).to.equal(userDataObject.username);
        chai.expect(foundUser.username).to.equal(userDataObject.username);
        chai.expect(foundUser.preferredName).to.equal(userDataObject.preferredName);
        chai.expect(foundUser.fname).to.equal(userDataObject.fname);
        chai.expect(foundUser.lname).to.equal(userDataObject.lname);
        chai.expect(foundUser.admin).to.equal(userDataObject.admin);
        chai.expect(foundUser.custom).to.deep.equal(userDataObject.custom);

        // Expect the password to be hashed
        chai.expect(foundUser.password).to.not.equal(userDataObject.password);

        // Verify additional properties
        chai.expect(foundUser.createdBy).to.equal(adminUser.username);
        chai.expect(foundUser.lastModifiedBy).to.equal(adminUser.username);
        chai.expect(foundUser.archivedBy).to.equal(null);
        chai.expect(foundUser.createdOn).to.not.equal(null);
        chai.expect(foundUser.updatedOn).to.not.equal(null);
        chai.expect(foundUser.archivedOn).to.equal(null);
      }
      // Admin user special cases
      else {
        chai.expect(foundUser._id).to.equal(userDataObject.username);
        chai.expect(foundUser.username).to.equal(userDataObject.username);
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
 * @description Updates a user using the user controller
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
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.preferredName).to.equal(updateObj.preferredName);
    chai.expect(updatedUser.fname).to.equal(userData.fname);
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(updatedUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(updatedUser.createdBy).to.equal(adminUser.username);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Updates multiple users using the user controller
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
    const jmi2Users = utils.convertJMI(1, 2, updatedUsers);
    // Loop through each user data object
    userDataObjects.forEach((userDataObject) => {
      const updatedUser = jmi2Users[userDataObject.username];

      // Verify user updated properly
      chai.expect(updatedUser._id).to.equal(userDataObject.username);
      chai.expect(updatedUser.username).to.equal(userDataObject.username);
      chai.expect(updatedUser.preferredName).to.equal('Name Updated');
      chai.expect(updatedUser.fname).to.equal(userDataObject.fname);
      chai.expect(updatedUser.lname).to.equal(userDataObject.lname);
      chai.expect(updatedUser.admin).to.equal(userDataObject.admin);
      chai.expect(updatedUser.custom).to.deep.equal(userDataObject.custom);

      // Expect the password to be hashed
      chai.expect(updatedUser.password).to.not.equal(userDataObject.password);

      // Verify additional properties
      chai.expect(updatedUser.createdBy).to.equal(adminUser.username);
      chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Updates a users password using the user controller.
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
    return UserController.updatePassword(foundUser, userData.password, newPassword, newPassword);
  })
  .then((updatedUser) => {
    // Verify user updated properly
    chai.expect(updatedUser._id).to.equal(userData.username);
    chai.expect(updatedUser.username).to.equal(userData.username);
    chai.expect(updatedUser.preferredName).to.equal('Name Updated');
    chai.expect(updatedUser.fname).to.equal(userData.fname);
    chai.expect(updatedUser.lname).to.equal(userData.lname);
    chai.expect(updatedUser.admin).to.equal(userData.admin);
    chai.expect(updatedUser.custom).to.deep.equal(userData.custom);

    // Expect the password to be hashed
    chai.expect(updatedUser.password).to.not.equal(userData.password);

    // Verify additional properties
    chai.expect(updatedUser.createdBy).to.equal(adminUser.username);
    chai.expect(updatedUser.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(updatedUser.archivedBy).to.equal(null);
    chai.expect(updatedUser.createdOn).to.not.equal(null);
    chai.expect(updatedUser.updatedOn).to.not.equal(null);
    chai.expect(updatedUser.archivedOn).to.equal(null);

    // Verify the new password is correct
    return updatedUser.verifyPassword(newPassword);
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
 * @description Deletes a user using the user controller
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
 * @description Deletes multiple users using the user controller
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
