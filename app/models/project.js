/**
 * Classification: UNCLASSIFIED
 *
 * @module models.project
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the project data model.
 */

// NPM modules
const mongoose = require('mongoose');

// MBEE modules
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
 * @property {Object} permissions - An object whose keys identify a
 * projects's roles. The keys are the users username, and values are arrays of
 * given permissions.
 * @property {string[]} projectReferences - An array of references to other
 * projects within the same org. Elements in those projects are able to be
 * source and targets of elements in this project. NOTE: The referenced projects
 * visibility level must be 'internal'.
 * @property {Object} custom - JSON used to store additional data.
 * @property {string} visibility - The visibility level of a project defining
 * its permissions behaviour.
 *
 */
const ProjectSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    match: RegExp(validators.project.id),
    maxlength: [73, 'Too many characters in ID'],
    minlength: [5, 'Too few characters in ID'],
    validate: {
      validator: function(v) {
        const projID = utils.parseID(v).pop();
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(projID);
      },
      message: 'Project ID cannot include the following words: '
      + `[${validators.reserved}].`
    }
  },
  org: {
    type: String,
    ref: 'Organization',
    required: true,
    set: function(_org) {
      // Check value undefined
      if (typeof this.org === 'undefined') {
        // Return value to set it
        return _org;
      }
      // Check value NOT equal to db value
      if (_org !== this.org) {
        // Immutable field, return error
        throw new M.CustomError('Assigned org cannot be changed.', 403, 'warn');
      }
      // No change, return the value
      return this.org;
    }
  },
  name: {
    type: String,
    required: true
  },
  permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  projectReferences: [{
    type: String,
    ref: 'Project'
  }],
  custom: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  visibility: {
    type: String,
    default: 'private'
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
ProjectSchema.methods.getPermissionLevels = function() {
  return ['remove_all', 'read', 'write', 'admin'];
};
ProjectSchema.statics.getPermissionLevels = function() {
  return ProjectSchema.methods.getPermissionLevels();
};

/**
 * @description Returns project fields that can be changed
 * @memberOf ProjectSchema
 */
ProjectSchema.methods.getValidUpdateFields = function() {
  return ['name', 'custom', 'archived', 'permissions', 'visibility', 'projectReferences'];
};
ProjectSchema.statics.getValidUpdateFields = function() {
  return ProjectSchema.methods.getValidUpdateFields();
};

/**
 * @description Returns supported visibility levels
 * @memberOf ProjectSchema
 */
ProjectSchema.methods.getVisibilityLevels = function() {
  return ['internal', 'private'];
};
ProjectSchema.statics.getVisibilityLevels = function() {
  return ProjectSchema.methods.getVisibilityLevels();
};

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf ProjectSchema
 */
ProjectSchema.methods.getValidPopulateFields = function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'org'];
};

ProjectSchema.statics.getValidPopulateFields = function() {
  return ProjectSchema.methods.getValidPopulateFields();
};


/**
 * @description Validates an object to ensure that it only contains keys
 * which exist in the project model.
 *
 * @param {Object} object - Object for key verification.
 * @return {boolean} The boolean indicating if the object contained only
 * existing fields.
 */
ProjectSchema.statics.validateObjectKeys = function(object) {
  // Initialize returnBool to true
  let returnBool = true;
  // Set list array of valid keys
  const validKeys = Object.keys(ProjectSchema.paths);
  // Add 'id' to list of valid keys, for 0.6.0 support
  validKeys.push('id');
  // Check if the object is NOT an instance of the project model
  if (!(object instanceof mongoose.model('Project', ProjectSchema))) {
    // Loop through each key of the object
    Object.keys(object).forEach(key => {
      // Check if the object key is a key in the project model
      if (!validKeys.includes(key)) {
        // Key is not in project model, return false
        returnBool = false;
      }
    });
  }
  // All object keys found in project model or object was an instance of
  // project model, return true
  return returnBool;
};

/* --------------------------( Project Properties )-------------------------- */

// Required for virtual getters
ProjectSchema.set('toJSON', { virtuals: true });
ProjectSchema.set('toObject', { virtuals: true });


/* ------------------------( Project Schema Export )------------------------- */

// Export mongoose model as "Project"
module.exports = mongoose.model('Project', ProjectSchema);
