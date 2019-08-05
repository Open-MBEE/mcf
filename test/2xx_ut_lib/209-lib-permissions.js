/**
 * Classification: UNCLASSIFIED
 *
 * @module test.209-lib-permissions
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests the permissions library functions.
 */

// Node modules
const chai = require('chai');

// MBEE Modules
const can = M.require('lib.permissions');

/* --------------------( Test Data )-------------------- */
// Simulated test objects used across test functions
const users = [{
  username: 'test1',
  admin: true
}, {
  username: 'test2',
  admin: false
}, {
  username: 'test3',
  admin: false
}];

const orgs = [{
  permissions: {
    test1: ['read', 'write', 'admin']
  }
}, {
  permissions: {
    test1: ['read', 'write', 'admin'],
    test2: ['read', 'write', 'admin'],
    test3: ['read']
  }
}];

const projects = [{
  permissions: {
    test1: ['read', 'write', 'admin']
  },
  visibility: 'private'
}, {
  permissions: {
    test1: ['read', 'write', 'admin'],
    test2: ['read', 'write', 'admin'],
    test3: ['read']
  },
  visibility: 'private'
}, {
  permissions: {
    test1: ['read', 'write', 'admin'],
    test2: ['read', 'write', 'admin']
  },
  visibility: 'internal'
}];

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should allow admins to do anything', verifyAdminPermissions);
  it('should handle user org permissions', verifyOrgPermissions);
  it('should handle user project permissions', verifyProjectPermissions);
  it('should handle user element permissions', verifyElementPermissions);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Checks that admins can perform all expected actions.
 */
function verifyAdminPermissions(done) {
  // Test data
  const user = users[0];
  const org = orgs[0];
  const project = projects[0];

  // Org actions
  chai.expect(can.createOrg(user)).to.equal(true);
  chai.expect(can.readOrg(user, org)).to.equal(true);
  chai.expect(can.updateOrg(user, org)).to.equal(true);
  chai.expect(can.deleteOrg(user)).to.equal(true);

  // Project actions
  chai.expect(can.createProject(user, org)).to.equal(true);
  chai.expect(can.readProject(user, org, project)).to.equal(true);
  chai.expect(can.updateProject(user, org, project)).to.equal(true);
  chai.expect(can.deleteProject(user, org)).to.equal(true);

  // Element actions
  chai.expect(can.createElement(user, org, project)).to.equal(true);
  chai.expect(can.readElement(user, org, project)).to.equal(true);
  chai.expect(can.updateElement(user, org, project)).to.equal(true);
  chai.expect(can.deleteElement(user, org, project)).to.equal(true);

  // User actions
  chai.expect(can.createUser(user)).to.equal(true);
  chai.expect(can.readUser(user)).to.equal(true);
  chai.expect(can.updateUser(user)).to.equal(true);
  chai.expect(can.deleteUser(user)).to.equal(true);

  // Test is done
  done();
}

/**
 * @description Checks that org permissions are handled as expected
 */
function verifyOrgPermissions(done) {
  // Test data
  const user1 = users[1];
  const user2 = users[2];
  const org1 = orgs[1];
  const org2 = orgs[0];

  // User 1 (admin on org1) permissions checks
  chai.expect(can.createOrg(user1)).to.equal(false);
  chai.expect(can.readOrg(user1, org1)).to.equal(true);
  chai.expect(can.updateOrg(user1, org1)).to.equal(true);
  chai.expect(can.deleteOrg(user1)).to.equal(false);

  // User 2 (read access to org1)
  chai.expect(can.readOrg(user2, org1)).to.equal(true);
  chai.expect(can.updateOrg(user2, org1)).to.equal(false);
  chai.expect(can.deleteOrg(user2)).to.equal(false);

  // User 2 (no access to org2)
  chai.expect(can.readOrg(user2, org2)).to.equal(false);
  chai.expect(can.updateOrg(user2, org2)).to.equal(false);

  // Test is done
  done();
}

/**
 * @description Checks that project permissions are handled as expected.
 */
function verifyProjectPermissions(done) {
  // Test data
  const org = orgs[1];
  const project0 = projects[0];
  const project1 = projects[1];
  const project2 = projects[2];
  const user1 = users[1];
  const user2 = users[2];

  // Check users can't view projects they're no supposed to
  chai.expect(can.readProject(user1, org, project0)).to.equal(false);
  chai.expect(can.updateProject(user1, org, project0)).to.equal(false);

  // Checking users' permissions on project 1
  chai.expect(can.readProject(user1, org, project1)).to.equal(true);
  chai.expect(can.readProject(user2, org, project1)).to.equal(true);
  chai.expect(can.updateProject(user1, org, project1)).to.equal(true);
  chai.expect(can.updateProject(user2, org, project1)).to.equal(false);

  // Checking users' permission on project 2
  chai.expect(can.readProject(user1, org, project2)).to.equal(true);
  chai.expect(can.readProject(user2, org, project2)).to.equal(true);
  chai.expect(can.updateProject(user1, org, project2)).to.equal(true);
  chai.expect(can.updateProject(user2, org, project2)).to.equal(false);

  // Test is done
  done();
}

/**
 * @description Checks that admins can perform all expected actions.
 */
function verifyElementPermissions(done) {
  // Test data
  const org = orgs[1];
  const project0 = projects[0];
  const project1 = projects[1];
  const project2 = projects[2];
  const user1 = users[1];
  const user2 = users[2];

  // Check users can't view projects they're no supposed to
  chai.expect(can.readElement(user1, org, project0)).to.equal(false);
  chai.expect(can.updateElement(user1, org, project0)).to.equal(false);

  // Checking users' permissions on project 1
  chai.expect(can.readElement(user1, org, project1)).to.equal(true);
  chai.expect(can.readElement(user2, org, project1)).to.equal(true);
  chai.expect(can.updateElement(user1, org, project1)).to.equal(true);
  chai.expect(can.updateElement(user2, org, project1)).to.equal(false);

  // Checking users' permission on project 2
  chai.expect(can.readElement(user1, org, project2)).to.equal(true);
  chai.expect(can.readElement(user2, org, project2)).to.equal(true);
  chai.expect(can.updateElement(user1, org, project2)).to.equal(true);
  chai.expect(can.updateElement(user2, org, project2)).to.equal(false);

  // Test is done
  done();
}
