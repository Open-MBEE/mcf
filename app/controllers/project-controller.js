/**
 * Classification: UNCLASSIFIED
 *
 * @module  controllers.project-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Provides an abstraction layer on top of the Project model that
 * implements controller logic and behavior for Projects.
 */

// Expose project controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  createProject,
  createProjects,
  findAllPermissions,
  findProjectsQuery,
  findPermissions,
  findProject,
  findProjects,
  removeProject,
  removeProjects,
  setPermissions,
  updateProject,
  updateProjects
};

// Node.js Modules
const assert = require('assert');

// MBEE Modules
const ElementController = M.require('controllers.element-controller');
const OrgController = M.require('controllers.organization-controller');
const UserController = M.require('controllers.user-controller');
const Project = M.require('models.project');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');

// eslint consistent-return rule is disabled for this file. The rule may not fit
// controller-related functions as returns are inconsistent.
/* eslint-disable consistent-return */

/**
 * @description The function finds all projects for a given orgID.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The organization ID for the org the project belongs to.
 * @param {Boolean} softDeleted - The optional flag to denote searching for deleted projects
 *
 * @return {Array} array of found project objects
 *
 * @example
 * findProjects({User}, 'orgID', false)
 * .then(function(projects) {
 *   // Do something with the found projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findProjects(reqUser, organizationID, softDeleted = false) {
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

    const searchParams = { id: { $regex: `^${orgID}:` }, deleted: false };

    // Error Check: Ensure user has permissions to find deleted projects
    if (softDeleted && !reqUser.admin) {
      throw new M.CustomError('User does not have permissions.', 403, 'warn');
    }
    // softDeleted flag true, remove deleted: false
    if (softDeleted) {
      delete searchParams.deleted;
    }

    // Error Check - ensure the organization exists
    OrgController.findOrg(reqUser, organizationID, softDeleted)
    // Find projects
    .then(() => findProjectsQuery(searchParams))
    .then((projects) => resolve(projects
    .filter(project => project.getPermissions(reqUser).read || reqUser.admin)))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description The function creates multiple projects.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The ID of the organization to add projects to.
 * @param {Object} arrProjects - The object containing project data to create.
 *
 * @return {Array} Array of created projects
 *
 * @example
 * createProjects({User}, 'orgID', [{Proj1}, {Proj2}, ...])
 * .then(function(projects) {
 *   // Do something with the new projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function createProjects(reqUser, organizationID, arrProjects) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof arrProjects === 'object', 'Project array is not an object.');
      let index = 1;
      Object(arrProjects).forEach((project) => {
        assert.ok(project.hasOwnProperty('id'), `Project #${index} is missing an id.`);
        assert.ok(typeof project.id === 'string', `Project #${index}'s id is not a string.`);
        // Error Check: ensure object only contains valid keys
        assert.ok(Project.validateObjectKeys(project), `Project #${index} contains invalid keys.`);
        index++;
      });
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Create the find query
    const projectIDs = arrProjects.map(p => utils.createID(organizationID, p.id));
    const findQuery = {
      id: {
        $in: sani.sanitize(projectIDs)
      }
    };

    // Initialize createdProjects
    let createdProjects = null;

    // Find any existing projects that match the query
    findProjectsQuery(findQuery)
    .then((projects) => {
      // Error Check: ensure no projects already exist
      if (projects.length > 0) {
        // Get the ids of the projects that already exist
        const existingIDs = projects.map(p => p.id);
        throw new M.CustomError(`Project(s) with the following id(s) ' +
          'already exists: [${existingIDs.toString()}].`, 403, 'warn');
      }

      // Find the organization
      return OrgController.findOrg(reqUser, organizationID);
    })
    .then((org) => {
      // Error Check: ensure user has write permissions on org
      if (!org.getPermissions(reqUser).write && !reqUser.admin) {
        throw new M.CustomError('User does not have permissions.', 403, 'warn');
      }


      // Convert each project into a project object
      const projObjects = arrProjects.map(p => {
        const projData = JSON.parse(JSON.stringify(p)); // Need to use a copy
        projData.id = utils.createID(organizationID, projData.id);

        const projObject = new Project(sani.sanitize(projData));
        projObject.org = org._id;
        projObject.permissions.read.push(reqUser._id);
        projObject.permissions.write.push(reqUser._id);
        projObject.permissions.admin.push(reqUser._id);

        // Update the created by and last modified field
        projObject.createdBy = reqUser;
        projObject.lastModifiedBy = reqUser;
        return projObject;
      });

      // Create the projects
      return Project.create(projObjects);
    })
    .then((savedProjects) => {
      // set savedProjects to createdProjects
      createdProjects = savedProjects;
      // Initialize promise array
      const promises = [];
      // Loop through each project
      createdProjects.forEach(project => {
        // Create root element for each project
        const rootElement = {
          name: 'Model',
          id: 'model',
          type: 'Package',
          parent: null,
          projectUID: project.id
        };
        // Push the save of the element to the promise array
        promises.push(ElementController.createElement(reqUser, rootElement));
      });

      // Once all promises complete, return
      return Promise.all(promises);
    })
    .then(() => {
      // Create the find query
      const refindQuery = { id: { $in: sani.sanitize(createdProjects.map(o => o.id)) } };
      return findProjectsQuery(refindQuery);
    })
    .then((foundProjects) => resolve(foundProjects))
    .catch((error) => {
      // If error is a CustomError, reject it
      if (error instanceof M.CustomError) {
        return reject(error);
      }

      // If it's not a CustomError, the create failed so delete all successfully
      // created projects and reject the error.
      return Project.deleteMany(findQuery)
      .then(() => reject(M.CustomError.parseCustomError(error)))
      .catch((error2) => reject(M.CustomError.parseCustomError(error2)));
    });
  });
}

/**
 * @description This function updates multiple projects at the same time.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The id of the org which contains the projects.
 * @param {Array} arrProjects - Array of projects to update.
 *
 * @return {Promise} updated projects
 *
 * @example
 * updateProjects({User}, { id: 'proj1' }, { name: 'Different Proj Name' })
 * .then(function(projects) {
 *   // Do something with the newly updated projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function updateProjects(reqUser, organizationID, arrProjects) {
  return new Promise((resolve, reject) => {
    // Array of promises
    const promisesArray = [];

    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(Array.isArray(arrProjects), 'Projects array is not an array.');

      // Make sure every project object has an ID
      for (let i = 0; i < arrProjects.length; i++) {
        const p = arrProjects[i];
        assert.ok(p.hasOwnProperty('id'), `Project ${i + 1} does not have an ID.`);
        assert.ok(typeof p.id === 'string', `Project ${i + 1} ID is not a string.`);
      }
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    const projectIDs = arrProjects.map(p => sani.sanitize(utils.createID(organizationID, p.id)));
    const findQuery = {
      id: {
        $in: projectIDs
      }
    };

    // Array of fields user can update
    const updatableFields = Project.getValidUpdateFields();

    // Find the projects to update
    findProjectsQuery(findQuery)
    .then((projects) => {
      // Make sure all projects were found
      if (projects.length !== arrProjects.length) {
        throw new M.CustomError('One or more projects not found.', 404, 'warn');
      }

      // Loop through each found project and check permissions
      Object(projects).forEach((proj) => {
        // Error Check: ensure user has permission to update proj
        if (!proj.getPermissions(reqUser).admin && !reqUser.admin) {
          throw new M.CustomError('User does not have permissions.', 403, 'warn');
        }
      });

      // Map found project to object with ID keys
      // This is to allow us to loop over user provided array and then have
      // constant time lookup of DB project objects
      const objProjects = {};
      projects.forEach(p => {
        objProjects[p.id] = p;
      });

      // For each project update
      for (let i = 0; i < arrProjects.length; i++) {
        const update = arrProjects[i];
        const updateId = utils.createID(organizationID, update.id);
        const updateKeys = Object.keys(arrProjects[i]);

        // For each field in project update
        for (let j = 0; j < updateKeys.length; j++) {
          const key = updateKeys[j];

          // Skip ID, we don't update it
          if (key === 'id') {
            continue;
          }

          // If key is not updatable, throw an error
          if (!updatableFields.includes(key)) {
            const msg = `Field ${key} is not allowed to be updated.`;
            throw new M.CustomError(msg, 403, 'warn');
          }

          // Update that field on the project
          // If field is Mixed data type, combine new data with original obj
          if (Project.schema.obj[key].type.schemaName === 'Mixed') {
            // If mixed data is not an object, fail with explicit error message
            if (typeof update[key] !== 'object') {
              const msg = `Field ${key} must be an object`;
              throw new M.CustomError(msg, 403, 'warn');
            }

            // Update the Mixed field in place
            const originalObjField = objProjects[updateId][key];
            const changesObj = sani.sanitize(update[key]);
            utils.updateAndCombineObjects(originalObjField, changesObj);

            // Mongoose requires Mixed field updates to use markModified()
            // to change rather than replace the field
            objProjects[updateId].markModified(key);
          }
          // Else, field is not mixed data. Sanitize it and update.
          else {
            objProjects[updateId][key] = sani.sanitize(update[key]);
          }

          // Update the last-modified by info
          objProjects[updateId].lastModifiedBy = reqUser;
        }

        // Validate the changes, fail if invalid
        const validationError = objProjects[updateId].validateSync();
        if (validationError) {
          throw M.CustomError.parseCustomError(validationError);
        }
      }

      // Loop over projects again and save changes
      for (let i = 0; i < arrProjects.length; i++) {
        const id = utils.createID(organizationID, arrProjects[i].id);
        promisesArray.push(objProjects[id].save());
      }
      return Promise.all(promisesArray);
    })
    .then(() => findProjectsQuery(findQuery))
    // Return the updated projects
    .then((updatedProjects) => resolve(updatedProjects))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description The function deletes all projects for an org.
 *
 * @param {User} _reqUser - The object containing the requesting user.
 * @param {String} _organizationID - The projects organization id.
 * @param {Array} _arrProjects - Array of project objects to delete.
 *
 * @return {Array} array of deleted projects
 *
 * @example
 * removeProjects({User}, { uid: 'org:proj' }, false)
 * .then(function(projects) {
 *   // Do something with the deleted projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function removeProjects(_reqUser, _organizationID, _arrProjects = []) {
  // Copy the parameters
  const reqUser = JSON.parse(JSON.stringify(_reqUser));
  const organizationID = _organizationID;
  const arrProjects = JSON.parse(JSON.stringify(_arrProjects));

  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(Array.isArray(arrProjects), 'Projects is not an array.');

      // Make sure every project object has an ID
      for (let i = 0; i < arrProjects.length; i++) {
        const p = arrProjects[i];
        assert.ok(typeof p === 'object', 'At least one project is not an object.');
        assert.ok(Object.hasOwnProperty.call(p, 'id'), `Project ${i + 1} does not have an ID.`);
        assert.ok(typeof p.id === 'string', `Project ${i + 1} ID is not a string.`);
      }
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Ensure user is a global admin
    if (!reqUser.admin) {
      const msg = 'User does not have permission to permanently delete a project.';
      throw new M.CustomError(msg, 403, 'warn');
    }

    // Build remove search query
    const orgID = sani.sanitize(organizationID);
    const removeQuery = {
      id: {
        $in: arrProjects.map(p => utils.createID(orgID, p.id))
      }
    };

    let deletedProjects = null;

    // Find the projects to check permissions
    findProjectsQuery(removeQuery)
    .then((foundProjects) => {
      // Error Check: ensure user has permission to delete each project
      Object(foundProjects).forEach((project) => {
        // If user does not have permissions
        if (!project.getPermissions(reqUser).admin && !reqUser.admin) {
          // User does not have permissions and is not a site-wide admin, reject
          const msg = `User does not have permission to delete the project ${project.id}.`;
          throw new M.CustomError(msg, 403, 'warn');
        }
      });
      // The list of projects about to be deleted
      deletedProjects = foundProjects;

      // Create delete query to remove elements
      const elementDeleteQuery = { project: { $in: foundProjects.map(p => p._id) } };
      // Delete all elements in the projects
      return ElementController.removeElements(reqUser, elementDeleteQuery, true);
    })
    // Remove projects
    .then(() => Project.deleteMany(removeQuery))
    // Return deleted projects
    .then(() => resolve(deletedProjects))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description The function finds a project. Sanitizes the provided fields
 * and uses findProjectsQuery to perform the lookup
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The organization ID for the org the project belongs to.
 * @param {String} projectID - The project ID of the Project which is being searched for.
 * @param {Boolean} softDeleted - The flag to control whether or not to find softDeleted projects.
 *
 * @return {Project} The found project
 *
 * @example
 * findProject({User}, 'orgID', 'projectID', false)
 * .then(function(project) {
 *   // Do something with the found project
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findProject(reqUser, organizationID, projectID, softDeleted = false) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof softDeleted === 'boolean', 'Soft deleted flag is not a boolean.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Sanitize query inputs
    const orgID = sani.sanitize(organizationID);
    const projID = utils.createID(orgID, sani.sanitize(projectID));

    // Set search Params for projUID and deleted = false
    const searchParams = { id: projID, deleted: false };

    // Error Check: Ensure user has permissions to find deleted projects
    if (softDeleted && !reqUser.admin) {
      throw new M.CustomError('User does not have permissions.', 403, 'warn');
    }
    // softDeleted flag true, remove deleted: false
    if (softDeleted) {
      delete searchParams.deleted;
    }

    // Find projects
    findProjectsQuery(searchParams)
    .then((projects) => {
      // Error Check: ensure at least one project was found
      if (projects.length === 0) {
        // No projects found, reject error
        throw new M.CustomError('Project not found.', 404, 'warn');
      }

      // Error Check: ensure no more than one project was found
      if (projects.length > 1) {
        // Projects length greater than one, reject error
        throw new M.CustomError('More than one project found.', 400, 'warn');
      }

      // Error Check: ensure reqUser has either read permissions or is global admin
      if (!projects[0].getPermissions(reqUser).read && !reqUser.admin) {
        // User does NOT have read access and is NOT global admin, reject error
        throw new M.CustomError('User does not have permission.', 403, 'warn');
      }

      // All checks passed, resolve project
      return resolve(projects[0]);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description Finds a project given a query. The project's org,
 * permissions.read, permissions.write, and permissions.admin fields are
 * populated. The query is sanitized before being executed.
 *
 * @param {Object} query - The query to be made to the database
 *
 * @returns {Promise} project object
 *
 * @example
 * findProjectsQuery({ uid: 'org:proj' })
 * .then(function(projects) {
 *   // Do something with the found projects
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findProjectsQuery(query) {
  return new Promise((resolve, reject) => {
    // Find projects
    Project.find(query)
    .populate('org permissions.read permissions.write permissions.admin')
    .then((projects) => resolve(projects))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description The function creates a project. Project data is sanitized
 * before use.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The ID of the organization containing the project.
 * @param {Object} project - The object of the project being created.
 *
 * @returns {Promise} created project object
 *
 * @example
 * createProject({User}, 'orgid', { id: 'projectID', name: 'New Project' })
 * .then(function(project) {
 *   // Do something with the newly created project
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function createProject(reqUser, organizationID, project) {
  return new Promise((resolve, reject) => {
    // Initialize optional fields with a default
    let custom = {};
    let visibility = 'private';

    // Error Check: ensure input parameters are valid
    try {
      assert.ok(project.id !== undefined, 'project.id is undefined');
      assert.ok(project.name !== undefined, 'project.name is undefined');
      assert.ok(typeof organizationID === 'string', 'The organization ID is not a string.');
      assert.strictEqual(typeof project.id, 'string');
      assert.strictEqual(typeof project.name, 'string');
      // Error Check: ensure project only contains valid keys
      assert.ok(Project.validateObjectKeys(project), 'Project contains invalid keys.');

      // If custom data provided, validate type and sanitize
      if (project.hasOwnProperty('custom')) {
        assert.strictEqual(typeof project.custom, 'object');
        custom = sani.sanitize(project.custom);
      }

      // If visibility is provided, validate type
      if (project.hasOwnProperty('visibility')) {
        const visLevels = Project.getVisibilityLevels();
        assert.ok(visLevels.includes(visibility), 'Invalid visibility level');
        visibility = project.visibility;
      }
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Sanitize query inputs
    const projName = sani.sanitize(project.name);
    const orgID = sani.sanitize(organizationID);
    const projID = utils.createID(orgID, sani.sanitize(project.id));

    // Initialize function-wide variables
    let org = null;
    let createdProject = null;
    // Error Check: make sure the org exists
    OrgController.findOrg(reqUser, orgID)
    .then((_org) => {
      // Error check: make sure user has write permission on org
      if (!_org.getPermissions(reqUser).write && !reqUser.admin) {
        throw new M.CustomError('User does not have permission.', 403, 'warn');
      }

      // Set function wide variable
      org = _org;

      // Check if project already exists
      return findProjectsQuery({ id: projID });
    })
    .then((foundProject) => {
      // Error Check: ensure no project was found
      if (foundProject.length > 0) {
        throw new M.CustomError('A project with the same ID already exists.', 403, 'warn');
      }

      // Create the new project
      const newProject = new Project({
        id: projID,
        name: projName,
        org: org._id,
        permissions: {
          read: [reqUser._id],
          write: [reqUser._id],
          admin: [reqUser._id]
        },
        custom: custom,
        visibility: visibility,
        createdBy: reqUser,
        lastModifiedBy: reqUser
      });

      // Save new project
      return newProject.save();
    })
    .then(savedProject => {
      // Create root model element for new project
      createdProject = savedProject;
      const rootElement = {
        name: 'Model',
        id: 'model',
        type: 'Package',
        parent: null,
        projectUID: projID
      };
      // Save  root model element
      return ElementController.createElement(reqUser, rootElement);
    })
    // Return the created project
    .then(() => findProjectsQuery({ id: createdProject.id }))
    .then((foundProject) => resolve(foundProject[0]))
    // Return reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}


/**
 * @description The function updates a project.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The organization ID of the project.
 * @param {String} projectID - The project ID.
 * @param {Object} projectUpdated - The object of the updated project.
 *
 * @returns {Promise} updated project object
 *
 * @example
 * updateProject({User}, 'orgID', 'projectID', { name: 'Updated Project' })
 * .then(function(project) {
 *   // Do something with the updated project
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function updateProject(reqUser, organizationID, projectID, projectUpdated) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.strictEqual(typeof organizationID, 'string', 'OrganizationID is not a string.');
      assert.strictEqual(typeof projectID, 'string', 'ProjectID is not a string.');
      assert.strictEqual(typeof projectUpdated, 'object', 'ProjectUpdated is not an object.');
      // Error Check: ensure projectUpdated only contains valid keys
      assert.ok(Project.validateObjectKeys(projectUpdated), 'Update object contains invalid keys.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Check if projectUpdated is instance of Project model
    if (projectUpdated instanceof Project) {
      // Disabling linter because the reassign is needed to convert the object to JSON
      // projectUpdated is instance of Project model, convert to JSON
      projectUpdated = projectUpdated.toJSON(); // eslint-disable-line no-param-reassign
    }

    // Find project
    // Note: organizationID and projectID is sanitized in findProject()
    findProject(reqUser, organizationID, projectID)
    .then((project) => {
      // Error Check: ensure reqUser is a project admin or global admin
      if (!project.getPermissions(reqUser).admin && !reqUser.admin) {
        // reqUser does NOT have admin permissions or NOT global admin, reject error
        throw new M.CustomError('User does not have permissions.', 403, 'warn');
      }

      // Get list of keys the user is trying to update
      const projUpdateFields = Object.keys(projectUpdated);
      // Get list of parameters which can be updated from model
      const validUpdateFields = project.getValidUpdateFields();

      // Loop through projUpdateFields
      for (let i = 0; i < projUpdateFields.length; i++) {
        const updateField = projUpdateFields[i];

        // Check if updated field is equal to the original field
        if (utils.deepEqual(project.toJSON()[updateField], projectUpdated[updateField])) {
          // Updated value matches existing value, continue to next loop iteration
          continue;
        }

        // Error Check: Check if field can be updated
        if (!validUpdateFields.includes(updateField)) {
          // field cannot be updated, reject error
          throw new M.CustomError(
            `Project property [${updateField}] cannot be changed.`, 403, 'warn'
          );
        }

        // Check if updateField type is 'Mixed'
        if (Project.schema.obj[updateField].type.schemaName === 'Mixed') {
          // Only objects should be passed into mixed data
          if (typeof projectUpdated[updateField] !== 'object') {
            throw new M.CustomError(`${updateField} must be an object`, 400, 'warn');
          }

          // Update each value in the object
          // eslint-disable-next-line no-loop-func
          Object.keys(projectUpdated[updateField]).forEach((key) => {
            project[updateField][key] = sani.sanitize(projectUpdated[updateField][key]);
          });

          // Mark mixed fields as updated, required for mixed fields to update in mongoose
          // http://mongoosejs.com/docs/schematypes.html#mixed
          project.markModified(updateField);
        }
        else {
          // Schema type is not mixed
          // Sanitize field and update field in project object
          project[updateField] = sani.sanitize(projectUpdated[updateField]);
        }
      }

      // Update last modified field
      project.lastModifiedBy = reqUser;

      // Save updated project
      return project.save();
    })
    .then((updatedProject) => resolve(updatedProject))
    // Return reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description The function deletes a project.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The organization ID for the org the project belongs to.
 * @param {String} projectID - The project ID of the Project which is being deleted.
 *
 * @returns {Promise} deleted project object
 *
 * @example
 * removeProject({User}, 'orgID', 'projectID', false)
 * .then(function(project) {
 *   // Do something with the deleted project
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function removeProject(reqUser, organizationID, projectID) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Error Check: if hard deleting, ensure user is global admin
    if (!reqUser.admin) {
      throw new M.CustomError(
        'User does not have permission to permanently delete a project.', 403, 'warn'
      );
    }

    // Define foundProject
    let foundProject = null;

    // Find the project
    findProject(reqUser, organizationID, projectID, true)
    .then((project) => {
      // Set foundProject
      foundProject = project;

      // Initialize element delete query
      const elementDeleteQuery = { project: project._id };

      // Delete all elements on the project
      return ElementController.removeElements(reqUser, elementDeleteQuery, true);
    })
    // If hard delete, delete project, otherwise update project
    .then(() => Project.deleteOne({ id: foundProject.id }))
    .then(() => resolve(foundProject))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description The function finds a projects permissions.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The organization ID for the org the project belongs to.
 * @param {String} projectID - The project ID of the Project which is being deleted.
 *
 * @return {Promise} Returns a promise that resolves an object where the keys
 * are usernames and the values are permissions objects. The returned object
 * is of the form:
 *
 * <pre>
 * <code>
 * {
 *    userA: { read: true, write: true, admin: true }
 *    userB: { read true, write: false, admin: false }
 * }
 * </code>
 * </pre>
 *
 * @example <caption>Calling example</caption>
 *
 * findAllPermissions({User}, 'orgID', 'projectID')
 * .then(function(permissions) {
 *   // Do something with the list of user permissions
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 *
 */
function findAllPermissions(reqUser, organizationID, projectID) {
  return new Promise((resolve, reject) => {
    // Find all user permissions on project
    findProject(reqUser, organizationID, projectID)
    .then((project) => {
      // Get the permission types for a project
      const permissionLevels = project.getPermissionLevels();
      // Get a list of all users on the project
      const memberList = project.permissions[permissionLevels[1]].map(u => u.username);

      // Initialize variables
      let permissionsList = [];
      const roleList = {};

      // Loop through each member of the project
      for (let i = 0; i < memberList.length; i++) {
        roleList[memberList[i]] = {};
        // Loop through each permission type, excluding REMOVE_ALL
        for (let j = 1; j < permissionLevels.length; j++) {
          permissionsList = project.permissions[permissionLevels[j]].map(u => u.username);
          roleList[memberList[i]][permissionLevels[j]] = permissionsList.includes(memberList[i]);
        }
      }
      return resolve(roleList);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}


/**
 * @description  The function finds a the permissions on the project for a
 * specific user.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} searchedUsername - The string containing the username to be searched for.
 * @param {String} organizationID - The organization ID for the org the project belongs to.
 * @param {String} projectID - The project ID of the Project which is being deleted.
 *
 * @return {Promise} Returns a promise that resolves an Object containing the
 * searched user's permissions on the project. This is returned in the form:
 *
 * <pre><code>
 *   {
 *    read: true,
 *    write: false,
 *    admin: false
 *   }
 * </code></pre>
 *
 * @example
 * findPermissions({User}, 'username', 'orgID', 'projectID')
 * .then(function(permissions) {
 *   // Do something with the users permissions
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findPermissions(reqUser, searchedUsername, organizationID, projectID) {
  return new Promise((resolve, reject) => {
    // Find project - input is sanitized by findAllPermissions()
    findAllPermissions(reqUser, organizationID, projectID)
    .then(permissionList => {
      // Check if user NOT in permissionsList
      if (!permissionList.hasOwnProperty(searchedUsername)) {
        // User NOT in permissionList, return empty object
        return resolve({});
      }
      // Return users permissions
      return resolve(permissionList[searchedUsername]);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}


/**
 * @description The function sets a user's permissions for a project.
 *
 * @param {User} reqUser - The object containing the requesting user.
 * @param {String} organizationID - The organization ID for the org the project belongs to.
 * @param {String} projectID - The project ID of the Project which is being deleted.
 * @param {String} setUsername - The username of the user who's permissions are being set.
 * @param {String} role - The permission level or type being set for the use
 *
 * @return {Promise} resolve - updated organization object
 *                   reject - error
 *
 * @example
 * setPermissions({User}, 'orgID', 'projectID', 'username', 'write')
 * .then(function(project) {
 *   // Do something with the updated project
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 *
 */
function setPermissions(reqUser, organizationID, projectID, setUsername, role) {
  return new Promise((resolve, reject) => {
    // Error Check: ensure input parameters are valid
    try {
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof setUsername === 'string', 'Searched username is not a string.');
      assert.ok(typeof role === 'string', 'Role is not a string.');
    }
    catch (error) {
      throw new M.CustomError(error.message, 400, 'warn');
    }

    // Sanitize input
    const permType = sani.sanitize(role);

    // Initialize setUser
    let setUser = null;
    let updatedProject = null;

    // Lookup the user
    // Note: setUsername is sanitized in findUser()
    UserController.findUser(reqUser, setUsername)
    .then(foundUser => {
      setUser = foundUser;

      // Error Check - Do not allow user to change their own permission
      if (reqUser.username === setUser.username) {
        throw new M.CustomError('User cannot change their own permissions.', 403);
      }
      // Find project to set permissions on
      // Note: organizationID and projectID are sanitized in findProject()
      return findProject(reqUser, organizationID, projectID);
    })
    .then((project) => {
      // Error Check - User must be admin
      if (!project.getPermissions(reqUser).admin && !reqUser.admin) {
        throw new M.CustomError('User does not have permission.', 403, 'warn');
      }

      // Get permission levels from Project schema method
      const permissionLevels = project.getPermissionLevels();

      // Error Check - Make sure that a valid permission type was passed
      if (!permissionLevels.includes(permType)) {
        throw new M.CustomError('Permission type not found.', 404, 'warn');
      }

      // Error Check - Do NOT allow user to change their own permissions
      if (reqUser.username === setUser.username) {
        throw new M.CustomError('User cannot change their own permissions.', 403, 'warn');
      }

      // Grab the index of the permission type
      const permissionLevel = permissionLevels.indexOf(permType);

      // loop through project permissions list to add and remove the correct permissions.
      for (let i = 1; i < permissionLevels.length; i++) {
        // Initialize projectPermission list
        let projectPermission = project.permissions[permissionLevels[i]];

        // Check if i is less than permissionLevel
        if (i <= permissionLevel) {
          // Check if projectPermission does NOT contains user
          // eslint-disable-next-line no-loop-func
          if (!projectPermission.some(user => user.id === setUser.id)) {
            // Add setUser to projectPermission
            projectPermission.push(setUser);
          }
        }
        else {
          // Remove user from projectPermission
          // eslint-disable-next-line no-loop-func
          projectPermission = projectPermission.filter(user => setUser.username !== user.username);
        }
        // Set the project permissions list to the update list
        project.permissions[permissionLevels[i]] = projectPermission;
      }
      // Save updated project
      return project.save();
    })
    .then((savedProject) => {
      // Set updatedProject for later resolve
      updatedProject = savedProject;
      // Check if user has org read permissions
      return OrgController.findPermissions(reqUser, setUser.username, organizationID);
    })
    .then((userOrgPermissions) => {
      // Check if user has read permissions on org
      if (userOrgPermissions.read) {
        // User has read permissions on org, resolve updated Project
        return resolve(updatedProject);
      }
      // User does not have read permissions on org, give them read permissions
      return OrgController.setPermissions(reqUser, organizationID, setUser.username, 'read');
    })
    // Resolve updated project
    .then(() => resolve(updatedProject))
    // Reject  error
    // Return reject with custom error
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
} // Closing function
