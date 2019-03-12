/**
 * Classification: UNCLASSIFIED
 *
 * @module models.organization
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the organization data model.
 */

// NPM modules
const mongoose = require('mongoose');

// MBEE modules
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');

/* -------------------------( Organization Schema )-------------------------- */

/**
 * @namespace
 *
 * @description Defines the Organization Schema
 *
 * @property {string} _id - The organization's unique ID.
 * @property {string} name - The organization's name.
 * @property {Object} permissions - An object whose keys identify an
 * organization's roles. The keys are usernames and the values are arrays
 * containing the users permissions.
 * @property {Object} custom - JSON used to store additional data.
 *
 */
const OrganizationSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    match: RegExp(validators.org.id),
    maxlength: [36, 'Too many characters in ID'],
    minlength: [2, 'Too few characters in ID']
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
  }
});

OrganizationSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'org',
  justOne: false
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
OrganizationSchema.plugin(extensions);

/* -------------------------( Organization Methods )------------------------- */
/**
 * @description Returns an organization's public data.
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getPublicData = function() {
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

  // Return the organization public fields
  return {
    id: this._id,
    name: this.name,
    permissions: permissions,
    custom: this.custom,
    createdOn: this.createdOn,
    createdBy: createdBy,
    updatedOn: this.updatedOn,
    lastModifiedBy: lastModifiedBy,
    archived: (this.archived) ? true : undefined,
    archivedOn: (this.archivedOn) ? this.archivedOn : undefined,
    archivedBy: archivedBy,
    projects: (this.projects) ? this.projects.map(p => p.getPublicData()) : undefined
  };
};

/**
 * @description Returns supported permission levels
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getPermissionLevels = function() {
  return ['remove_all', 'read', 'write', 'admin'];
};
OrganizationSchema.statics.getPermissionLevels = function() {
  return OrganizationSchema.methods.getPermissionLevels();
};

/**
 * @description Returns organization fields that can be changed
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getValidUpdateFields = function() {
  return ['name', 'custom', 'archived', 'permissions'];
};
OrganizationSchema.statics.getValidUpdateFields = function() {
  return OrganizationSchema.methods.getValidUpdateFields();
};

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getValidPopulateFields = function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'projects'];
};

OrganizationSchema.statics.getValidPopulateFields = function() {
  return OrganizationSchema.methods.getValidPopulateFields();
};


/**
 * @description Validates an object to ensure that it only contains keys
 * which exist in the organization model.
 *
 * @param {Object} object - The object to check keys of.
 *
 * @return {boolean} The boolean indicating if the object contained only
 * existing fields.
 */
OrganizationSchema.statics.validateObjectKeys = function(object) {
  // Initialize returnBool to true
  let returnBool = true;
  // Set list array of valid keys
  const validKeys = Object.keys(OrganizationSchema.paths);
  // Add 'id' to list of valid keys, for 0.6.0 support
  validKeys.push('id');
  // Check if the object is NOT an instance of the organization model
  if (!(object instanceof mongoose.model('Organization', OrganizationSchema))) {
    // Loop through each key of the object
    Object.keys(object).forEach(key => {
      // Check if the object key is a key in the organization model
      if (!validKeys.includes(key)) {
        // Key is not in organization model, return false
        returnBool = false;
      }
    });
  }
  // All object keys found in organization model or object was an instance of
  // organization model, return true
  return returnBool;
};


/* -----------------------( Organization Properties )------------------------ */

// Required for virtual getters
OrganizationSchema.set('toJSON', { virtuals: true });
OrganizationSchema.set('toObject', { virtuals: true });


/* ----------------------( Organization Schema Export )---------------------- */

// Export mongoose model as "Organization"
module.exports = mongoose.model('Organization', OrganizationSchema);
