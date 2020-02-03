/**
 * @classification UNCLASSIFIED
 *
 * @module artifact.local-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description Implements an artifact strategy for local artifact storage. This
 * should be the default artifact strategy for MBEE.
 */

// Define the root storage path for blobs
const rootStoragePath = '/storage';

// Node modules
const path = require('path');    // Find directory paths
const fs = require('fs');        // Access the filesystem
const assert = require('assert');
const { execSync } = require('child_process');

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

/**
 * @description List all blobs under a project.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of the artifact blob.
 *
 * @returns {object[]} Array of objects that contain blob location and filename.
 */
function listBlobs(artMetadata) {
  try {
    // Define blob name array
    const blobList = [];

    // Get project id
    const projID = utils.parseID(artMetadata.project).pop();

    // Create full path
    const fullPath = path.join(M.root, rootStoragePath, artMetadata.org, projID);
    const files = fs.readdirSync(fullPath);

    files.forEach(file => {
      // Split filename by delimiter
      const filePath = file.split('.');
      // Extract location and filename
      // Push obj into array
      blobList.push({
        location: filePath.slice(0, filePath.length - 2).join('/'),
        filename: filePath.slice(-2).join('.')
      });
    });

    return blobList;
  }
  catch (err) {
    throw errors.captureError(err);
  }
}

/**
 * @description Gets the artifact blob file from the local file system.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of the artifact blob.
 *
 * @returns {Buffer} Artifact binary.
 */
function getBlob(artMetadata) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create artifact path
    const filePath = createBlobPath(artMetadata);

    // Read the artifact file
    // Note: Use sync to ensure file is read before advancing
    return fs.readFileSync(filePath);
  }
  catch (err) {
    throw new M.NotFoundError('Artifact blob not found.', 'warn');
  }
}

/**
 * @description Saves an artifact blob to the local file system.
 * This function does NOT overwrite existing blob.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 * @param {Buffer} artifactBlob - A binary large object artifact.
 */
function postBlob(artMetadata, artifactBlob) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create artifact path
    const fullPath = createBlobPath(artMetadata);

    // Check if artifact file exist
    if (fs.existsSync(fullPath)) {
      // Object Exist, throw error
      throw new M.DataFormatError('Artifact blob already exists.', 'warn');
    }

    // Replace the Blob
    putBlob(artMetadata, artifactBlob);
  }
  catch (err) {
    throw errors.captureError(err);
  }
}

/**
 * @description This function writes an artifact blob to the local file system.
 * Existing files will be overwritten.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 * @param {Buffer} artifactBlob - A binary large object artifact.
 */
function putBlob(artMetadata, artifactBlob) {
  // Validate metadata
  validateBlobMeta(artMetadata);

  // Create artifact path
  const fullPath = createBlobPath(artMetadata);

  // Create org/project directory
  createDirectory(`/${path.join(artMetadata.org, artMetadata.project)}`);

  try {
    // Write out artifact file, defaults to 666 permission.
    fs.writeFileSync(fullPath, artifactBlob);
  }
  catch (error) {
    M.log.error(error);
    // If the error is a custom error, throw it
    if ((error instanceof errors.CustomError)) {
      throw error;
    }
    // Error occurred, log it
    throw new M.ServerError('Could not create Artifact blob.', 'warn');
  }
}

/**
 * @description This function deletes an artifact blob from the local file
 * system.
 *
 * @param {object} artMetadata - Artifact metadata.
 * @param {string} artMetadata.filename - The filename of the artifact.
 * @param {string} artMetadata.location - The location of the artifact.
 * @param {string} artMetadata.org - The org of the artifact blob.
 * @param {string} artMetadata.project - The project of artifact blob.
 */
function deleteBlob(artMetadata) {
  try {
    // Validate metadata
    validateBlobMeta(artMetadata);

    // Create directory path
    const projDirPath = path.join(M.root, rootStoragePath,
      artMetadata.org, artMetadata.project);

    // Create artifact path
    const blobPath = createBlobPath(artMetadata);

    // Remove the artifact file
    // Note: Use sync to ensure file is removed before advancing
    fs.unlinkSync(blobPath);

    // Read the directory path
    const files = fs.readdirSync(projDirPath);

    // Check if no file exist
    if (!files.length) {
      // Delete this directory
      fs.rmdirSync(projDirPath);
    }
  }
  catch (error) {
    if (error.code === 'ENOENT') {
      throw new M.NotFoundError('Artifact blob not found.', 'warn');
    }
    throw new M.OperationError('Could not delete Blob.', 'warn');
  }
}

/**
 * @description This helper function recursively creates directories based on
 * the input path.
 *
 * @param {string} pathString - The full directory path.
 *
 * @returns {string} Returns the created path.
 */
function createDirectory(pathString) {
  // Define path separator
  let separator;

  // Folder path to create
  let artifactPath = '';

  // Check for backslash for windows
  if (pathString.includes('\\')) {
    separator = '\\';
  }
  // Otherwise, linux base separator
  else {
    separator = '/';
  }

  // Create the root artifact path
  const rootDir = path.join(M.root, rootStoragePath);
  // Define a running path
  let runningPath = '';

  // Generate array of directories to create
  const directoriesToCreate = pathString.split(separator);

  // Loop through each directory folder
  directoriesToCreate.forEach((currDir) => {
    // Concatenate to running path
    runningPath = path.join(runningPath, currDir);

    // Attach root directory
    artifactPath = path.join(rootDir, runningPath);

    // Ensure folder does NOT exist
    if (!fs.existsSync(artifactPath)) {
      // Directory does NOT exist, create it
      fs.mkdirSync(artifactPath, (error) => {
        // Check for errors
        if (error) {
          throw new M.DataFormatError(error.message, 'warn');
        }
      });
    }
  });
  // Return the create directory path
  return artifactPath;
}

/**
 * @description This function creates the blob path using the local
 * storage path, location field, and filename.
 *
 * Handles specific cases to format path and filename consistently
 * across the artifact strategy.
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

  // Get root artifact path
  const artRootPath = path.join(M.root, rootStoragePath);

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
    new RegExp(`\\${path.sep}`, 'g'), '.'
  );

  // Form the blob name, location concat with filename
  const concatenName = convertedLocation + artMetadata.filename;

  // Create and return the complete path
  return path.join(artRootPath, orgID, projID, concatenName);
}

/**
 * @description This function validates the artifact object metadata.
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

    if (typeof artMetadata !== 'object') {
      throw new M.DataFormatError('Artifact metadata must be an object.', 'warn');
    }

    requiredBlobFields.forEach((field) => {
      assert.ok(artMetadata.hasOwnProperty(field), 'Artifact metadata requires'
        + ` ${field} field.`);
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
 * @description This function removes a directory and all objects/folders within it
 * recursively.
 *
 * @param {string} clearPath - Path to clear.
 */
async function clear(clearPath) {
  try {
    // Create the root artifact path
    const dirToDelete = path.join(M.root, rootStoragePath, clearPath);

    // Remove artifacts
    const rmd = (process.platform === 'win32') ? 'RMDIR /S /Q' : 'rm -rf';
    execSync(`${rmd} ${dirToDelete}`);
  }
  catch (err) {
    throw errors.captureError(err);
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
