/**
 * @classification UNCLASSIFIED
 *
 * @module lib.get-public-data
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Phillip Lee
 * @author Leah De Laurell
 * @author Connor Doyle
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
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The modified object.
 */
module.exports.getPublicData = function(object, type, options) {
  // If options is undefined, set it equal to an empty object
  if (options === undefined) {
    options = {}; // eslint-disable-line
  }

  // Call correct getPublicData() function
  switch (type.toLowerCase()) {
    case 'artifact':
      return getArtifactPublicData(object, options);
    case 'element':
      return getElementPublicData(object, options);
    case 'branch':
      return getBranchPublicData(object, options);
    case 'project':
      return getProjectPublicData(object, options);
    case 'org':
      return getOrgPublicData(object, options);
    case 'user':
      return getUserPublicData(object, options);
    case 'webhook':
      return getWebhookPublicData(object, options);
    default:
      throw new M.DataFormatError(`Invalid model type [${type}]`, 'warn');
  }
};

/**
 * @description Returns an artifacts public data.
 *
 * @param {object} artifact - The raw JSON of the artifact.
 * @param {object} options - A list of options passed in by the user to
 * the API Controller.
 *
 * @returns {object} The public data of the artifact.
 */
function getArtifactPublicData(artifact, options) {
  // Parse the artifact ID
  const idParts = utils.parseID(artifact._id);

  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;
  let project;
  let branch;

  // If artifact.createdBy is defined
  if (artifact.createdBy) {
    // If artifact.createdBy is populated
    if (typeof artifact.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(artifact.createdBy, {});
    }
    else {
      createdBy = artifact.createdBy;
    }
  }

  // If artifact.lastModifiedBy is defined
  if (artifact.lastModifiedBy) {
    // If artifact.lastModifiedBy is populated
    if (typeof artifact.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(artifact.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = artifact.lastModifiedBy;
    }
  }

  // If artifact.archivedBy is defined
  if (artifact.archivedBy && artifact.archived) {
    // If artifact.archivedBy is populated
    if (typeof artifact.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(artifact.archivedBy, {});
    }
    else {
      archivedBy = artifact.archivedBy;
    }
  }

  // If artifact.branch is defined
  if (artifact.branch) {
    // If artifact.branch is populated
    if (typeof artifact.branch === 'object') {
      // Get the public data of branch
      branch = getBranchPublicData(artifact.branch, {});
    }
    else {
      branch = utils.parseID(artifact.branch).pop();
    }
  }

  // If artifact.project is defined
  if (artifact.project) {
    // If artifact.project is populated
    if (typeof artifact.project === 'object') {
      // Get the public data of project
      project = getProjectPublicData(artifact.project, {});
    }
    else {
      project = idParts[1];
    }
  }

  const data = {
    id: idParts.pop(),
    description: artifact.description,
    size: artifact.size,
    branch: branch,
    project: project,
    org: idParts[0],
    filename: artifact.filename,
    location: artifact.location,
    strategy: artifact.strategy,
    custom: artifact.custom || {},
    createdOn: (artifact.createdOn) ? artifact.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (artifact.updatedOn) ? artifact.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: artifact.archived,
    archivedOn: (artifact.archivedOn) ? artifact.archivedOn.toString() : undefined,
    archivedBy: archivedBy

  };

  // Handle the virtual referencedBy field
  if (artifact.referencedBy) {
    // If all contents are objects (they should be)
    if (artifact.referencedBy.every(a => typeof a === 'object')) {
      // If the includeArchived option is supplied
      if (options.hasOwnProperty('includeArchived') && options.includeArchived === true) {
        data.referencedBy = artifact.referencedBy.map(a => getElementPublicData(a, {}));
      }
      else {
        // Remove all archived elements
        const nonArchivedElements = artifact.referencedBy.filter(a => a.archived !== true);
        data.referencedBy = nonArchivedElements.map(a => getElementPublicData(a, {}));
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
 * @description Returns an elements public data.
 *
 * @param {object} element - The raw JSON of the element.
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The public data of the element.
 */
function getElementPublicData(element, options) {
  // Parse the element ID
  const idParts = utils.parseID(element._id);

  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;
  let parent = null;
  let source;
  let sourceNamespace;
  let target;
  let targetNamespace;
  let project;
  let branch;
  let artifact;

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
    // If element.source is populated
    if (typeof element.source === 'object') {
      // Get the public data of source
      source = getElementPublicData(element.source, {});
    }
    else {
      const sourceIdParts = utils.parseID(element.source);
      // If source element's project is not the same as the elements parent
      if (sourceIdParts[1] !== idParts[1]) {
        // Set source to object with org, project and element id
        source = sourceIdParts.pop();
        sourceNamespace = {
          org: sourceIdParts[0],
          project: sourceIdParts[1],
          branch: sourceIdParts[2]
        };
      }
      else {
        // Set source to just the element id
        source = sourceIdParts.pop();
      }
    }
  }

  // If element.target is defined
  if (element.target) {
    // If element.target is populated
    if (typeof element.target === 'object') {
      // Get the public data of target
      target = getElementPublicData(element.target, {});
    }
    else {
      const targetIdParts = utils.parseID(element.target);
      // If target element's project is not the same as the elements parent
      if (targetIdParts[1] !== idParts[1]) {
        // Set target to object with org, project and element id
        target = targetIdParts.pop();
        targetNamespace = {
          org: targetIdParts[0],
          project: targetIdParts[1],
          branch: targetIdParts[2]
        };
      }
      else {
        // Set target to just the element id
        target = targetIdParts.pop();
      }
    }
  }

  // If element.branch is defined
  if (element.branch) {
    // If element.branch is populated
    if (typeof element.branch === 'object') {
      // Get the public data of branch
      branch = getBranchPublicData(element.branch, {});
    }
    else {
      branch = utils.parseID(element.branch).pop();
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

  // If element.artifact is defined
  if (element.artifact) {
    // If element.artifact is populated
    if (typeof element.artifact === 'object') {
      // Get the public data of parent
      artifact = getArtifactPublicData(element.artifact, {});
    }
    else {
      artifact = utils.parseID(element.artifact).pop();
    }
  }

  const data = {
    id: idParts.pop(),
    name: element.name,
    branch: branch,
    project: project,
    org: idParts[0],
    parent: parent,
    source: source,
    sourceNamespace: sourceNamespace,
    target: target,
    targetNamespace: targetNamespace,
    type: element.type,
    documentation: element.documentation,
    custom: element.custom || {},
    createdOn: (element.createdOn) ? element.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (element.updatedOn) ? element.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: element.archived,
    archivedOn: (element.archivedOn) ? element.archivedOn.toString() : undefined,
    archivedBy: archivedBy,
    artifact: artifact

  };

  // Handle the virtual contains field
  if (element.contains) {
    // If all contents are objects (they should be)
    if (element.contains.every(e => typeof e === 'object')) {
      // If the archived option is supplied
      if (options.hasOwnProperty('includeArchived') && options.includeArchived === true) {
        // If the user specified 'contains' in the populate field of options
        if (options.populate && options.populate.includes('contains')) {
          data.contains = element.contains.map(e => getElementPublicData(e, {}));
        }
        else {
          data.contains = element.contains.map(e => utils.parseID(e._id).pop());
        }
      }
      else {
        // Remove all archived elements
        const tmpContains = element.contains.filter(e => e.archived !== true);
        if (options.populate && options.populate.includes('contains')) {
          data.contains = tmpContains.map(e => getElementPublicData(e, {}));
        }
        else {
          data.contains = tmpContains.map(e => utils.parseID(e._id).pop());
        }
      }
    }
  }

  // Handle the virtual sourceOf field
  if (element.sourceOf) {
    // If all contents are objects (they should be)
    if (element.sourceOf.every(e => typeof e === 'object')) {
      // If the archived option is supplied
      if (options.hasOwnProperty('includeArchived') && options.includeArchived === true) {
        // If user is populating sourceOf, return objects else just ids
        if (options.populate && options.populate.includes('sourceOf')) {
          data.sourceOf = element.sourceOf.map(e => getElementPublicData(e, {}));
        }
        else {
          data.sourceOf = element.sourceOf.map(e => utils.parseID(e._id).pop());
        }
      }
      else {
        // Remove all archived elements
        const tmpSourceOf = element.sourceOf.filter(e => e.archived !== true);
        // If user is populating sourceOf, return objects else just ids
        if (options.populate && options.populate.includes('sourceOf')) {
          data.sourceOf = tmpSourceOf.map(e => getElementPublicData(e, {}));
        }
        else {
          data.sourceOf = tmpSourceOf.map(e => utils.parseID(e._id).pop());
        }
      }
    }
  }

  // Handle the virtual targetOf field
  if (element.targetOf) {
    // If all contents are objects (they should be)
    if (element.targetOf.every(e => typeof e === 'object')) {
      // If the archived option is supplied
      if (options.hasOwnProperty('includeArchived') && options.includeArchived === true) {
        // If user is populating targetOf, return objects else just ids
        if (options.populate && options.populate.includes('targetOf')) {
          data.targetOf = element.targetOf.map(e => getElementPublicData(e, {}));
        }
        else {
          data.targetOf = element.targetOf.map(e => utils.parseID(e._id).pop());
        }
      }
      else {
        // Remove all archived elements
        const tmpTargetOf = element.targetOf.filter(e => e.archived !== true);
        // If user is populating targetOf, return objects else just ids
        if (options.populate && options.populate.includes('targetOf')) {
          data.targetOf = tmpTargetOf.map(e => getElementPublicData(e, {}));
        }
        else {
          data.targetOf = tmpTargetOf.map(e => utils.parseID(e._id).pop());
        }
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
 * @description Returns a branch public data.
 *
 * @param {object} branch - The raw JSON of the branch.
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The public data of the branch.
 */
function getBranchPublicData(branch, options) {
  // Parse the branch ID
  const idParts = utils.parseID(branch._id);
  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;
  let project;
  let source;

  // If branch.createdBy is defined
  if (branch.createdBy) {
    // If branch.createdBy is populated
    if (typeof branch.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(branch.createdBy, {});
    }
    else {
      createdBy = branch.createdBy;
    }
  }

  // If branch.lastModifiedBy is defined
  if (branch.lastModifiedBy) {
    // If branch.lastModifiedBy is populated
    if (typeof branch.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(branch.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = branch.lastModifiedBy;
    }
  }

  // If branch.archivedBy is defined
  if (branch.archivedBy && branch.archived) {
    // If branch.archivedBy is populated
    if (typeof branch.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(branch.archivedBy, {});
    }
    else {
      archivedBy = branch.archivedBy;
    }
  }

  // If branch.project is defined
  if (branch.project) {
    // If branch.project is populated
    if (typeof branch.project === 'object') {
      // Get the public data of project
      project = getProjectPublicData(branch.project, {});
    }
    else {
      project = utils.parseID(branch.project)[1];
    }
  }

  // If branch.source is defined
  if (branch.source) {
    // If branch.source is populated
    if (typeof branch.source === 'object') {
      // Get the public data of branch
      source = getBranchPublicData(branch.source, {});
    }
    else {
      source = utils.parseID(branch.source).pop();
    }
  }

  // Return the branches public fields
  const data = {
    id: idParts.pop(),
    name: branch.name,
    org: idParts[0],
    project: project,
    source: source,
    tag: branch.tag,
    custom: branch.custom || {},
    createdOn: (branch.createdOn) ? branch.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (branch.updatedOn) ? branch.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: branch.archived,
    archivedOn: (branch.archivedOn) ? branch.archivedOn.toString() : undefined,
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
 * @description Returns a projects public data.
 *
 * @param {object} project - The raw JSON of the project.
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The public data of the project.
 */
function getProjectPublicData(project, options) {
  const permissions = (project.permissions) ? {} : undefined;
  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;

  // Loop through each permission key/value pair
  Object.keys(project.permissions || {}).forEach((u) => {
    // Return highest permission
    if (project.permissions[u].includes('admin')) {
      permissions[u] = 'admin';
    }
    else if (project.permissions[u].includes('write')) {
      permissions[u] = 'write';
    }
    else {
      permissions[u] = 'read';
    }
  });

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
 * @description Returns an orgs public data.
 *
 * @param {object} org - The raw JSON of the org.
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The public data of the org.
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
    if (org.permissions[u].includes('admin')) {
      permissions[u] = 'admin';
    }
    else if (org.permissions[u].includes('write')) {
      permissions[u] = 'write';
    }
    else {
      permissions[u] = 'read';
    }
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
      if (options.hasOwnProperty('includeArchived') && options.includeArchived === true) {
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
 * @description Returns a users public data.
 *
 * @param {object} user - The raw JSON of the user.
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The public data of the user.
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
    provider: user.provider,
    failedlogins: (options.failedlogins) ? user.failedlogins : undefined
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

/**
 * @description Returns a webhook's public data.
 *
 * @param {object} webhook - The raw JSON of the webhook.
 * @param {object} options - A list of options passed in by the user to the API Controller.
 *
 * @returns {object} The public data of the webhook.
 */
function getWebhookPublicData(webhook, options) {
  let reference = {};
  let createdBy = null;
  let lastModifiedBy = null;
  let archivedBy;

  // Parse webhook reference
  if (!webhook.reference || webhook.reference === '') {
    reference = '';
  }
  else {
    const ids = utils.parseID(webhook.reference);
    reference.org = ids.shift();
    if (ids.length) reference.project = ids.shift();
    if (ids.length) reference.branch = ids.shift();
  }

  // If webhook.createdBy is defined
  if (webhook.createdBy) {
    // If webhook.createdBy is populated
    if (typeof webhook.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = getUserPublicData(webhook.createdBy, {});
    }
    else {
      createdBy = webhook.createdBy;
    }
  }

  // If webhook.lastModifiedBy is defined
  if (webhook.lastModifiedBy) {
    // If webhook.lastModifiedBy is populated
    if (typeof webhook.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = getUserPublicData(webhook.lastModifiedBy, {});
    }
    else {
      lastModifiedBy = webhook.lastModifiedBy;
    }
  }

  // If webhook.archivedBy is defined
  if (webhook.archivedBy && webhook.archived) {
    // If webhook.archivedBy is populated
    if (typeof webhook.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = getUserPublicData(webhook.archivedBy, {});
    }
    else {
      archivedBy = webhook.archivedBy;
    }
  }

  // Return the webhook public fields
  const data = {
    id: webhook._id,
    name: webhook.name,
    type: webhook.type,
    description: webhook.description,
    triggers: webhook.triggers,
    response: webhook.response ? webhook.response : undefined,
    token: webhook.token ? webhook.token : undefined,
    tokenLocation: webhook.tokenLocation ? webhook.tokenLocation : undefined,
    reference: reference,
    custom: webhook.custom || {},
    createdOn: (webhook.createdOn) ? webhook.createdOn.toString() : undefined,
    createdBy: createdBy,
    updatedOn: (webhook.updatedOn) ? webhook.updatedOn.toString() : undefined,
    lastModifiedBy: lastModifiedBy,
    archived: webhook.archived,
    archivedOn: (webhook.archivedOn) ? webhook.archivedOn.toString() : undefined,
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
