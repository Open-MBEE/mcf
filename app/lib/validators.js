/**
 * @classification UNCLASSIFIED
 *
 * @module lib.validators
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Austin Bieber
 * @author Connor Doyle
 * @author Phillip Lee
 *
 * @description This file defines validators - common regular expressions and
 * helper functions - used to validate data within MBEE.
 */
/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow lists in descriptions

// MBEE modules
const utils = M.require('lib.utils');
const artifactVal = M.require(`artifact.${M.config.artifact.strategy}`).validator;

// If validators isn't defined, just set custom to an empty object.
const customValidators = M.config.validators || {};

// This ID is used as the common regex for other ID fields in this module
const id = customValidators.id || '([_a-z0-9])([-_a-z0-9.]){0,}';
const idLength = customValidators.id_length || 36;

// A list of reserved keywords which cannot be used in ids
const reservedKeywords = ['css', 'js', 'img', 'doc', 'docs', 'webfonts',
  'login', 'about', 'assets', 'static', 'public', 'api', 'organizations',
  'orgs', 'projects', 'users', 'plugins', 'ext', 'extension', 'search',
  'whoami', 'profile', 'edit', 'proj', 'elements', 'branch', 'anonymous',
  'blob', 'artifact', 'artifacts'];

// Create a validator function to test ids against the reserved keywords
const reserved = function(data) {
  const parsedId = utils.parseID(data).pop();
  return !reservedKeywords.includes(parsedId);
};


// The custom data validator used in all models
const customDataValidator = function(v) {
  // Must be an object and not null
  return (typeof v === 'object' && v !== null);
};

/**
 * @description Validator function for permissions on orgs and projects.
 *
 * @param {object} data - The data to validate.
 * @returns {boolean} Returns true if data is valid.
 */
const permissionsValidator = function(data) {
  let bool = true;
  // If the permissions object is not a JSON object, reject
  if (typeof data !== 'object' || Array.isArray(data) || data === null) {
    bool = false;
  }
  // Check that each every key/value pair's value is an array of strings
  Object.values(data).forEach((val) => {
    if (!Array.isArray(val) || !val.every(s => typeof s === 'string')) {
      bool = false;
    }
  });

  return bool;
};

/**
 * @description Regular Expressions to validate organization data and corresponding validator
 * functions.
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - MUST be of length 1 or more
 *   Examples:
 *     - org1 [valid]
 *     - my-org [valid]
 *     - f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *     - myOrg [invalid - uses uppercase letter]
 */
const org = {
  id: customValidators.org_id
    ? `^${customValidators.org_id}$`
    : `^${id}$`,
  idLength: customValidators.org_id_length || idLength,
  _id: {
    reserved: reserved,
    match: function(data) {
      // If the ID is invalid, reject
      return RegExp(org.id).test(data);
    },
    maxLength: function(data) {
      // If the ID is longer than max length, reject
      return data.length <= org.idLength;
    },
    minLength: function(data) {
      // If the ID is shorter than min length, reject
      return data.length > 1;
    }
  },
  permissions: permissionsValidator,
  custom: customDataValidator
};

/**
 * @description Regular Expressions to validate project data and corresponding validator functions.
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - Must be of length 1 or more
 *   - The following reserved words are not valid: "edit"
 *   Examples:
 *      - project1 [valid]
 *      - my-project [valid]
 *      - f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - -project [invalid - must start with a letter or a number]
 *      - myProject [invalid - cannot use uppercase characters]
 */
const project = {
  id: customValidators.project_id
    ? `${org.id.slice(0, -1)}${utils.ID_DELIMITER}${customValidators.project_id}$`
    : `${org.id.slice(0, -1)}${utils.ID_DELIMITER}${id}$`,
  idLength: org.idLength + utils.ID_DELIMITER.length
  + (customValidators.project_id_length ? parseInt(customValidators.project_id_length, 10)
    : idLength),
  _id: {
    reserved: reserved,
    match: function(data) {
      // If the ID is invalid, reject
      return RegExp(project.id).test(data);
    },
    maxLength: function(data) {
      // If the ID is longer than max length, reject
      return data.length <= project.idLength;
    },
    minLength: function(data) {
      // If the ID is shorter than min length, reject
      return data.length > 4;
    }
  },
  org: org._id.match,
  permissions: permissionsValidator,
  custom: customDataValidator
};

/**
 * @description Regular Expressions to validate branch data and corresponding validator functions.
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 1 or more
 *   Examples:
 *      - orgid:projectid:branchid [valid]
 *      - orgid:projectid:my-branch [valid]
 *      - orgid:projectid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projectid:-branch[invalid - must start with a letter or a number]
 *      - orgid:projectid:myBranch [invalid - cannot use uppercase characters]
 *      - my-branch [invalid - must contain org and proj segments]
 */
const branch = {
  id: customValidators.branch_id
    ? `${project.id.slice(0, -1)}${utils.ID_DELIMITER}${customValidators.branch_id}$`
    : `${project.id.slice(0, -1)}${utils.ID_DELIMITER}${id}$`,
  idLength: project.idLength + utils.ID_DELIMITER.length
    + (customValidators.branch_id_length ? parseInt(customValidators.branch_id_length, 10)
      : idLength),
  _id: {
    reserved: reserved,
    match: function(data) {
      // If the ID is invalid, reject
      return RegExp(branch.id).test(data);
    },
    maxLength: function(data) {
      // If the ID is longer than max length, reject
      return data.length <= branch.idLength;
    },
    minLength: function(data) {
      // If the ID is shorter than min length, reject
      return data.length > 7;
    }
  },
  project: project._id.match,
  source: function(data) {
    // Allow either null or a matching id
    return data === null || RegExp(branch.id).test(data);
  },
  custom: customDataValidator
};

/**
 * @description Regular Expressions to validate artifact data and corresponding validator
 * functions.
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 1 or more
 *   Examples:
 *      - orgid:projectid:branchid:artifactid [valid]
 *      - orgid:projectid:branchid:my-artifact [valid]
 *      - orgid:projectid:branchid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projectid:branchid:-artifact [invalid - must start with a letter or a number]
 *      - orgid:projectid:branchid:myArtifact [invalid - cannot use uppercase characters]
 *      - my-artifact [invalid - must contain org, proj, and branch segments]
 */
const artifact = {
  id: customValidators.artifact_id
    ? `${branch.id.slice(0, -1)}${utils.ID_DELIMITER}${customValidators.artifact_id}$`
    : `${branch.id.slice(0, -1)}${utils.ID_DELIMITER}${id}$`,
  idLength: branch.idLength + utils.ID_DELIMITER.length
    + (customValidators.artifact_id_length ? parseInt(customValidators.artifact_id_length, 10)
      : idLength),
  locationRegEx: (artifactVal.location) ? artifactVal.location : '^[^.]+$',
  filenameRegEx: (artifactVal.filename) ? artifactVal.filename : '^[^!\\<>:"\'|?*]+$',
  extension: (artifactVal.extension) ? artifactVal.extension : '^[^!\\<>:"\'|?*]+[.][\\w]+$',
  _id: {
    reserved: reserved,
    match: function(data) {
      // If the ID is invalid, reject
      return RegExp(artifact.id).test(data);
    },
    optionalMatch: function(data) {
      // Allow either null or a matching id
      return data === null || RegExp(artifact.id).test(data);
    },
    maxLength: function(data) {
      // If the ID is longer than max length, reject
      return data.length <= artifact.idLength;
    },
    minLength: function(data) {
      // If the ID is shorter than min length, reject
      return data.length > 10;
    }
  },
  project: project._id.match,
  branch: branch._id.match,
  filename: function(data) {
    // If the filename is improperly formatted, reject
    return (RegExp(artifact.filenameRegEx).test(data)
      && RegExp(artifact.extension).test(data));
  },
  location: function(data) {
    // If the location is improperly formatted, reject
    return RegExp(artifact.locationRegEx).test(data);
  }
};

/**
 * @description Regular Expressions to validate element data and corresponding validator functions.
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 2 or more
 *   Examples:
 *      - orgid:projectid:branchid:elementid [valid]
 *      - orgid:projectid:branchid:my-element [valid]
 *      - orgid:projectid:branchid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projectid:branchid:-element [invalid - must start with a letter or a number]
 *      - orgid:projectid:branchid:myElement [invalid - cannot use uppercase characters]
 *      - my-element [invalid - must contain org, proj, and branch segments]
 */
const element = {
  id: customValidators.element_id
    ? `${branch.id.slice(0, -1)}${utils.ID_DELIMITER}${customValidators.element_id}$`
    : `${branch.id.slice(0, -1)}${utils.ID_DELIMITER}${id}$`,
  idLength: branch.idLength + utils.ID_DELIMITER.length
  + (customValidators.element_id_length ? parseInt(customValidators.element_id_length, 10)
    : idLength),
  custom: customDataValidator,
  _id: {
    reserved: reserved,
    match: function(data) {
      // If the ID is invalid, reject
      return RegExp(element.id).test(data);
    },
    optionalMatch: function(data) {
      // Allow either null or a matching id
      return data === null || RegExp(element.id).test(data);
    },
    maxLength: function(data) {
      // If the ID is longer than max length, reject
      return data.length <= element.idLength;
    },
    minLength: function(data) {
      // If the ID is shorter than min length, reject
      return data.length > 10;
    }
  },
  project: project._id.match,
  branch: branch._id.match,
  artifact: () => artifact._id.optionalMatch
};
// Define parent, source, and target after so that they can access element._id.optionalMatch
element.parent = element._id.optionalMatch;
element.source = {
  id: element._id.optionalMatch,
  target: function(data) {
    // If source is provided
    if (data) {
      // Reject if target is null
      return this.target;
    }
    // Source null, return true
    return true;
  }
};
element.target = {
  id: element._id.optionalMatch,
  source: function(data) {
    // If target is provided
    if (data) {
      // Reject if source is null
      return this.source;
    }
    // Target null, return true
    return true;
  }
};

/**
 * @description Regular Expressions to validate user data
 *
 * username:
 *   - MUST start with a lowercase letter
 *   - MUST only include lowercase letters, numbers, or underscores
 *   - MUST be of length 1 or more
 * email:
 *   - MUST be a valid email address
 * name:
 *   - MUST start with a lowercase letter or uppercase letter
 *   - MUST only contain lowercase letters, uppercase letters, '-', or whitespace
 */
const user = {
  username: customValidators.user_username || '^([a-z])([a-z0-9_]){0,}$',
  usernameLength: customValidators.user_username_length || idLength,
  email: customValidators.user_email || '^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})$',
  firstName: customValidators.user_fname || '^(([a-zA-Z])([-a-zA-Z ])*)?$',
  lastName: customValidators.user_lname || '^(([a-zA-Z])([-a-zA-Z ])*)?$',
  _id: {
    reserved: reserved,
    match: function(data) {
      // If the username is invalid, reject
      return RegExp(user.username).test(data);
    },
    maxLength: function(data) {
      // If the username is longer than max length, reject
      return data.length <= user.usernameLength;
    },
    minLength: function(data) {
      // If the username is shorter than min length, reject
      return data.length > 2;
    }
  },
  fname: function(data) {
    // If the fname is invalid and provided, reject
    return !(!RegExp(user.firstName).test(data) && data);
  },
  preferredName: function(data) {
    // If the fname is invalid and provided, reject
    return !(!RegExp(user.firstName).test(data) && data);
  },
  lname: function(data) {
    // If the fname is invalid and provided, reject
    return !(!RegExp(user.lastName).test(data) && data);
  },
  provider: function(data) {
    // If the user provider is defined and does not include value, return false
    return !(customValidators.user_provider && !customValidators.user_provider.includes(data));
  },
  custom: customDataValidator
};

/**
 * @description Functions to validate webhook data
 *
 * type:
 *   - Must be either the string "Outgoing" or "Incoming"
 * triggers:
 *   - MUST be an array of strings
 * responses:
 *   - MUST be an array of objects that have at least a url field
 * token:
 *   - MUST be a string
 * tokenLocation:
 *   - MUST be a string
 */
const webhook = {
  type: {
    outgoing: function(data) {
      // An outgoing webhook must have a response object and cannot have a token or tokenLocation.
      return data === 'Outgoing'
        ? typeof this.response === 'object' && this.response !== null
        && !(this.token || this.tokenLocation)
        : true;
    },
    incoming: function(data) {
      // An incoming webhook must have a token and tokenLocation and cannot have a response field.
      return data === 'Incoming'
        ? (typeof this.token === 'string' && typeof this.tokenLocation === 'string')
        && this.response === undefined
        : true;
    }
  },
  triggers: function(data) {
    return Array.isArray(data) && data.every((s) => typeof s === 'string');
  },
  response: {
    object: function(data) {
      return typeof data === 'object' && !Array.isArray(data) && data !== null;
    },
    url: function(data) {
      return typeof data.url === 'string';
    },
    method: function(data) {
      if (data.method === undefined) {
        data.method = 'POST';
      }
      return ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(data.method);
    },
    headers: function(data) {
      if (data.headers === undefined) {
        data.headers = { 'Content-Type': 'application/json' };
      }
      return typeof data.headers === 'object' && !Array.isArray(data) && data.headers !== null;
    },
    token: function(data) {
      // If the response field has a token, it must be a string
      return data.token !== undefined ? typeof data.token === 'string' : true;
    },
    ca: function(data) {
      // If the response field has a ca, it must be a string
      return data.ca !== undefined ? typeof data.ca === 'string' : true;
    },
    data: function(data) {
      // If the response field has a data field, it must be an object
      return data.data !== undefined ? typeof data.data === 'object' : true;
    },
    validFields: function(data) {
      // Ensure only the response only has valid fields
      const keys = Object.keys(data);
      const validKeys = ['url', 'method', 'headers', 'token', 'ca', 'data'];
      for (let i = 0; i < keys.length; i++) {
        if (!(validKeys.includes(keys[i]))) return false;
      }
      return true;
    }

  },
  token: function(data) {
    // Protect against null entries
    return typeof data === 'string';
  },
  tokenLocation: function(data) {
    // Protect against null entries
    return typeof data === 'string';
  },
  reference: function(data) {
    return (data === '' || RegExp(org.id).test(data)
      || RegExp(project.id).test(data) || RegExp(branch.id).test(data));
  }
};

/**
 * @description Regular Expressions to validate url data
 *
 * next:
 *   - MUST start with one and only one '/'
 *   Examples:
 *     - /login [valid]
 *     - https://lockheedmartin.com [invalid - cannot use external URLs]
 */
const url = {
  // starts with one and only one '/'
  next: customValidators.url_next || '^(\/)(?!\/)' // eslint-disable-line no-useless-escape
};


module.exports = {
  org,
  project,
  branch,
  artifact,
  element,
  user,
  webhook,
  url,
  id,
  idLength
};
