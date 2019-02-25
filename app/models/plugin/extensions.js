/**
 * Classification: UNCLASSIFIED
 *
 * @module models.plugin.extensions
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Middleware plugin that extends models.
 * Allows field extensions: archivedBy, createBy, lastModifiedBy, createdOn,
 * archivedOn, updatedOn, and archived.
 */

module.exports = function extensionPlugin(schema) {
  schema.add({
    archivedBy: {
      type: String,
      ref: 'User',
      default: null
    },
    createdBy: {
      type: String,
      ref: 'User',
      default: null
    },
    lastModifiedBy: {
      type: String,
      ref: 'User',
      default: null
    },
    createdOn: {
      type: Date,
      default: Date.now()
    },
    archivedOn: {
      type: Date,
      default: null
    },
    updatedOn: {
      type: Date,
      default: null
    },
    archived: {
      type: Boolean,
      default: false,
      set: function(v) {
        if (v) {
          this.archivedOn = Date.now();
        }
        return v;
      }
    }
  });

  schema.pre('save', function(next) {
    // createdOn cannot be changed
    if (this.isModified('createdOn')) {
      next(new M.CustomError('createdOn is protected and cannot be changed.', 400, 'warn'));
    }
    // Update time
    this.updatedOn = Date.now();

    return next();
  });
};
