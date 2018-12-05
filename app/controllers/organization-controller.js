/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.organization-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines the functions for interacting with
 * organizations.
 */

// Expose organization controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  findOrgs,
  createOrgs,
  updateOrgs,
  removeOrgs,
  findOrg,
  findOrgsQuery,
  createOrg,
  updateOrg,
  removeOrg,
  findPermissions,
  setPermissions,
  findAllPermissions
};

// Node.js Modules
const assert = require('assert');

// MBEE Modules
const ProjController = M.require('controllers.project-controller');
const UserController = M.require('controllers.user-controller');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');

// eslint consistent-return rule is disabled for this file. The rule may not fit
// controller-related functions as returns are inconsistent.
/* eslint-disable consistent-return */

/**
 * @description This function finds all organizations a user belongs to.
 *
 * @param {User} reqUser - The user whose organizations to find
 * @param {Boolean} softDeleted - The optional flag to denote searching for deleted orgs
 *
 * @return {Promise} resolve - Array of found organization objects
 *                    reject - error
 *
 * @example
 * findOrgs({User})
 * .then(function(orgs) {
 *   // Do something with the found orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 *
 */
function findOrgs(reqUser, softDeleted = false) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof softDeleted === 'boolean', 'Soft deleted flag is not a boolean.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    const userID = sani.sanitize(reqUser._id);

    // Set search Params for orgid and deleted = false
    const searchParams = { 'permissions.read': userID, deleted: false };

    // Error Check: Ensure user has permissions to find deleted orgs
    if (softDeleted && !reqUser.admin) {
      throw new M.CustomError('User does not have permissions.', 403, 'warn');
    }
    // softDeleted flag true, remove deleted: false
    if (softDeleted) {
      delete searchParams.deleted;
    }

    // Find Organizations user has read access
    findOrgsQuery(searchParams)
    .then((orgs) => resolve(orgs))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This functions creates multiple organizations
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {Object} arrOrgs - Array of new org data
 *
 * @return {Promise} Created organization object
 *
 * @example
 * createOrg({User}, [{Org1}, {Org2}, ...])
 * .then(function(orgs) {
 *   // Do something with the newly created orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function createOrgs(reqUser, arrOrgs) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(reqUser.admin, 'User does not have permissions.');
      assert.ok(typeof arrOrgs === 'object', 'Orgs array is not an object');
      let index = 1;
      // Loop through orgs in through
      Object(arrOrgs).forEach((org) => {
        // Ensure each org in arrOrgs has an ID that is a string
        assert.ok(org.hasOwnProperty('id'), `Org #${index} does not contain an id.`);
        assert.ok(typeof org.id === 'string', `Org #${index}'s id is not a string.`);
        // Error Check: ensure object only contains valid keys
        assert.ok(Organization.validateObjectKeys(org), `Org #${index} contains invalid keys.`);
        index++;
      });
    }
    catch (error) {
      const statusCode = (error.message.includes('permissions')) ? 403 : 400;
      throw new M.CustomError(error.message, statusCode, 'warn');
    }

    // Create the find query
    const findQuery = { id: { $in: sani.sanitize(arrOrgs.map(o => o.id)) } };

    // Ensure no orgs are already created
    findOrgsQuery(findQuery)
    .then((foundOrgs) => {
      // Error Check: ensure no orgs have already been created
      if (foundOrgs.length > 0) {
        // Get the ID's of the conflicting orgs
        const foundIDs = foundOrgs.map(o => o.id);
        throw new M.CustomError('Org(s) with the following ID(s) already'
          + ` exists: [${foundIDs.toString()}].`, 403, 'warn');
      }

      // Convert each object in arrOrgs into an Org object and set permissions
      const orgObjects = arrOrgs.map(o => {
        const orgObject = new Organization(sani.sanitize(o));
        orgObject.permissions.read.push(reqUser._id);
        orgObject.permissions.write.push(reqUser._id);
        orgObject.permissions.admin.push(reqUser._id);
        orgObject.createdBy = reqUser;
        orgObject.lastModifiedBy = reqUser;
        return orgObject;
      });

      // Save the organizations
      return Organization.create(orgObjects);
    })
    .then((createdOrgs) => {
      // Create the find query
      const findcreatedOrgsQuery = { id: { $in: sani.sanitize(createdOrgs.map(o => o.id)) } };
      return findOrgsQuery(findcreatedOrgsQuery);
    })
    .then((foundOrgs) => resolve(foundOrgs))
    .catch((error) => {
      // If error is a CustomError, reject it
      if (error instanceof M.CustomError) {
        return reject(error);
      }

      // If it's not a CustomError, the create failed so delete all successfully
      // created orgs and reject the error.
      return Organization.deleteMany(findQuery)
      .then(() => reject(M.CustomError.parseCustomError(error)))
      .catch((error2) => reject(M.CustomError.parseCustomError(error2)));
    });
  });
}

/**
 * @description This function updates multiple orgs at once.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {Object} query - The query used to find/update orgs
 * @param {Object} updateInfo - An object containing updated organization data
 *
 * @return {Promise} updated orgs
 *
 * @example
 * updateOrgs({User}, { id: 'orgid' }, { name: 'Different Org Name' })
 * .then(function(orgs) {
 *   // Do something with the newly updated orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function updateOrgs(reqUser, query, updateInfo) {
  return new Promise((resolve, reject) => {
    // Define flag for updating 'Mixed' fields and foundOrgs array
    let containsMixed = false;
    let foundOrgs = [];

    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof query === 'object', 'Update query is not an object.');
      assert.ok(typeof updateInfo === 'object', 'Update info is not an object.');
      // Error Check: ensure object only contains valid keys
      assert.ok(Organization.validateObjectKeys(updateInfo),
        'Update object contains invalid keys.');
      // Loop through each desired update
      Object.keys(updateInfo).forEach((key) => {
        // Error Check: ensure user can update each field
        assert.ok(Organization.schema.methods.getValidUpdateFields().includes(key),
          `Organization property [${key}] cannot be changed.`);

        // Error Check: ensure parameter is not unique
        assert.ok(!Organization.schema.obj[key].unique,
          `Cannot use batch update on the unique field [${key}].`);

        // If the field is a mixed field, set the flag
        if (Organization.schema.obj[key].type.schemaName === 'Mixed') {
          containsMixed = true;
        }
      });
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Find the organizations to update
    findOrgsQuery(query)
    .then((orgs) => {
      // Set foundOrgs array
      foundOrgs = orgs;

      // Loop through each found org
      Object(orgs).forEach((org) => {
        // Error Check: ensure user has permission to update org
        if (!org.getPermissions(reqUser).admin && !reqUser.admin) {
          throw new M.CustomError('User does not have permissions.', 403, 'warn');
        }

        // Error Check: ensure user isn't trying to update the default org
        if (org.id === M.config.server.defaultOrganizationId) {
          throw new M.CustomError(
            'The default organization cannot be updated.', 403, 'warn'
          );
        }
      });

      // If updating a mixed field, update each org individually
      if (containsMixed) {
        M.log.info('Updating orgs.... this could take a while.');
        // Create array of promises
        const promises = [];
        // Loop through each organization
        Object(orgs).forEach((org) => {
          // Loop through each update
          Object.keys(updateInfo).forEach((key) => {
            // If a 'Mixed' field
            if (Organization.schema.obj[key].type.schemaName === 'Mixed') {
              // Merge changes into original 'Mixed' field
              utils.updateAndCombineObjects(org[key], sani.sanitize(updateInfo[key]));

              // Mark that the 'Mixed' field has been modified
              org.markModified(key);
            }
            else {
              // Update the value in the org
              org[key] = sani.sanitize(updateInfo[key]);
            }
          });

          // Update last modified field
          org.lastmodifiedBy = reqUser;

          // Add org.save() to promise array
          promises.push(org.save());
        });

        // Once all promises complete, return
        return Promise.all(promises);
      }

      // No mixed field update, update all together
      return Organization.updateMany(query, updateInfo);
    })
    .then((orgs) => {
      // Check if some of the orgs in updateMany failed
      if (!containsMixed && orgs.n !== foundOrgs.length) {
        // The number updated does not match the number attempted, log it
        throw new M.CustomError(
          'Some of the following organizations failed to update: '
        + `[${foundOrgs.map(o => o.id)}].`, 500, 'error'
        );
      }

      // Find the updated orgs to return them
      return findOrgsQuery(query);
    })
    // Return the updated orgs
    .then((updatedOrgs) => resolve(updatedOrgs))
    .catch((error) => M.CustomError.parseCustomError(error));
  });
}

/**
 * @description This functions deletes multiple orgs at a time.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {Array} arrOrgs - An array of organizations to delete.
 *
 * @return {Promise} Deleted organization object
 *
 * @example
 * createOrg({User}, { id: 'orgid' }, true)
 * .then(function(orgs) {
 *   // Do something with the newly deleted orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function removeOrgs(reqUser, arrOrgs) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(Array.isArray(arrOrgs), 'Remove orgs is not an array');
      arrOrgs.forEach(org => {
        assert.ok(typeof org === 'object', 'Orgs array is not of objects');
      });
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Error Check: ensure reqUser is a global admin if hard deleting
    if (!reqUser.admin) {
      throw new M.CustomError('User does not have permissions to delete.', 403, 'warn');
    }

    // Define found orgs array
    let foundOrgs = [];
    const query = { id: { $in: arrOrgs.map(o => o.id) } };

    // Find the orgs the user wishes to delete
    findOrgsQuery(query)
    .then((orgs) => {
      // Set foundOrgs
      foundOrgs = orgs;

      // Loop through each found org
      Object(orgs).forEach((org) => {
        // Error Check: ensure reqUser is not deleting the default org
        if (org.id === M.config.server.defaultOrganizationId) {
          // orgID is default, reject error.
          throw new M.CustomError('The default organization cannot be deleted.', 403, 'warn');
        }
      });


      // Delete all projects in the orgs
      return Project.deleteMany({
        org: {
          $in: orgs.map(o => o._id)
        }
      });
    })
    // Delete the orgs
    .then(() => Organization.deleteMany(query))
    // Return the deleted orgs
    .then(() => resolve(foundOrgs))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function takes a user object and orgID and returns the
 * organization data.
 *
 * @param {User} reqUser - The requesting user object.
 * @param {String} organizationID - The string of the org ID.
 * @param {Boolean} softDeleted - An optional flag that allows users to
 *  search for soft deleted projects as well.
 *
 * @return {Promise} resolve - searched organization object
 *                    reject - error
 *
 *  @example
 * findOrg({User}, 'orgID')
 * .then(function(org) {
 *   // Do something with the found org
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findOrg(reqUser, organizationID, softDeleted = false) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof softDeleted === 'boolean', 'Soft deleted flag is not a boolean.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Sanitize query inputs
    const orgID = sani.sanitize(organizationID);

    // Set search Params for orgid and deleted = false
    const searchParams = { id: orgID, deleted: false };

    // Error Check: Ensure user has permissions to find deleted orgs
    if (softDeleted && !reqUser.admin) {
      throw new M.CustomError('User does not have permissions.', 403, 'warn');
    }
    // softDeleted flag true, remove deleted: false
    if (softDeleted) {
      delete searchParams.deleted;
    }

    // Find orgs
    findOrgsQuery(searchParams)
    .then((orgs) => {
      // Error Check: ensure at least one org was found
      if (orgs.length === 0) {
        // No orgs found, reject error
        throw new M.CustomError('Org not found.', 404, 'warn');
      }

      // Error Check: ensure no more than one org was found
      if (orgs.length > 1) {
        // Orgs length greater than one, reject error
        throw new M.CustomError('More than one org found.', 400, 'warn');
      }

      // Error Check: ensure reqUser has either read permissions or is global admin
      if (!orgs[0].getPermissions(reqUser).read && !reqUser.admin) {
        // User does NOT have read access and is NOT global admin, reject error
        throw new M.CustomError('User does not have permissions.', 403, 'warn');
      }

      // All checks passed, resolve org
      return resolve(orgs[0]);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description Find orgs by a database query.
 *
 * @param {Object} orgQuery - The query to be made to the database
 *
 * @return {Promise} resolve - organization object
 *                   reject - error
 *
 * @example
 * findOrgsQuery({ id: 'org' })
 * .then(function(orgs) {
 *   // Do something with the found orgs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findOrgsQuery(orgQuery) {
  return new Promise((resolve, reject) => {
    // Find orgs
    Organization.find(orgQuery)
    .populate('projects permissions.read permissions.write permissions.admin')
    .then((orgs) => resolve(orgs))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function takes a user and dictionary containing
 *   the org data creates a new organization.
 *
 * @param {User} reqUser - The object containing the user of the requesting user.
 * @param {Object} newOrgData - Object containing new org data.
 *
 * @return {Promise} Created organization object
 *
 * @example
 * createOrg({User}, { id: 'orgID', name: 'New Org' })
 * .then(function(org) {
 *   // Do something with the newly created org
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function createOrg(reqUser, newOrgData) {
  return new Promise((resolve, reject) => {
    // Initialize optional fields with a default
    let custom = {};

    // Error Check: ensure input parameters are valid
    try {
      assert.ok(reqUser.admin, 'User does not have permissions.');
      assert.ok(newOrgData.hasOwnProperty('id'), 'ID not provided in request body.');
      assert.ok(newOrgData.hasOwnProperty('name'), 'Name not provided in request body.');
      assert.ok(typeof newOrgData.id === 'string', 'ID in request body is not a string.');
      assert.ok(typeof newOrgData.name === 'string', 'Name in request body is not a string.');
      // Error Check: ensure object only contains valid keys
      assert.ok(Organization.validateObjectKeys(newOrgData), 'Org contains invalid keys.');

      // If custom data provided, validate type and sanitize
      if (utils.checkExists(['custom'], newOrgData)) {
        assert.ok(typeof newOrgData.custom === 'object',
          'Custom in request body is not an object.');
        custom = sani.sanitize(newOrgData.custom);
      }
    }
    catch (error) {
      let statusCode = 400;
      // Return a 403 if request is permissions related
      if (error.message.includes('permissions')) {
        statusCode = 403;
      }
      throw new M.CustomError(error.message, statusCode, 'warn');
    }

    // Sanitize query inputs
    const orgID = sani.sanitize(newOrgData.id);
    const orgName = sani.sanitize(newOrgData.name);

    // Check if org already exists
    findOrgsQuery({ id: orgID })
    .then((foundOrg) => {
      // Error Check: ensure no org was found
      if (foundOrg.length > 0) {
        throw new M.CustomError(
          'An organization with the same ID already exists.', 403, 'warn'
        );
      }

      // Create the new org
      const newOrg = new Organization({
        id: orgID,
        name: orgName,
        permissions: {
          admin: [reqUser._id],
          write: [reqUser._id],
          read: [reqUser._id]
        },
        createdBy: reqUser,
        lastModifiedBy: reqUser,
        custom: custom
      });
      // Save new org
      return newOrg.save();
    })
    // Find created org
    .then((createdOrg) => findOrgsQuery({ id: createdOrg.id }))
    // Return found org
    .then((foundOrg) => resolve(foundOrg[0]))
    // Return reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function takes a user object, organization ID, and an
 * object containing updated fields and updates an existing organization.
 *
 * @param {User} reqUser - The object containing the  requesting user.
 * @param {String} organizationID - The organization ID.
 * @param {Object} orgUpdated - An object containing updated Organization data
 *
 * @return {Promise} updated org
 *
 * @example
 * updateOrg({User}, 'orgID', { name: 'Different Org Name' })
 * .then(function(org) {
 *   // Do something with the newly updated org
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function updateOrg(reqUser, organizationID, orgUpdated) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof orgUpdated === 'object', 'Updated org is not an object');
      // Error Check: ensure object only contains valid keys
      assert.ok(Organization.validateObjectKeys(orgUpdated), 'Org contains invalid keys.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Check if orgUpdated is instance of Organization model
    if (orgUpdated instanceof Organization) {
      // Disabling linter because the reassign is needed to convert the object to JSON
      // orgUpdated is instance of Organization model, convert to JSON
      orgUpdated = orgUpdated.toJSON(); // eslint-disable-line no-param-reassign
    }

    // Error Check: ensure the org being updated is not the default org
    if (organizationID === M.config.server.defaultOrganizationId) {
      // orgID is default, reject error
      throw new M.CustomError('Cannot update the default org.', 403, 'warn');
    }

    // Find organization
    // Note: organizationID is sanitized in findOrg()
    findOrg(reqUser, organizationID)
    .then((org) => {
      // Error Check: ensure reqUser is an org admin or global admin
      if (!org.getPermissions(reqUser).admin && !reqUser.admin) {
        // reqUser does NOT have admin permissions or NOT global admin, reject error
        throw new M.CustomError('User does not have permissions.', 403, 'warn');
      }

      // Get list of keys the user is trying to update
      const orgUpdateFields = Object.keys(orgUpdated);
      // Get list of parameters which can be updated from model
      const validUpdateFields = org.getValidUpdateFields();

      // Loop through orgUpdateFields
      for (let i = 0; i < orgUpdateFields.length; i++) {
        const updateField = orgUpdateFields[i];

        // Check if original org does NOT contain updatedField
        if (!org.toJSON().hasOwnProperty(updateField)) {
          // Original org does NOT contain updatedField, reject error
          throw new M.CustomError(
            `Organization does not contain field ${updateField}.`, 400, 'warn'
          );
        }

        // Check if updated field is equal to the original field
        if (utils.deepEqual(org.toJSON()[updateField], orgUpdated[updateField])) {
          // Updated value matches existing value, continue to next loop iteration
          continue;
        }

        // Error Check: Check if field can be updated
        if (!validUpdateFields.includes(updateField)) {
          // field cannot be updated, reject error
          throw new M.CustomError(
            `Organization property [${updateField}] cannot be changed.`, 403, 'warn'
          );
        }

        // Check if updateField type is 'Mixed'
        if (Organization.schema.obj[updateField].type.schemaName === 'Mixed') {
          // Only objects should be passed into mixed data
          if (typeof orgUpdated[updateField] !== 'object') {
            throw new M.CustomError(`${updateField} must be an object`, 400, 'warn');
          }

          // Add and replace parameters of the type 'Mixed'
          utils.updateAndCombineObjects(org[updateField], orgUpdated[updateField]);

          // Mark mixed fields as updated, required for mixed fields to update in mongoose
          // http://mongoosejs.com/docs/schematypes.html#mixed
          org.markModified(updateField);
        }
        else {
          // Schema type is not mixed
          // Sanitize field and update field in org object
          org[updateField] = sani.sanitize(orgUpdated[updateField]);
        }
      }
      // Update last modified field
      org.lastModifiedBy = reqUser;

      // Save updated org
      return org.save();
    })
    .then(updatedOrg => resolve(updatedOrg))
    // Return reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function takes a user object, organization ID, and an
 * optional flag for soft or hard delete and deletes an organization.
 *
 * @param {User} reqUser - The object containing the  requesting user.
 * @param {String} organizationID - The ID of the org being deleted.
 *
 * @return {Promise} removed organization object
 *
 * @example
 * removeOrg({User}, 'orgID', true)
 * .then(function(org) {
 *   // Do something with the newly removed org
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function removeOrg(reqUser, organizationID) {
  // Define org variable to be used for resolve
  let org = null;
  // Var to store list of projects to delete
  let projects = null;

  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    if (typeof organizationID !== 'string') {
      throw new M.CustomError('Organization ID is not a string.', 400, 'warn');
    }

    // Error Check: ensure reqUser is not deleting the default org
    if (organizationID === M.config.server.defaultOrganizationId) {
      throw new M.CustomError('The default organization cannot be deleted.', 403, 'warn');
    }

    // Error Check: ensure reqUser is a global admin if hard deleting
    if (!reqUser.admin) {
      throw new M.CustomError('User does not have permissions to delete.', 403, 'warn');
    }

    // Find the organization
    findOrg(reqUser, organizationID, true)
    .then((foundOrg) => {
      // Set org variable
      org = foundOrg;
      // Find all the projects
      return ProjController.findProjects(reqUser, organizationID);
    })
    .then((foundProjects) => {
      projects = foundProjects.map(p => ({ id: utils.parseID(p.id).pop() }));

      // Delete all projects in the org
      return ProjController.removeProjects(reqUser, organizationID, projects);
    })
    // Delete the org
    .then(() => Organization.deleteOne({ id: org.id }))
    // Resolve the deleted org
    .then(() => resolve(org))
    // Catch errors and reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function returns a users permission on an org.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} searchedUsername - The username to find permissions for.
 * @param {String} organizationID - The ID of the organization
 *
 * @returns {Promise}
 * {
 *   username: {
 *     read: boolean,
 *     write: boolean,
 *     admin: boolean
 *   }
 * }
 *
 * @example
 * findPermissions({User}, 'username', 'orgID')
 * .then(function(permissions) {
 *  // // Do something with the users permissions
 * })
 * .catch(function(error) {
 *  M.log.error(error);
 * });
 */
function findPermissions(reqUser, searchedUsername, organizationID) {
  return new Promise((resolve, reject) => {
    // Find org - input is sanitized by findAllPermissions()
    findAllPermissions(reqUser, organizationID)
    .then(permissionList => {
      // Check if user NOT in permissionsList
      if (!permissionList.hasOwnProperty(searchedUsername)) {
        // User NOT in permissionList, return empty object
        return resolve({});
      }
      // Return users permissions
      return resolve(permissionList[searchedUsername]);
    })
    .catch(error => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function sets permissions for a user on an org
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The ID of the org being deleted.
 * @param {String} searchedUsername - The username of the user whose roles are to be changed.
 * @param {String} role - The new role for the user.
 *
 * @returns {Promise} The updated Organization object
 *
 * @example
 * setPermissions({User}, 'orgID', 'username', 'write')
 * .then(function(org) {
 *   // Do something with the updated org
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 *
 */
function setPermissions(reqUser, organizationID, searchedUsername, role) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof searchedUsername === 'string', 'Searched username is not a string.');
      assert.ok(typeof role === 'string', 'Role is not a string.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Check if role parameter NOT a valid role
    if (!['admin', 'write', 'read', 'REMOVE_ALL'].includes(role)) {
      // Role parameter NOT a valid role, reject error
      throw new M.CustomError(
        'The permission entered is not a valid permission.', 400, 'warn'
      );
    }

    // Sanitize parameters
    const searchedUser = sani.sanitize(searchedUsername);

    // Initialize foundUser
    let foundUser;

    // Find searchedUser
    UserController.findUser(reqUser, searchedUser)
    .then((user) => {
      // set foundUser
      foundUser = user;

      // Check if requesting user is found user
      if (reqUser._id.toString() === foundUser._id.toString()) {
        // Requesting user is found user, reject error
        throw new M.CustomError(
          'User cannot change their own permissions.', 403, 'warn'
        );
      }
      // Find org
      // Note: organizationID is sanitized in findOrg
      return findOrg(reqUser, organizationID);
    })
    .then((org) => {
      // Check requesting user NOT org admin and NOT global admin
      if (!org.getPermissions(reqUser).admin && !reqUser.admin) {
        // Requesting user NOT org admin and NOT global admin, reject error
        throw new M.CustomError(
          'User cannot change organization permissions.', 403, 'warn'
        );
      }

      // Initialize permissions and get permissions levels
      const perm = org.permissions;
      const permLevels = org.getPermissionLevels();

      // Loop through each org permission
      Object.keys(perm)
      .forEach((orgRole) => {
        // Check if orgRole is a valid permission level
        if (permLevels.includes(orgRole)) {
          // orgRole is a valid permission level, map the username to permVals
          const permVals = perm[orgRole].map(u => u._id.toString());
          // Check if foundUser is in permVals
          if (permVals.includes(foundUser._id.toString())) {
            // Check if foundUser is in permVals, remove the user from the permissions list
            perm[orgRole].splice(perm[orgRole].indexOf(foundUser._id), 1);
          }
        }
      });

      // Check if role is admin
      if (role === 'admin') {
        // Role is admin, add foundUser to admin permission list
        perm.admin.push(foundUser._id);
      }

      // Check if role is admin or write
      if (role === 'admin' || role === 'write') {
        // Role is admin or write, add foundUser to write permission list
        perm.write.push(foundUser._id);
      }

      // Check if role is admin write, or read
      if (role === 'admin' || role === 'write' || role === 'read') {
        // Role is admin, write, or read, add foundUser to read permission list
        perm.read.push(foundUser._id);
      }

      // Save the updated organization
      return org.save();
    })
    .then((savedOrg) => resolve(savedOrg))
    // Return reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function returns all user permissions of an org.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The ID of the org being deleted.
 *
 * @returns {Promise} An object containing users permissions
 * {
 *   username1: {
 *     read: boolean,
 *     write: boolean,
 *     admin: boolean,
 *   },
 *   username2: {
 *     read: boolean,
 *     write: boolean,
 *     admin: boolean,
 *   }
 * }
 *
 * @example
 * findAllPermissions({User}, 'orgID')
 * .then(function(permissions) {
 *   // Do something with the list of user permissions
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 *
 */
function findAllPermissions(reqUser, organizationID) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Find the org
    findOrg(reqUser, organizationID)
    .then((org) => {
      // Get the permission types for an org
      const permissionLevels = org.getPermissionLevels();
      // Get a list of all users on the project
      const memberList = org.permissions[permissionLevels[1]].map(u => u.username);

      // Initialize variables
      let permissionsList = [];
      const roleList = {};

      // Loop through each member of the org
      for (let i = 0; i < memberList.length; i++) {
        roleList[memberList[i]] = {};
        // Loop through each permission type, excluding REMOVE_ALL
        for (let j = 1; j < permissionLevels.length; j++) {
          permissionsList = org.permissions[permissionLevels[j]].map(u => u.username);
          roleList[memberList[i]][permissionLevels[j]] = permissionsList.includes(memberList[i]);
        }
      }
      return resolve(roleList);
    })
    .catch(error => reject(M.CustomError.parseCustomError(error)));
  });
}
