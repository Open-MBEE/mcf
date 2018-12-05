/**
 * Classification: UNCLASSIFIED
 *
 * @module  test.test-utils.js
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Helper functions for test framework to make tests easier to
 * read and maintain. Used to create users, organizations, projects, elements
 * in the database. Assumes database connection already established
 *
 */
// Node modules
const path = require('path');

// MBEE modules
const Organization = M.require('models.organization');
const User = M.require('models.user');
const OrgController = M.require('controllers.organization-controller');
const testData = require(path.join(M.root, 'test', 'data.json'));
delete require.cache[require.resolve(path.join(M.root, 'test', 'data.json'))];
/**
 * @description Helper function to create test non-admin user in
 * MBEE tests.
 */
module.exports.createNonadminUser = function() {
  return new Promise((resolve, reject) => {
    // Define new user
    let newUser = null;

    // Check any admin exist
    User.findOne({ username: testData.users[1].username })
    .then((foundUser) => {
      // Check user found
      if (foundUser !== null) {
        // User found, return it
        return resolve(foundUser);
      }

      // Create user
      const user = new User({
        username: testData.users[1].username,
        password: testData.users[1].password,
        fname: testData.users[1].fname,
        lname: testData.users[1].lname,
        admin: false
      });

      // Save user object to the database
      return user.save();
    })
    .then((user) => {
      // Set new user
      newUser = user;

      // Find the default organization
      return Organization.find({ id: M.config.server.defaultOrganizationId });
    })
    .then((orgs) => {
      // Add user to default org read/write permissions
      orgs[0].permissions.read.push(newUser._id.toString());
      orgs[0].permissions.write.push(newUser._id.toString());

      // Save the updated org
      return orgs[0].save();
    })
    .then(() => resolve(newUser))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to create test admin user in
 * MBEE tests.
 */
module.exports.createAdminUser = function() {
  return new Promise((resolve, reject) => {
    // Define new user
    let newAdminUser = null;

    // Check any admin exist
    User.findOne({ username: testData.users[0].adminUsername })
    .then((foundUser) => {
      // Check user found
      if (foundUser !== null) {
        // User found, return it
        return resolve(foundUser);
      }

      // Create user
      const user = new User({
        username: testData.users[0].adminUsername,
        password: testData.users[0].adminPassword,
        provider: 'local',
        admin: true
      });

      // Save user object to the database
      return user.save();
    })
    .then((user) => {
      // Set new admin user
      newAdminUser = user;

      // Find the default organization
      return Organization.find({ id: M.config.server.defaultOrganizationId });
    })
    .then((orgs) => {
      // Add user to default org read/write permissions
      orgs[0].permissions.read.push(newAdminUser._id.toString());
      orgs[0].permissions.write.push(newAdminUser._id.toString());

      // Save the updated org
      return orgs[0].save();
    })
    .then(() => resolve(newAdminUser))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to delete test user in
 * MBEE tests.
 */
module.exports.removeNonadminUser = function() {
  return new Promise((resolve, reject) => {
    // Define user id
    let userToDelete = null;

    // Find admin user
    User.findOne({ username: testData.users[1].username })
    .then((foundUser) => {
      // Save user and remove user
      userToDelete = foundUser;
      return foundUser.remove();
    })
    .then(() => Organization.find({ id: M.config.server.defaultOrganizationId }))
    .then((orgs) => {
      // Remove user from permissions list in each project
      orgs[0].permissions.read = orgs[0].permissions.read
      .filter(user => user._id.toString() !== userToDelete._id.toString());
      orgs[0].permissions.write = orgs[0].permissions.write
      .filter(user => user._id.toString() !== userToDelete._id.toString());
      return orgs[0].save();
    })
    .then(() => resolve(userToDelete.username))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to delete test admin user in
 * MBEE tests.
 */
module.exports.removeAdminUser = function() {
  return new Promise((resolve, reject) => {
    // Define user id
    let userToDelete = null;

    // Find admin user
    User.findOne({ username: testData.users[0].adminUsername })
    .then((foundUser) => {
      // Save user and remove user
      userToDelete = foundUser;
      return foundUser.remove();
    })
    .then(() => Organization.find({ id: M.config.server.defaultOrganizationId }))
    .then((orgs) => {
      // Remove user from permissions list in each project
      orgs[0].permissions.read = orgs[0].permissions.read
      .filter(user => user._id.toString() !== userToDelete._id.toString());
      orgs[0].permissions.write = orgs[0].permissions.write
      .filter(user => user._id.toString() !== userToDelete._id.toString());
      return orgs[0].save();
    })
    .then(() => resolve(userToDelete.username))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to create organization in
 * MBEE tests.
 */
module.exports.createOrganization = function(adminUser) {
  return new Promise((resolve, reject) => {
    // Create the new organization
    const newOrg = new Organization({
      id: testData.orgs[0].id,
      name: testData.orgs[0].name,
      permissions: {
        admin: [adminUser._id],
        write: [adminUser._id],
        read: [adminUser._id]
      },
      custom: null,
      visibility: 'private'
    });
    newOrg.save()
    .then((_newOrg) => resolve(_newOrg))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to remove organization in
 * MBEE tests.
 */
module.exports.removeOrganization = function(adminUser) {
  return new Promise((resolve, reject) => {
    // Find organization to ensure it exists
    OrgController.removeOrg(adminUser, testData.orgs[0].id, true)
    .then((org) => resolve(org))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to import a copy of test data
 */
module.exports.importTestData = function() {
  // Clear require cache so a new copy is imported
  delete require.cache[require.resolve(path.join(M.root, 'test', 'data.json'))];
  // Import a copy of the data.json
  // eslint-disable-next-line global-require
  const testDataFresh = require(path.join(M.root, 'test', 'data.json'));
  // Return a newly assigned copy of the fresh data
  return Object.assign({}, testDataFresh);
};
