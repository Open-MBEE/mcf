/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow html in description
/**
 * @classification UNCLASSIFIED
 *
 * @module models.project
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Jake Ursetta
 * @author Austin Bieber
 *
 * @description
 * <p>This module defines the project data model. Projects contain branches,
 * which in turn contain elements. Every project should have at least a master
 * branch, which stores the main copy of the model. Projects also have their own
 * permissions, a visibility level, and have the ability to store custom
 * meta-data.</p>
 *
 * <h4>Permissions</h4>
 * <p>Permissions are stored in a single object, where keys are user's usernames
 * and values are arrays containing the permissions a specific user has.
 * Permissions in MBEE are cascading, meaning if a user has write permissions
 * then they also have read.</p>
 *
 * <ul>
 *   <li><b>read</b>: The user can retrieve the project and see its data. The
 *   user is able to view the model on all branches.</li>
 *   <li><b>write</b>: The user can create, update and delete elements. They can
 *   also create, update and delete branches/tags.
 *   <li><b>admin</b>: The user can update/delete the project and update/remove
 *   user permissions on the project.
 * </ul>
 *
 * <h4>Visibility</h4>
 * <p>The project visibility is a field which allows for projects to be
 * referenced by other projects. The default visibility is private, meaning that
 * only users who have at least read permissions on the project can view the
 * model. The other option for visibility is "internal". If a project's
 * visibility is internal, any users in the organization can view the model.</p>
 *
 * <p>The biggest benefit to setting a project's visibility to internal is that
 * other models in the organization can create relationships which point to
 * elements in the internal project's model. Projects can only point to elements
 * on internal projects in their own organization or the "default"
 * organization.</p>
 *
 * <h4>Custom Data</h4>
 * <p>Custom data is designed to store any arbitrary JSON meta-data. Custom data
 * is stored in an object, and can contain any valid JSON the user desires.
 * Only project admins can update the custom data. The field "custom" is common
 * to all models, and is added through the extensions plugin.</p>
 */

// MBEE modules
const db = M.require('lib.db');
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');
const utils = M.require('lib.utils');


/* ----------------------------( Project Model )----------------------------- */

/**
 * @namespace
 *
 * @description Defines the Project Schema
 *
 * @property {string} _id - The project's non-unique id.
 * @property {string} org - A reference to the project's organization.
 * @property {string} name - The project's non-unique project name.
 * @property {object} permissions - An object whose keys identify a
 * projects's roles. The keys are the users username, and values are arrays of
 * given permissions.
 * @property {string} visibility - The visibility level of a project defining
 * its permissions behaviour.
 *
 */
const ProjectSchema = new db.Schema({
  _id: {
    type: 'String',
    required: true,
    validate: [{
      validator: function(v) {
        const projID = utils.parseID(v).pop();
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(projID);
      },
      message: 'Project ID cannot include the following words: '
      + `[${validators.reserved}].`
    }, {
      validator: function(v) {
        // If the ID is longer than max length, reject
        return v.length <= validators.project.idLength;
      },
      // Return a message, with calculated length of project ID (project.max - org.max - :)
      message: props => `Project ID length [${props.value.length - validators.org.idLength - 1}]`
        + ` must not be more than ${validators.project.idLength - validators.org.idLength - 1}`
        + ' characters.'
    }, {
      validator: function(v) {
        // If the ID is shorter than min length, reject
        return v.length > 4;
      },
      // Return a message, with calculated length of project ID (project.min - org.min - :)
      message: props => `Project ID length [${props.value.length - 3}] must not`
        + ' be less than 2 characters.'
    }, {
      validator: function(v) {
        if (typeof validators.project.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.project.id).test(v);
        }
        else {
          return validators.project.id(v);
        }
      },
      message: props => `Invalid project ID [${utils.parseID(props.value).pop()}].`
    }]
  },
  org: {
    type: 'String',
    ref: 'Organization',
    index: true,
    required: true,
    validate: [{
      validator: function(v) {
        if (typeof validators.org.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.org.id).test(v);
        }
        else {
          return validators.org.id(v);
        }
      },
      message: props => `${props.value} is not a valid org ID.`
    }]
  },
  name: {
    type: 'String',
    required: true
  },
  permissions: {
    type: 'Object',
    default: {},
    validate: [{
      validator: function(v) {
        let bool = true;
        // If the permissions object is not a JSON object, reject
        if (typeof v !== 'object' || Array.isArray(v) || v === null) {
          bool = false;
        }

        // Check that each every key/value pair's value is an array of strings
        Object.values(v).forEach((val) => {
          if (!Array.isArray(val) || !val.every(s => typeof s === 'string')) {
            bool = false;
          }
        });

        return bool;
      },
      message: props => 'The project permissions object is not properly formatted.'
    }]
  },
  visibility: {
    type: 'String',
    default: 'private',
    enum: ['private', 'internal']
  }
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
ProjectSchema.plugin(extensions);

/* ---------------------------( Project Methods )---------------------------- */
/**
 * @description Returns supported permission levels
 * @memberOf ProjectSchema
 */
ProjectSchema.static('getPermissionLevels', function() {
  return ['remove_all', 'read', 'write', 'admin'];
});

/**
 * @description Returns project fields that can be changed
 * @memberOf ProjectSchema
 */
ProjectSchema.static('getValidUpdateFields', function() {
  return ['name', 'custom', 'archived', 'permissions', 'visibility'];
});

/**
 * @description Returns supported visibility levels
 * @memberOf ProjectSchema
 */
ProjectSchema.static('getVisibilityLevels', function() {
  return ['internal', 'private'];
});

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf ProjectSchema
 */
ProjectSchema.static('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'org'];
});


/* ------------------------( Project Schema Export )------------------------- */

// Export model as "Project"
module.exports = new db.Model('Project', ProjectSchema, 'projects');
