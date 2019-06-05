/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.validators
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines validators - common regular expressions and
 * helper functions - used to validate data within MBEE.
 */

// MBEE modules
const utils = require('./utils');

// If validators isn't defined, just set custom to an empty object.
const customValidators = M.config.validators || {};

// This ID is used as the common regex for other ID fields in this module
const id = customValidators.id || '([_a-z0-9])([-_a-z0-9]){0,}';

// A list of reserved keywords which cannot be used in ids
module.exports.reserved = ['css', 'js', 'img', 'doc', 'docs', 'webfonts',
  'login', 'about', 'assets', 'static', 'public', 'api', 'organizations',
  'orgs', 'projects', 'users', 'plugins', 'ext', 'extension', 'search',
  'whoami', 'profile', 'edit', 'proj', 'elements', 'branch'];

/**
 * @description Regular Expressions to validate organization data
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
module.exports.org = {
  id: customValidators.org_id || `^${id}$`
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
module.exports.project = {
  id: customValidators.project_id || `^${id}${utils.ID_DELIMITER}${id}$`
};


/**
 * @description Regular Expressions to validate element data
 *
 * id:
 *   - MUST start with a lowercase letter, number or '_'
 *   - MUST only include lowercase letters, numbers, '_' or '-'
 *   - each segment MUST be of length 1 or more
 *   Examples:
 *      - orgid:projid:elementid [valid]
 *      - orgid:projid:my-element [valid]
 *      - orgid:projid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6 [valid]
 *      - orgid:projid:-element [invalid - must start with a letter or a number]
 *      - orgid:projid:myElement [invalid - cannot use uppercase characters]
 *      - my-element [invalid - must contain org and proj segments]
 */
module.exports.element = {
  id: customValidators.element_id || `^${id}${utils.ID_DELIMITER}${id}${utils.ID_DELIMITER}${id}$`
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
module.exports.user = {
  username: customValidators.user_username || '^([a-z])([a-z0-9_]){0,}$',
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
module.exports.url = {
  // starts with one and only one '/'
  next: customValidators.url_next || '^(\/)(?!\/)' // eslint-disable-line no-useless-escape
};
