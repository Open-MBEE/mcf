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
 * @property {String} id - The organization's unique ID.
 * @property {String} name - The organization's name.
 * @property {String} permissions - An object whose keys identify an
 * organization's roles. The key values are an array of references to users
 * who hold those roles.
 * @property {User} permissions.read - An array of references to Users who
 * have read access.
 * @property {User} permissions.write - An array of references to Users who
 * have write access.
 * @property {User} permissions.admin - An array of references to Users who
 * have admin access.
 * @property {Date} deletedOn - The date the Organization was soft deleted or
 * null if not deleted.
 * @property {Boolean} deleted - Indicates if an organization has been soft deleted.
 * @property {Schema.Types.Mixed} custom - JSON used to store additional data.
 * @property {virtual} project - A virtual field containing an array of Project
 * objects.
 *
 */
const OrganizationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true,
    unique: true,
    match: RegExp(validators.org.id),
    maxlength: [64, 'Too many characters in ID'],
    set: function(_id) {
      // Check value undefined
      if (typeof this.id === 'undefined') {
        // Return value to set it
        return _id;
      }
      // Check value NOT equal to db value
      if (_id !== this.id) {
        // Immutable field, return error
        M.log.warn('ID cannot be changed.');
      }
      // No change, return the value
      return this.id;
    }
  },
  name: {
    type: String,
    required: true,
    unique: true,
    match: RegExp(validators.org.name)
  },
  permissions: {
    read: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    write: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    admin: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
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
 * @memberof OrganizationSchema
 */
OrganizationSchema.methods.getPublicData = function() {
  // Map read, write, and admin references to only contain user public data
  const permissions = {
    read: this.permissions.read.map(u => u.username),
    write: this.permissions.write.map(u => u.username),
    admin: this.permissions.admin.map(u => u.username)
  };

  // Return the organization public fields
  return {
    id: this.id,
    name: this.name,
    permissions: permissions,
    custom: this.custom
  };
};

/**
 * @description Returns supported permission levels
 * @memberof OrganizationSchema
 */
OrganizationSchema.methods.getPermissionLevels = function() {
  return ['REMOVE_ALL', 'read', 'write', 'admin'];
};

/**
 * @description Returns organization fields that can be changed
 * @memberof OrganizationSchema
 */
OrganizationSchema.methods.getValidUpdateFields = function() {
  return ['name', 'custom'];
};

/**
 * @description Returns the permissions a user has on the org
 *
 * @param {User} user  The user whose permissions are being returned
 * @memberof OrganizationSchema
 *
 * @returns {Object} A json object with keys being the permission levels
 * and values being booleans
 */
OrganizationSchema.methods.getPermissions = function(user) {
  // Map org permissions lists user._ids to strings
  const read = this.permissions.read.map(u => u._id.toString());
  const write = this.permissions.write.map(u => u._id.toString());
  const admin = this.permissions.admin.map(u => u._id.toString());

  // Return an object containing user permissions
  return {
    read: read.includes(user._id.toString()),
    write: write.includes(user._id.toString()),
    admin: admin.includes(user._id.toString())
  };
};

/**
 * @description Validates an object to ensure that it only contains keys
 * which exist in the organization model.
 *
 * @param {Object} object to check keys of.
 * @return {boolean} The boolean indicating if the object contained only
 * existing fields.
 */
OrganizationSchema.statics.validateObjectKeys = function(object) {
  // Initialize returnBool to true
  let returnBool = true;
  // Check if the object is NOT an instance of the organization model
  if (!(object instanceof mongoose.model('Organization', OrganizationSchema))) {
    // Loop through each key of the object
    Object.keys(object).forEach(key => {
      // Check if the object key is a key in the organization model
      if (!Object.keys(OrganizationSchema.obj).includes(key)) {
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
