/**
 * @classification UNCLASSIFIED
 *
 * @module models.plugin.extensions
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 * @author Austin Bieber
 *
 * @description Middleware plugin that extends models.
 * Allows field extensions: archivedBy, createBy, lastModifiedBy, createdOn,
 * archivedOn, updatedOn, and archived.
 */

module.exports = function extensionPlugin(schema) {
  schema.add({
    archivedBy: {
      type: 'String',
      ref: 'User',
      default: null
    },
    createdBy: {
      type: 'String',
      ref: 'User',
      default: null,
      immutable: true
    },
    lastModifiedBy: {
      type: 'String',
      ref: 'User',
      default: null
    },
    createdOn: {
      type: 'Date',
      default: Date.now,
      immutable: true
    },
    archivedOn: {
      type: 'Date',
      default: null
    },
    updatedOn: {
      type: 'Date',
      default: null
    },
    archived: {
      type: 'Boolean',
      default: false
    },
    custom: {
      type: 'Object',
      default: {}
    }
  });
};
