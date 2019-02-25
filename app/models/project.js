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
const utils = M.require('lib.utils');
const extensions = M.require('models.plugin.extensions');


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
    minlength: [5, 'Too few characters in ID']
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
 * @description Returns a project's public data.
 * @memberOf ProjectSchema
 */
ProjectSchema.methods.getPublicData = function() {
  const permissions = {};
  let createdBy;
  let lastModifiedBy;
  let archivedBy;

  // Loop through each permission key/value pair
  Object.keys(this.permissions).forEach((u) => {
    // Return highest permission
    permissions[u] = this.permissions[u].pop();
  });

  // If this.createdBy is defined
  if (this.createdBy) {
    // If this.createdBy is populated
    if (typeof this.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = this.createdBy.getPublicData();
    }
    else {
      createdBy = this.createdBy;
    }
  }

  // If this.lastModifiedBy is defined
  if (this.lastModifiedBy) {
    // If this.lastModifiedBy is populated
    if (typeof this.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = this.lastModifiedBy.getPublicData();
    }
    else {
      lastModifiedBy = this.lastModifiedBy;
    }
  }

  // If this.archivedBy is defined
  if (this.archivedBy) {
    // If this.archivedBy is populated
    if (typeof this.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = this.archivedBy.getPublicData();
    }
    else {
      archivedBy = this.archivedBy;
    }
  }

  // Return the projects public fields
  return {
    id: utils.parseID(this._id).pop(),
    org: (this.org.hasOwnProperty('_id')) ? this.org.getPublicData() : this.org,
    name: this.name,
    permissions: permissions,
    custom: this.custom,
    visibility: this.visibility,
    createdOn: this.createdOn,
    createdBy: createdBy,
    updatedOn: this.updatedOn,
    lastModifiedBy: lastModifiedBy,
    archived: (this.archived) ? true : undefined,
    archivedOn: (this.archivedOn) ? this.archivedOn : undefined,
    archivedBy: archivedBy
  };
};

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
  return ['name', 'custom', 'archived', 'permissions'];
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
 * @param {Object} object to check keys of.
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
