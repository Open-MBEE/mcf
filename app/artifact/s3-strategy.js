/**
 * @classification UNCLASSIFIED
 *
 * @module artifact.s3-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description Implements an artifact storage strategy using Amazon S3,
 * a cloud storage service. This strategy uses the aws-sdk library.
 */
// Define the root storage path for blobs
const rootStoragePath = 'storage';

// NPM modules
const AWS = require('aws-sdk');
const proxy = require('proxy-agent');

// Node modules
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// MBEE modules
const utils = M.require('lib.utils');
const errors = M.require('lib.errors');

// Validator regex for this strategy
const validator = {
  location: '^[^.]+$',
  filename: '^[^!\\<>:"\'|?*]+$',
  // Matches filename + extensions
  extension: '^[^!\\<>:"\'|?*]+[.][\\w]+$'
};

// Global instance of s3 handler
let s3 = null;

// Check if s3 strategy is used.
if (M.config.artifact.strategy === 's3-strategy') {
  // Extract and update the configuration
  AWS.config.update({
    httpOptions: {
      agent: proxy(M.config.artifact.s3.proxy),
      ca: fs.readFileSync(M.config.artifact.s3.ca)
    },
    region: M.config.artifact.s3.region,
    accessKeyId: M.config.artifact.s3.accessKeyId,
    secretAccessKey: M.config.artifact.s3.secretAccessKey,
    Bucket: M.config.artifact.s3.Bucket
  });

  s3 = new AWS.S3();
}

/**
 * @description List all blobs under a project.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of the artifact blob.
 *
 * @returns {object[]} Array of objects that content blob location and filename.
 */
async function listBlobs(artMetadata) {
  try {
    // Define blob name array
    const blobList = [];

    // Get project id
    const projID = utils.parseID(artMetadata.project).pop();

    // Create full path
    const fullPath = path.join(rootStoragePath, artMetadata.org, projID);

    // Initialize truncated to true
    let isTruncated = true;

    // Define search obj
    const searchObj = {
      Bucket: M.config.artifact.s3.Bucket,
      Prefix: fullPath
    };

    // Keep looping while there are objects
    while (isTruncated) {
      // Get all objects
      const foundObj = await s3.listObjectsV2(searchObj).promise(); // eslint-disable-line

      // Check if objects found
      if (foundObj.Contents.length === 0) {
        // No objects found, break out of loop
        break;
      }
      else {
        // Objects found, set isTruncated
        isTruncated = foundObj.IsTruncated;

        // Loop through each found object
        foundObj.Contents.forEach((obj) => {
          const paths = obj.Key.split('/');
          // Remove the first three directory path [storage, org, project]
          paths.splice(0, 3);

          // Extract location and filename
          // Push obj into array
          blobList.push({
            location: paths.slice(0, paths.length - 1).join('/'),
            filename: paths.slice(-1)[0]

          });
        });
        // Update next search token
        searchObj.ContinuationToken = foundObj.NextContinuationToken;
      }
    }
    return blobList;
  }
  catch (err) {
    throw errors.captureError(err);
  }
}

/**
 * @description Gets the artifact blob.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of the artifact blob.
 *
 * @returns {Buffer} Artifact binary.
 */
async function getBlob(artMetadata) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create artifact path
    const blobPath = createBlobPath(artMetadata);

    // Set params
    const params = {
      Bucket: M.config.artifact.s3.Bucket,
      Key: blobPath
    };

    // Get the s3 object
    const data = await s3.getObject(params).promise();
    // Return the object
    return data.Body;
  }
  catch (err) {
    // Check status code
    if (err.statusCode === 404) {
      throw new M.NotFoundError('Artifact blob not found.', 'warn');
    }
    throw errors.captureError(err);
  }
}

/**
 * @description Post an artifact blob. This function does NOT overwrite existing blob.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 * @param {Buffer} artifactBlob - A binary large object artifact.
 */
async function postBlob(artMetadata, artifactBlob) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create artifact path
    const blobPath = createBlobPath(artMetadata);

    // Set params
    const params = {
      Bucket: M.config.artifact.s3.Bucket,
      Key: blobPath,
      Body: artifactBlob
    };

    // Check object exists
    if (await doesObjectExist(params.Bucket, params.Key)) {
      // Object exists, throw error
      throw new M.DataFormatError('Artifact blob already exists.', 'warn');
    }

    // Upload the blob
    await s3.upload(params).promise();
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description Helper function that checks if an object exists.
 *
 * @param {string} bucket - The s3 bucket where the object is stored.
 * @param {string} key - The filename of the object.
 *
 * @returns {boolean} Returns true if a blob already exists, else false.
 */
async function doesObjectExist(bucket, key) {
  try {
    // Check if object exists
    // Note: If object not found, this will throw an error
    await s3.headObject({ Bucket: bucket, Key: key }).promise();

    // An object was found, return true
    return true;
  }
  catch (err) {
    // Error occurred, check if object not found
    if (err.code !== 'NotFound') {
      throw errors.captureError(err);
    }
    return false;
  }
}

/**
 * @description Uploads an artifact blob. Existing files will be overwritten.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 * @param {Buffer} artifactBlob - A binary large object artifact.
 */
async function putBlob(artMetadata, artifactBlob) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create artifact path
    const blobPath = createBlobPath(artMetadata);

    // Set params
    const params = {
      Bucket: M.config.artifact.s3.Bucket,
      Key: blobPath,
      Body: artifactBlob
    };

    // Upload the blob
    await s3.upload(params).promise();
  }
  catch (err) {
    throw errors.captureError(err);
  }
}

/**
 * @description Deletes an artifact blob.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 */
async function deleteBlob(artMetadata) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create artifact path
    const blobPath = createBlobPath(artMetadata);

    // Set params
    const params = {
      Bucket: M.config.artifact.s3.Bucket,
      Key: blobPath
    };

    // Check object does NOT exist
    if (!(await doesObjectExist(params.Bucket, params.Key))) {
      // Object does NOT exist, throw error
      throw new M.DataFormatError('Artifact blob not found.', 'warn');
    }

    // Delete the blob
    await s3.deleteObject(params).promise();
  }
  catch (err) {
    throw errors.captureError(err);
  }
}

/**
 * @description This function creates the blob path based on storage path,
 * location field, and filename. Calling this function ensures path and
 * filename are formatted consistently across the artifact strategy.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 *
 * @returns {string} The blob file path.
 */
function createBlobPath(artMetadata) {
  // defined blob location
  let location = artMetadata.location;

  // Get org id
  const orgID = utils.parseID(artMetadata.org).pop();

  // Get project id
  const projID = utils.parseID(artMetadata.project).pop();

  // Ensure location ends with separator if not present
  if (location[location.length - 1] !== path.sep) {
    // Add separator for location
    location += path.sep;
  }

  // Remove os separator with periods
  const convertedLocation = location.replace(
    // eslint-disable-next-line security/detect-non-literal-regexp
    new RegExp(`\\${path.sep}`, 'g'), '/'
  );

  // Form the blob name, location concat with filename
  const concatenName = convertedLocation + artMetadata.filename;

  // Create and return the complete path
  return path.join(rootStoragePath, orgID, projID, concatenName);
}

/**
 * @description Validates the artifact object metadata.
 * Ensures fields such as 'location' and 'filename' are defined.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 */
function validateBlobMeta(artMetadata) {
  try {
    // Define the required blob fields
    const requiredBlobFields = ['location', 'filename'];

    if (typeof artMetadata !== 'object' || artMetadata === null) {
      throw new M.DataFormatError('Artifact metadata must be an object.', 'warn');
    }

    requiredBlobFields.forEach((field) => {
      assert.ok(artMetadata.hasOwnProperty(field), 'Artifact metadata requires'
        + `the ${field} field.`);
    });

    assert.ok((RegExp(validator.filename).test(artMetadata.filename)
      && RegExp(validator.extension).test(artMetadata.filename)),
    `Artifact filename [${artMetadata.filename}] is improperly formatted.`);

    assert.ok(RegExp(validator.location).test(artMetadata.location),
      `Artifact location [${artMetadata.location}] is improperly formatted.`);
  }
  catch (error) {
    throw new M.DataFormatError(error.message, 'warn');
  }
}

/**
 * @description Removes a directory and all objects/folders within it
 * recursively.
 *
 * @param {string} clearPath - Path to clear.
 */
async function clear(clearPath) {
  try {
    // Create the root artifact path
    const dirToDelete = path.join(rootStoragePath, clearPath);

    // Initialize truncated to true
    let isTruncated = true;

    // Define search obj
    const searchObj = {
      Bucket: M.config.artifact.s3.Bucket,
      Prefix: dirToDelete
    };

    // Keep looping while there are objects
    while (isTruncated) {
      const objToDelete = [];

      // Find all objects with given prefix
      const foundObj = await s3.listObjects({ // eslint-disable-line no-await-in-loop
        Bucket: M.config.artifact.s3.Bucket,
        Prefix: dirToDelete
      }).promise();

      // Check if objects found
      if (foundObj.Contents.length > 0) {
        // Set if truncated
        isTruncated = foundObj.IsTruncated;

        // Loop through each found object
        foundObj.Contents.forEach((obj) => {
          objToDelete.push({
            Key: obj.Key

          });
        });

        // Update next search token
        searchObj.ContinuationToken = foundObj.NextContinuationToken;

        // Delete current batch of objects
        await s3.deleteObjects({ // eslint-disable-line no-await-in-loop
          Bucket: M.config.artifact.s3.Bucket,
          Delete: {
            Objects: objToDelete
          }
        }).promise();
      }
      else {
        // No objects found, set truncated to false
        isTruncated = false;
      }
    }
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

// Expose artifact strategy functions
module.exports = {
  getBlob,
  listBlobs,
  postBlob,
  putBlob,
  deleteBlob,
  clear,
  validator
};
