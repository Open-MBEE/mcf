/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow html in description
/**
 * @classification UNCLASSIFIED
 *
 * @module models.artifact
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description
 * <p>This module defines the artifact data model. The artifact data model
 * represents metadata for Artifact blobs (binary large object).
 * Filename and Location are two examples of Artifact metadata.
 * They are used to point and locate artifact blobs.
 * </p>
 */

// MBEE modules
const db = M.require('db');
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');
const utils = M.require('lib.utils');

/* -------------------------( Artifact Schema )-------------------------- */

/**
 * @namespace
 *
 * @description Defines the Artifact Schema
 *
 * @property {string} _id - The artifact's unique ID.
 * @property {string} description - The artifact's description.
 * @property {string} size - The artifact's size in bytes.
 * @property {string} project - A reference to an artifact's project.
 * @property {string} branch - A reference to an artifact's branch.
 * @property {string} filename - The filename of the artifact.
 * @property {string} location - The location of the artifact blob.
 * @property {string} strategy - The strategy used for storing artifact blobs.
 *
 */
const ArtifactSchema = new db.Schema({
  _id: {
    type: 'String',
    required: true,
    validate: [{
      validator: validators.artifact._id.reserved,
      message: props => 'Artifact ID cannot include the following words: '
        + `[${validators.reserved}].`
    }, {
      validator: validators.artifact._id.match,
      message: props => `Invalid artifact ID [${utils.parseID(props.value).pop()}].`
    }, {
      validator: validators.artifact._id.maxLength,
      // Return a message, with calculated length of artifact ID (artifact.max - branch.max - :)
      message: props => `Artifact ID length [${props.value.length - validators.branch.idLength - 1}]`
        + ` must not be more than ${validators.artifact.idLength - validators.branch.idLength - 1}`
        + ' characters.'
    }, {
      validator: validators.artifact._id.minLength,
      // Return a message, with calculated length of artifact ID (artifact.min - branch.min - :)
      message: props => `Artifact ID length [${props.value.length - 9}] must not`
        + ' be less than 2 characters.'
    }]
  },
  description: {
    type: 'String',
    default: ''
  },
  size: {
    type: 'Number',
    default: 0
  },
  project: {
    type: 'String',
    ref: 'Project',
    required: true,
    validate: [{
      validator: validators.artifact.project,
      message: props => `${props.value} is not a valid project ID.`
    }],
    immutable: true
  },
  branch: {
    type: 'String',
    required: true,
    ref: 'Branch',
    index: true,
    validate: [{
      validator: validators.artifact.branch,
      message: props => `${props.value} is not a valid branch ID.`
    }],
    immutable: true
  },
  filename: {
    type: 'String',
    required: true,
    validate: [{
      validator: validators.artifact.filename,
      message: props => `Artifact filename [${props.value}] is improperly formatted.`
    }]
  },
  location: {
    type: 'String',
    required: true,
    validate: [{
      validator: validators.artifact.location,
      message: props => `Artifact location [${props.value}] is improperly formatted.`
    }]
  },
  strategy: {
    type: 'String',
    required: true,
    immutable: true
  }
});

// Virtual which stores elements that reference this artifact
ArtifactSchema.virtual('referencedBy', {
  ref: 'Element',
  localField: '_id',
  foreignField: 'artifact',
  justOne: false
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
ArtifactSchema.plugin(extensions);

/* -------------------------( Artifact Methods )------------------------- */
/**
 * @description Returns artifact fields that can be changed
 * @memberOf ArtifactSchema
 */
ArtifactSchema.static('getValidUpdateFields', function() {
  return ['filename', 'description', 'custom', 'archived', 'location', 'size'];
});

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf ArtifactSchema
 */
ArtifactSchema.static('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'project', 'branch',
    'referencedBy'];
});

/* ----------------------( Artifact Schema Export )---------------------- */

// Export model as "Artifact"
module.exports = new db.Model('Artifact', ArtifactSchema, 'artifacts');
