/**
 * @classification UNCLASSIFIED
 *
 * @module lib.permissions
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author James Eckstein
 * @author Phillip Lee
 *
 * @description Provides permission lookup capabilities for MBEE actions.
 */

// Node modules
const assert = require('assert');

// MBEE modules
const utils = M.require('lib.utils');

module.exports = {
  createElement,
  createOrg,
  createProject,
  createUser,
  createBranch,
  createArtifact,
  createBlob,
  createWebhook,
  deleteElement,
  deleteOrg,
  deleteProject,
  deleteUser,
  deleteBranch,
  deleteArtifact,
  deleteBlob,
  deleteWebhook,
  readElement,
  readOrg,
  readProject,
  readUser,
  readBranch,
  readArtifact,
  readBlob,
  readWebhook,
  updateElement,
  updateOrg,
  updateProject,
  updateUser,
  updateBranch,
  updateArtifact,
  updateWebhook,
  getLogs,
  listBlobs
};

/**
 * @description Verifies if user has permission to create users.
 *
 * @param {User} user - The user object to check permissions for.
 *
 * @throws {PermissionError}
 */
function createUser(user) {
  if (!user.admin) {
    throw new M.PermissionError('User does not have permission to create users.', 'warn');
  }
}

/**
 * @description Verifies if user has permission to read other user objects.
 *
 * @param {User} user - The user object to check permissions for.
 */
function readUser(user) {}

/**
 * @description Verifies if user has permission to update users.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {User} userToUpdate - The user object to updated.
 *
 * @throws {PermissionError}
 */
function updateUser(user, userToUpdate) {
  try {
    assert.ok(user.admin || user._id === userToUpdate._id, '');
  }
  catch (error) {
    throw new M.PermissionError('User does not have permission to update other users.', 'warn');
  }
}

/**
 * @description Verifies if user has permission to delete users.
 *
 * @param {User} user - The user object to check permissions for.
 *
 * @throws {PermissionError}
 */
function deleteUser(user) {
  if (!user.admin) {
    throw new M.PermissionError('User does not have permission to delete users.', 'warn');
  }
}

/**
 * @description Verifies if user has permission to create an organization.
 *
 * @param {User} user - The user object to check permissions for.
 *
 * @throws {PermissionError}
 */
function createOrg(user) {
  if (!user.admin) {
    throw new M.PermissionError('User does not have permission to create orgs.', 'warn');
  }
}

/**
 * @description Verifies if user has permission to read the organization.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object to read.
 *
 * @throws {PermissionError}
 */
function readOrg(user, org) {
  try {
    assert.ok(user.admin || org.permissions.hasOwnProperty(user._id), '');
  }
  catch (error) {
    throw new M.PermissionError(`User does not have permission to find the org [${org._id}].`, 'warn');
  }
}

/**
 * @description Verifies user has permission to update organization object.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object to update.
 *
 * @throws {PermissionError}
 */
function updateOrg(user, org) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id), '');
      assert.ok(org.permissions[user._id].includes('admin'), '');
    }
  }
  catch (error) {
    throw new M.PermissionError(`User does not have permission to update the org [${org._id}].`, 'warn');
  }
}

/**
 * @description Verifies if user has permission to delete the organization
 * object.
 *
 * @param {User} user - The user object to check permissions for.
 *
 * @throws {PermissionError}
 */
function deleteOrg(user) {
  if (!user.admin) {
    throw new M.PermissionError('User does not have permission to delete orgs.', 'warn');
  }
}

/**
 * @description Verifies if user has permission to create a project within the
 * org.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 *
 * @throws {PermissionError}
 */
function createProject(user, org) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id), '');
      assert.ok(org.permissions[user._id].includes('write'), '');
    }
  }
  catch (error) {
    throw new M.PermissionError('User does not have permission to create'
      + ` projects in the org [${org._id}].`, 'warn');
  }
}

/**
 * @description Verifies if user has permission to read the project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to read.
 *
 * @throws {PermissionError}
 */
function readProject(user, org, project) {
  try {
    if (!user.admin) {
      if (project.visibility === 'internal') {
        // User only needs read permissions on the org to read the project.
        assert.ok(org.permissions.hasOwnProperty(user._id), 'User does not have'
          + ` permission to find projects in the org [${org._id}].`);
      }
      else if (project.visibility === 'private') {
        // User must have read permissions on project.
        assert.ok(project.permissions.hasOwnProperty(user._id), 'User does not '
          + `have permission to find the project [${utils.parseID(project._id).pop()}].`);
      }
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies if user has permission to update project object.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to update.
 *
 * @throws {PermissionError}
 */
function updateProject(user, org, project) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to update projects in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id), 'User does not '
        + `have permission to update the project [${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('admin'), 'User does not'
        + `have permission to update the project [${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies if user has permission to delete the project object.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to delete.
 *
 * @throws {PermissionError}
 */
function deleteProject(user, org, project) {
  if (!user.admin) {
    throw new M.PermissionError('User does not have permissions to delete projects.', 'warn');
  }
}

/**
 * @description Verify if user has permission to create elements in the project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to add elements to.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function createElement(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to create items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to create items in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to create items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to read elements in the
 * project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the elements.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function readElement(user, org, project, branch) {
  try {
    if (!user.admin) {
      // User needs read permission of the org, regardless of the project visibility
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to find items in the org [${org._id}].`);

      if (project.visibility === 'private') {
        assert.ok(project.permissions.hasOwnProperty(user._id),
          'User does not have permission to find items in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      }
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to update element objects.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the elements.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function updateElement(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to update items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to update items in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to update items in the project '
          + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to delete elements.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the elements.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function deleteElement(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to delete items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to delete items in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to delete items in the project '
          + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to create branches in the project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to add branches to.
 *
 * @throws {PermissionError}
 */
function createBranch(user, org, project) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to create branches in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to create branches in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to create branches in the project '
          + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to read branches in the project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the branch.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function readBranch(user, org, project, branch) {
  try {
    if (!user.admin) {
      // User needs read permission of the org, regardless of the project visibility
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to find branches in the org [${org._id}].`);

      if (project.visibility === 'private') {
        assert.ok(project.permissions.hasOwnProperty(user._id),
          'User does not have permission to find branches in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      }
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to update project branches.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the branch.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function updateBranch(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to update branches in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to update branches in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to update branches in the project '
      + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to delete the project branches.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the elements.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function deleteBranch(user, org, project, branch) {
  // Admin's can delete branches
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to delete branches in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to delete branches in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to delete branches in the project '
      + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}


/**
 * @description Verify if user has permission to create artifacts in the
 * project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to add artifacts to.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function createArtifact(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to create items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to create items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to create items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to read artifacts in the
 * project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the artifacts.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function readArtifact(user, org, project, branch) {
  try {
    if (!user.admin) {
      // User needs read permission of the org, regardless of the project visibility
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to find items in the org [${org._id}].`);

      if (project.visibility === 'private') {
        assert.ok(project.permissions.hasOwnProperty(user._id),
          'User does not have permission to get artifacts in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      }
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to update project artifact
 * objects.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the artifacts.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function updateArtifact(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to update items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to update items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to update items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to delete the project artifacts.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the artifacts.
 * @param {Branch} branch - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function deleteArtifact(user, org, project, branch) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to delete items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to delete items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to delete items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to create artifact blob in the
 * project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project to add artifact blob to.
 *
 * @throws {PermissionError}
 */
function createBlob(user, org, project) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to create items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to create items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to create items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to read blob in the project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the artifact blob.
 *
 * @throws {PermissionError}
 */
function readBlob(user, org, project) {
  try {
    if (!user.admin) {
      // User needs read permission of the org, regardless of the project visibility
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to find items in the org [${org._id}].`);

      if (project.visibility === 'private') {
        assert.ok(project.permissions.hasOwnProperty(user._id),
          'User does not have permission to get artifacts in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      }
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to delete the artifact blob.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the artifact blob.
 *
 * @throws {PermissionError}
 */
function deleteBlob(user, org, project) {
  try {
    if (!user.admin) {
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to delete items in the org [${org._id}].`);
      assert.ok(project.permissions.hasOwnProperty(user._id),
        'User does not have permission to delete items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
      assert.ok(project.permissions[user._id].includes('write'),
        'User does not have permission to delete items in the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verify if user has permission to list blobs in the project.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} org - The org object containing the project.
 * @param {Project} project - The project containing the artifact blob.
 *
 * @throws {PermissionError}
 */
function listBlobs(user, org, project) {
  try {
    if (!user.admin) {
      // User needs read permission of the org, regardless of the project visibility
      assert.ok(org.permissions.hasOwnProperty(user._id),
        `User does not have permission to find items in the org [${org._id}].`);

      if (project.visibility === 'private') {
        assert.ok(project.permissions.hasOwnProperty(user._id),
          'User does not have permission to get artifacts in the project '
          + `[${utils.parseID(project._id).pop()}].`);
      }
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies that the user has permission to create webhooks.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} [org=null] - The org object to check permissions on.
 * @param {Project} [project=null] - The project object to check permissions on.
 * @param {Branch} [branch=null] - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function createWebhook(user, org = null, project = null, branch = null) {
  try {
    if (project) {
      assert.ok(user.admin || (project.permissions.hasOwnProperty(user._id)
        && project.permissions[user._id].includes('admin')),
      'User does not have permission to create webhooks on the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
    else if (org) {
      assert.ok(user.admin || (org.permissions.hasOwnProperty(user._id)
        && org.permissions[user._id].includes('admin')),
      `User does not have permission to create webhooks on the org [${org._id}].`);
    }
    else {
      assert.ok(user.admin,
        'User does not have permission to create server level webhooks.');
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies that the user has permission to read webhooks.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} [org=null] - The org object to check permissions on.
 * @param {Project} [project=null] - The project object to check permissions on.
 * @param {Branch} [branch=null] - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function readWebhook(user, org = null, project = null, branch = null) {
  try {
    if (project) {
      assert.ok(user.admin || (project.permissions.hasOwnProperty(user._id)
        && project.permissions[user._id].includes('admin')),
      'User does not have permission to read webhooks on the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
    else if (org) {
      assert.ok(user.admin || (org.permissions.hasOwnProperty(user._id)
        && org.permissions[user._id].includes('admin')),
      `User does not have permission to read webhooks on the org [${org._id}].`);
    }
    else {
      assert.ok(user.admin,
        'User does not have permission to read server level webhooks.');
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies that the user has permission to update webhooks.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} [org=null] - The org object to check permissions on.
 * @param {Project} [project=null] - The project object to check permissions on.
 * @param {Branch} [branch=null] - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function updateWebhook(user, org = null, project = null, branch = null) {
  try {
    if (project) {
      assert.ok(user.admin || (project.permissions.hasOwnProperty(user._id)
        && project.permissions[user._id].includes('admin')),
      'User does not have permission to update webhooks on the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
    else if (org) {
      assert.ok(user.admin || (org.permissions.hasOwnProperty(user._id)
        && org.permissions[user._id].includes('admin')),
      `User does not have permission to update webhooks on the org [${org._id}].`);
    }
    else {
      assert.ok(user.admin,
        'User does not have permission to update server level webhooks.');
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies that the user has permission to delete webhooks.
 *
 * @param {User} user - The user object to check permissions for.
 * @param {Organization} [org=null] - The org object to check permissions on.
 * @param {Project} [project=null] - The project object to check permissions on.
 * @param {Branch} [branch=null] - Parameter currently unused.
 *
 * @throws {PermissionError}
 */
function deleteWebhook(user, org = null, project = null, branch = null) {
  try {
    if (project) {
      assert.ok(user.admin || (project.permissions.hasOwnProperty(user._id)
        && project.permissions[user._id].includes('admin')),
      'User does not have permission to delete webhooks on the project '
        + `[${utils.parseID(project._id).pop()}].`);
    }
    else if (org) {
      assert.ok(user.admin || (org.permissions.hasOwnProperty(user._id)
        && org.permissions[user._id].includes('admin')),
      `User does not have permission to delete webhooks on the org [${org._id}].`);
    }
    else {
      assert.ok(user.admin,
        'User does not have permission to delete server level webhooks.');
    }
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}

/**
 * @description Verifies that the user has permission to view system logs.
 *
 * @param {User} user - The user object to check permissions for.
 *
 * @throws {PermissionError}
 */
function getLogs(user) {
  try {
    assert.ok(user.admin, 'User does not have permission to view system logs.');
  }
  catch (error) {
    throw new M.PermissionError(error.message, 'warn');
  }
}
