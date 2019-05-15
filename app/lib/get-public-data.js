/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.get-public-data
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines functions for returning JSON public data.
 */

// MBEE modules
const utils = M.require('lib.utils');

/**
 * @description The only exported function in this library. It expects a object
 * to be passed in, along with a string that says what type that object is.
 * Valid types are currently org, project, element and user.
 *
 * @param {object} object - The raw JSON of the object whose public data is
 * being returned.
 * @param {string} type - The type of item that the object is. Can be an org,
 * project, element or user.
 * @param {Object} options - A list of options passed in by the user to the API
 * Controller
 *
 * @return {object} The modified object.
 */
module.exports.getPublicData = function(object, type, options) {
  // If options is undefined, set it equal to an empty object
  if (options === undefined) {
    options = {}; // eslint-disable-line
  }

  // Call correct getPublicData() function
  switch (type.toLowerCase()) {
    case 'element':
      return getElementPublicData(object, options);
    case 'project':
      return getProjectPublicData(object, options);
    case 'org':
      return getOrgPublicData(object, options);
    case 'user':
      return getUserPublicData(object, options);
    default:
      throw new M.CustomError(`Invalid model type [${type}]`, 400, 'warn');
  }
};

/**
 * @description Returns an elements public data
 *
 * @param {object} element - The raw JSON of the element.
 * @param {Object} options - A list of options passed in by the user to the API
 * Controller
 *
 * @return {object} The public data of the element.
 */
function getElementPublicData(element, options) {
  // Parse the element ID
  const idParts = utils.parseID(element._id);

  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;
  let parent = null;
  let source;
  let target;
  let project;

  // If element.createdBy is defined
  if (element.createdBy) {
    // If element.createdBy is populated
    if (typeof element.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(element.createdBy, {});
    }
    else {
      createdBy = element.createdBy;
    }
  }

  // If element.lastModifiedBy is defined
  if (element.lastModifiedBy) {
    // If element.lastModifiedBy is populated
    if (typeof element.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(element.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = element.lastModifiedBy;
    }
  }

  // If element.archivedBy is defined
  if (element.archivedBy && element.archived) {
    // If element.archivedBy is populated
    if (typeof element.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(element.archivedBy, {});
    }
    else {
      archivedBy = element.archivedBy;
    }
  }

  // If element.parent is defined
  if (element.parent) {
    // If element.parent is populated
    if (typeof element.parent === 'object') {
      // Get the public data of parent
      parent = getElementPublicData(element.parent, {});
    }
    else {
      parent = utils.parseID(element.parent).pop();
    }
  }

  // If element.source is defined
  if (element.source) {
    const sourceIdParts = utils.parseID(element.source);
    // If element.source is populated
    if (typeof element.source === 'object') {
      // Get the public data of source
      source = getElementPublicData(element.source, {});
    }
    // If source element's project is not the same as the elements parent
    else if (sourceIdParts[1] !== idParts[1]) {
      // Set source to object with org, project and element id
      source = {
        org: sourceIdParts[0],
        project: sourceIdParts[1],
        element: sourceIdParts.pop()
      };
    }
    else {
      // Set source to just the element id
      source = sourceIdParts.pop();
    }
  }

  // If element.target is defined
  if (element.target) {
    const targetIdParts = utils.parseID(element.target);
    // If element.target is populated
    if (typeof element.target === 'object') {
      // Get the public data of target
      target = getElementPublicData(element.target, {});
    }
    // If target element's project is not the same as the elements parent
    else if (targetIdParts[1] !== idParts[1]) {
      // Set target to object with org, project and element id
      target = {
        org: targetIdParts[0],
        project: targetIdParts[1],
        element: targetIdParts.pop()
      };
    }
    else {
      // Set target to just the element id
      target = targetIdParts.pop();
    }
  }

  // If element.project is defined
  if (element.project) {
    // If element.project is populated
    if (typeof element.project === 'object') {
      // Get the public data of project
      project = getProjectPublicData(element.project, {});
    }
    else {
      project = utils.parseID(element.project)[1];
    }
  }

  const data = {
    id: idParts.pop(),
    name: element.name,
    project: project,
    org: idParts[0],
    parent: parent,
    source: source,
    target: target,
    type: element.type,
    documentation: element.documentation,
    custom: element.custom || {},
    createdOn: (element.createdOn) ? element.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (element.updatedOn) ? element.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: element.archived,
    archivedOn: (element.archivedOn) ? element.archivedOn.toString() : undefined,
    archivedBy: archivedBy
  };

  // Handle the virtual contains field
  if (element.contains) {
    // If all contents are objects (they should be)
    if (element.contains.every(e => typeof e === 'object')) {
      // If the archived option is supplied
      if (options.hasOwnProperty('archived') && options.archived === true) {
        data.contains = element.contains.map(e => utils.parseID(e._id).pop());
      }
      else {
        // Remove all archived elements
        const tmpContains = element.contains.filter(e => e.archived !== true);
        data.contains = tmpContains.map(e => utils.parseID(e._id).pop());
      }
    }
  }

  // If the fields options is defined
  if (options.hasOwnProperty('fields')) {
    // If fields should be excluded
    if (options.fields.every(f => f.startsWith('-'))) {
      // For each of those fields
      options.fields.forEach((f) => {
        // If -id, ignore it
        if (f === '-id') {
          return;
        }
        // Remove the field from data
        data[f.slice(1)] = undefined;
      });
    }
    // If only specific fields should be included
    else if (options.fields.every(f => !f.startsWith('-'))) {
      const returnObj = { id: data.id };
      // Add specific field to returnObj
      options.fields.forEach((f) => {
        returnObj[f] = (data.hasOwnProperty(f)) ? data[f] : undefined;
      });
      return returnObj;
    }
  }
  return data;
}

/**
 * @description Returns a projects public data
 *
 * @param {object} project - The raw JSON of the project.
 * @param {Object} options - A list of options passed in by the user to the API
 * Controller
 *
 * @return {object} The public data of the project.
 */
function getProjectPublicData(project, options) {
  const permissions = (project.permissions) ? {} : undefined;
  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;
  let projectReferences;

  // Loop through each permission key/value pair
  Object.keys(project.permissions || {}).forEach((u) => {
    // Return highest permission
    permissions[u] = project.permissions[u].pop();
  });

  // If projectReferences are defined
  if (project.hasOwnProperty('projectReferences')) {
    projectReferences = [];
    // Loop through each project reference
    project.projectReferences.forEach((ref) => {
      // Split concatenated id and return only project id
      projectReferences.push(utils.parseID(ref).pop());
    });
  }

  // If project.createdBy is defined
  if (project.createdBy) {
    // If project.createdBy is populated
    if (typeof project.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(project.createdBy, {});
    }
    else {
      createdBy = project.createdBy;
    }
  }

  // If project.lastModifiedBy is defined
  if (project.lastModifiedBy) {
    // If project.lastModifiedBy is populated
    if (typeof project.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(project.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = project.lastModifiedBy;
    }
  }

  // If project.archivedBy is defined
  if (project.archivedBy && project.archived) {
    // If project.archivedBy is populated
    if (typeof project.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(project.archivedBy, {});
    }
    else {
      archivedBy = project.archivedBy;
    }
  }

  // Return the projects public fields
  const data = {
    id: utils.parseID(project._id).pop(),
    org: (project.org && project.org._id)
      ? getOrgPublicData(project.org, {})
      : utils.parseID(project._id)[0],
    name: project.name,
    permissions: permissions,
    projectReferences: projectReferences,
    custom: project.custom || {},
    visibility: project.visibility,
    createdOn: (project.createdOn) ? project.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (project.updatedOn) ? project.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: project.archived,
    archivedOn: (project.archivedOn) ? project.archivedOn.toString() : undefined,
    archivedBy: archivedBy
  };

  // If the fields options is defined
  if (options.hasOwnProperty('fields')) {
    // If fields should be excluded
    if (options.fields.every(f => f.startsWith('-'))) {
      // For each of those fields
      options.fields.forEach((f) => {
        // If -id, ignore it
        if (f === '-id') {
          return;
        }
        // Remove the field from data
        data[f.slice(1)] = undefined;
      });
    }
    // If only specific fields should be included
    else if (options.fields.every(f => !f.startsWith('-'))) {
      const returnObj = { id: data.id };
      // Add specific field to returnObj
      options.fields.forEach((f) => {
        returnObj[f] = (data.hasOwnProperty(f)) ? data[f] : undefined;
      });
      return returnObj;
    }
  }

  return data;
}

/**
 * @description Returns an orgs public data
 *
 * @param {object} org - The raw JSON of the org.
 * @param {Object} options - A list of options passed in by the user to the API
 * Controller
 *
 * @return {object} The public data of the org.
 */
function getOrgPublicData(org, options) {
  const permissions = (org.permissions) ? {} : undefined;
  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;
  let projects;

  // Loop through each permission key/value pair
  Object.keys(org.permissions || {}).forEach((u) => {
    // Return highest permission
    permissions[u] = org.permissions[u].pop();
  });

  // If org.createdBy is defined
  if (org.createdBy) {
    // If org.createdBy is populated
    if (typeof org.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(org.createdBy, {});
    }
    else {
      createdBy = org.createdBy;
    }
  }

  // If org.lastModifiedBy is defined
  if (org.lastModifiedBy) {
    // If org.lastModifiedBy is populated
    if (typeof org.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(org.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = org.lastModifiedBy;
    }
  }

  // If org.archivedBy is defined
  if (org.archivedBy && org.archived) {
    // If org.archivedBy is populated
    if (typeof org.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(org.archivedBy, {});
    }
    else {
      archivedBy = org.archivedBy;
    }
  }

  // Handle the virtual projects field
  if (org.projects) {
    // If all contents are objects (they should be)
    if (org.projects.every(p => typeof p === 'object')) {
      // If the archived option is supplied
      if (options.hasOwnProperty('archived') && options.archived === true) {
        projects = org.projects.map(p => getProjectPublicData(p, { archived: true }));
      }
      else {
        // Remove all archived projects
        const tmpContains = org.projects.filter(p => p.archived !== true);
        projects = tmpContains.map(p => getProjectPublicData(p, {}));
      }
    }
  }

  // Return the organization public fields
  const data = {
    id: org._id,
    name: org.name,
    permissions: permissions,
    custom: org.custom || {},
    createdOn: (org.createdOn) ? org.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (org.updatedOn) ? org.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: org.archived,
    archivedOn: (org.archivedOn) ? org.archivedOn.toString() : undefined,
    archivedBy: archivedBy,
    projects: projects
  };

  // If the fields options is defined
  if (options.hasOwnProperty('fields')) {
    // If fields should be excluded
    if (options.fields.every(f => f.startsWith('-'))) {
      // For each of those fields
      options.fields.forEach((f) => {
        // If -id, ignore it
        if (f === '-id') {
          return;
        }
        // Remove the field from data
        data[f.slice(1)] = undefined;
      });
    }
    // If only specific fields should be included
    else if (options.fields.every(f => !f.startsWith('-'))) {
      const returnObj = { id: data.id };
      // Add specific field to returnObj
      options.fields.forEach((f) => {
        returnObj[f] = (data.hasOwnProperty(f)) ? data[f] : undefined;
      });
      return returnObj;
    }
  }

  return data;
}

/**
 * @description Returns a users public data
 *
 * @param {object} user - The raw JSON of the user.
 * @param {Object} options - A list of options passed in by the user to the API
 * Controller
 *
 * @return {object} The public data of the user.
 */
function getUserPublicData(user, options) {
  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;

  // If user.createdBy is defined
  if (user.createdBy) {
    // If user.createdBy is populated
    if (typeof user.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(user.createdBy, {});
    }
    else {
      createdBy = user.createdBy;
    }
  }

  // If user.lastModifiedBy is defined
  if (user.lastModifiedBy) {
    // If user.lastModifiedBy is populated
    if (typeof user.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(user.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = user.lastModifiedBy;
    }
  }

  // If user.archivedBy is defined
  if (user.archivedBy && user.archived) {
    // If user.archivedBy is populated
    if (typeof user.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(user.archivedBy, {});
    }
    else {
      archivedBy = user.archivedBy;
    }
  }

  const data = {
    username: user._id,
    name: (user.fname && user.lname) ? user.name : undefined,
    fname: user.fname,
    preferredName: user.preferredName,
    lname: user.lname,
    email: user.email,
    custom: user.custom || {},
    createdOn: (user.createdOn) ? user.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (user.updatedOn) ? user.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: user.archived,
    archivedOn: (user.archivedOn) ? user.archivedOn.toString() : undefined,
    archivedBy: archivedBy,
    admin: user.admin,
    provider: user.provider
  };

  // If the fields options is defined
  if (options.hasOwnProperty('fields')) {
    // If fields should be excluded
    if (options.fields.every(f => f.startsWith('-'))) {
      // For each of those fields
      options.fields.forEach((f) => {
        // If -id, ignore it
        if (f === '-username') {
          return;
        }
        // Remove the field from data
        data[f.slice(1)] = undefined;
      });
    }
    // If only specific fields should be included
    else if (options.fields.every(f => !f.startsWith('-'))) {
      const returnObj = { username: data.username };
      // Add specific field to returnObj
      options.fields.forEach((f) => {
        returnObj[f] = (data.hasOwnProperty(f)) ? data[f] : undefined;
      });
      return returnObj;
    }
  }

  return data;
}
