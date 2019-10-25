/**
 * @classification UNCLASSIFIED
 *
 * @module test.209-lib-permissions
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author James Eckstein
 * @author Josh Kaplan
 *
 * @description Tests the permissions library functions.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const can = M.require('lib.permissions');

/* --------------------( Test Data )-------------------- */
// Simulated test objects used across test functions
const users = [{
  _id: 'test1',
  admin: true
}, {
  _id: 'test2',
  admin: false
}, {
  _id: 'test3',
  admin: false
}];

const orgs = [{
  _id: 'org1',
  permissions: {
    test1: ['read', 'write', 'admin']
  }
}, {
  _id: 'org2',
  permissions: {
    test1: ['read', 'write', 'admin'],
    test2: ['read', 'write', 'admin'],
    test3: ['read']
  }
}];

const projects = [{
  _id: 'project1',
  permissions: {
    test1: ['read', 'write', 'admin']
  },
  visibility: 'private'
}, {
  _id: 'project2',
  permissions: {
    test1: ['read', 'write', 'admin'],
    test2: ['read', 'write', 'admin'],
    test3: ['read']
  },
  visibility: 'private'
}, {
  _id: 'project3',
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
  it('should handle user branch permissions', verifyBranchPermissions);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Checks that admins can perform all expected actions.
 */
async function verifyAdminPermissions() {
  // Test data
  const user = users[0];
  const org = orgs[0];
  const project = projects[0];

  // Org actions
  chai.expect(can.createOrg.bind(can, user)).to.not.throw(M.PermissionError);
  chai.expect(can.readOrg.bind(can, user, org)).to.not.throw(M.PermissionError);
  chai.expect(can.updateOrg.bind(can, user, org)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteOrg.bind(can, user)).to.not.throw(M.PermissionError);

  // Project actions
  chai.expect(can.createProject.bind(can, user, org)).to.not.throw(M.PermissionError);
  chai.expect(can.readProject.bind(can, user, org, project)).to.not.throw(M.PermissionError);
  chai.expect(can.updateProject.bind(can, user, org, project)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteProject.bind(can, user, org)).to.not.throw(M.PermissionError);

  // Element actions
  chai.expect(can.createElement.bind(can, user, org, project)).to.not.throw(M.PermissionError);
  chai.expect(can.readElement.bind(can, user, org, project)).to.not.throw(M.PermissionError);
  chai.expect(can.updateElement.bind(can, user, org, project)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteElement.bind(can, user, org, project)).to.not.throw(M.PermissionError);

  // User actions
  chai.expect(can.createUser.bind(can, user)).to.not.throw(M.PermissionError);
  chai.expect(can.readUser.bind(can, user)).to.not.throw(M.PermissionError);
  chai.expect(can.updateUser.bind(can, user)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteUser.bind(can, user)).to.not.throw(M.PermissionError);
}

/**
 * @description Checks that org permissions are handled as expected.
 */
async function verifyOrgPermissions() {
  // Test data
  const user1 = users[1];
  const user2 = users[2];
  const org1 = orgs[1];
  const org2 = orgs[0];

  // User 1 (admin on org1) permissions checks
  chai.expect(can.createOrg.bind(can, user1)).to.throw(M.PermissionError);
  chai.expect(can.readOrg.bind(can, user1, org1)).to.not.throw(M.PermissionError);
  chai.expect(can.updateOrg.bind(can, user1, org1)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteOrg.bind(can, user1)).to.throw(M.PermissionError);

  // User 2 (read access to org1)
  chai.expect(can.readOrg.bind(can, user2, org1)).to.not.throw(M.PermissionError);
  chai.expect(can.updateOrg.bind(can, user2, org1)).to.throw(M.PermissionError);
  chai.expect(can.deleteOrg.bind(can, user2)).to.throw(M.PermissionError);

  // User 2 (no access to org2)
  chai.expect(can.readOrg.bind(can, user2, org2)).to.throw(M.PermissionError);
  chai.expect(can.updateOrg.bind(can, user2, org2)).to.throw(M.PermissionError);
}

/**
 * @description Checks that project permissions are handled as expected.
 */
async function verifyProjectPermissions() {
  // Test data
  const org = orgs[1];
  const project0 = projects[0];
  const project1 = projects[1];
  const project2 = projects[2];
  const user1 = users[1];
  const user2 = users[2];

  // Check users can't view projects they're not supposed to
  chai.expect(can.readProject.bind(can, user1, org, project0)).to.throw(M.PermissionError);
  chai.expect(can.updateProject.bind(can, user1, org, project0)).to.throw(M.PermissionError);

  // Checking users' permissions on project 1
  chai.expect(can.readProject.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.createProject.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.updateProject.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteProject.bind(can, user1, org, project1)).to.throw(M.PermissionError);

  // Checking users' permission on project 2
  chai.expect(can.readProject.bind(can, user2, org, project2)).to.not.throw(M.PermissionError);
  chai.expect(can.createProject.bind(can, user2, org, project2)).to.throw(M.PermissionError);
  chai.expect(can.updateProject.bind(can, user2, org, project2)).to.throw(M.PermissionError);
  chai.expect(can.deleteProject.bind(can, user2, org, project2)).to.throw(M.PermissionError);
}

/**
 * @description Checks that element permissions are handled as expected.
 */
async function verifyElementPermissions() {
  // Test data
  const org = orgs[1];
  const project0 = projects[0];
  const project1 = projects[1];
  const project2 = projects[2];
  const user1 = users[1];
  const user2 = users[2];

  // Check users can't view project elements they're not supposed to
  chai.expect(can.readElement.bind(can, user1, org, project0)).to.throw(M.PermissionError);
  chai.expect(can.updateElement.bind(can, user1, org, project0)).to.throw(M.PermissionError);

  // Checking users' permissions on project 1
  chai.expect(can.readElement.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.createElement.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.updateElement.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteElement.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);

  // Checking users' permission on project 2
  chai.expect(can.readElement.bind(can, user2, org, project2)).to.not.throw(M.PermissionError);
  chai.expect(can.createElement.bind(can, user2, org, project2)).to.throw(M.PermissionError);
  chai.expect(can.updateElement.bind(can, user2, org, project2)).to.throw(M.PermissionError);
  chai.expect(can.deleteElement.bind(can, user2, org, project2)).to.throw(M.PermissionError);
}

/**
 * @description Checks that branch permissions are handled as expected.
 */
async function verifyBranchPermissions() {
  // Test data
  const org = orgs[1];
  const project0 = projects[0];
  const project1 = projects[1];
  const project2 = projects[2];
  const user1 = users[1];
  const user2 = users[2];

  // Check users can't view branches they're not supposed to
  chai.expect(can.readBranch.bind(can, user1, org, project0)).to.throw(M.PermissionError);
  chai.expect(can.updateBranch.bind(can, user1, org, project0)).to.throw(M.PermissionError);

  // Checking users' permissions on project 1
  chai.expect(can.readBranch.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.createBranch.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.updateBranch.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);
  chai.expect(can.deleteBranch.bind(can, user1, org, project1)).to.not.throw(M.PermissionError);

  // Checking users' permission on project 2
  chai.expect(can.readBranch.bind(can, user2, org, project2)).to.not.throw(M.PermissionError);
  chai.expect(can.createBranch.bind(can, user2, org, project2)).to.throw(M.PermissionError);
  chai.expect(can.updateBranch.bind(can, user2, org, project2)).to.throw(M.PermissionError);
  chai.expect(can.deleteBranch.bind(can, user2, org, project2)).to.throw(M.PermissionError);
}
