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
const reserved = ['css', 'js', 'img', 'doc', 'docs', 'webfonts',
  'login', 'about', 'assets', 'static', 'public', 'api', 'organizations',
  'orgs', 'projects', 'users', 'plugins', 'ext', 'extension', 'search',
  'whoami', 'profile', 'edit', 'proj', 'elements', 'branch', 'anonymous',
  'blob', 'artifact', 'artifacts'];

/**
 * @description Regular Expressions to validate organization data.
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
  id: customValidators.org_id || `^${id}$`,
  idLength: customValidators.org_id_length || idLength
};

/**
 * @description Regular Expressions to validate project data
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
  id: customValidators.project_id || `^${id}${utils.ID_DELIMITER}${id}$`,
  idLength: org.idLength + utils.ID_DELIMITER.length
  + (customValidators.project_id_length ? customValidators.project_id_length : idLength)
};

/**
 * @description Regular Expressions to validate branch data
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 1 or more
 *   Examples:
 *      - orgid:projid:branchid [valid]
 *      - orgid:projid:my-branch [valid]
 *      - orgid:projid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projid:-branch[invalid - must start with a letter or a number]
 *      - orgid:projid:myBranch [invalid - cannot use uppercase characters]
 *      - my-branch [invalid - must contain org and proj segments]
 */
const branch = {
  id: customValidators.branch_id || `^${id}${utils.ID_DELIMITER}${id}${utils.ID_DELIMITER}${id}$`,
  idLength: project.idLength + utils.ID_DELIMITER.length
    + (customValidators.branch_id_length ? customValidators.branch_id_length : idLength)
};

/**
 * @description Regular Expressions to validate artifact data
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 1 or more
 *   Examples:
 *      - orgid:projid:branchid:artifactid [valid]
 *      - orgid:projid:branchid:my-artifact [valid]
 *      - orgid:projid:branchid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projid:branchid:-artifact [invalid - must start with a letter or a number]
 *      - orgid:projid:branchid:myArtifact [invalid - cannot use uppercase characters]
 *      - my-artifact [invalid - must contain org, proj, and branch segments]
 */
const artifact = {
  id: customValidators.artifact_id || `^${id}${utils.ID_DELIMITER}${id}${utils.ID_DELIMITER}${id}${utils.ID_DELIMITER}${id}$`,
  idLength: branch.idLength + utils.ID_DELIMITER.length
    + (customValidators.artifact_id_length ? customValidators.artifact_id_length : idLength),
  location: (artifactVal.location) ? artifactVal.location : '^[^.]+$',
  filename: (artifactVal.filename) ? artifactVal.filename : '^[^!\\<>:"\'|?*]+$',
  extension: (artifactVal.extension) ? artifactVal.extension : '^[\\w]+[.][\\w]+$'
};

/**
 * @description Regular Expressions to validate element data
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 1 or more
 *   Examples:
 *      - orgid:projid:branchid:elementid [valid]
 *      - orgid:projid:branchid:my-element [valid]
 *      - orgid:projid:branchid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projid:branchid:-element [invalid - must start with a letter or a number]
 *      - orgid:projid:branchid:myElement [invalid - cannot use uppercase characters]
 *      - my-element [invalid - must contain org, proj, and branch segments]
 */
const element = {
  id: customValidators.element_id || `^${id}${utils.ID_DELIMITER}${id}${utils.ID_DELIMITER}${id}${utils.ID_DELIMITER}${id}$`,
  idLength: branch.idLength + utils.ID_DELIMITER.length
  + (customValidators.element_id_length ? customValidators.element_id_length : idLength)
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
  fname: customValidators.user_fname || '^(([a-zA-Z])([-a-zA-Z ])*)?$',
  lname: customValidators.user_lname || '^(([a-zA-Z])([-a-zA-Z ])*)?$',
  provider: function(v) {
    // If the use provider is defined and does not include value, return false
    return !(customValidators.user_provider && !customValidators.user_provider.includes(v));
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
  reserved,
  org,
  project,
  branch,
  artifact,
  element,
  user,
  url
};
