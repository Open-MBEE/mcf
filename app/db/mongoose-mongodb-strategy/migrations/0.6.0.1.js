/**
 * @classification UNCLASSIFIED
 *
 * @module db.mongoose-mongodb-strategy.migrations.0.6.0.1
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description Migration script for version 0.6.0.1. Specific to Mongoose/MongoDB.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const mongoose = require('mongoose');

// MBEE modules
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const jmi = M.require('lib.jmi-conversions');

/**
 * @description Handles the database migration from version 0.6.0 to 0.6.0.1. The
 * changes being made are the following: change _id from ObjectIDs to
 * strings, removal of the id, uuid, contains, type, deleted, deletedBy and
 * deletedOn fields, addition of archived, archivedBy and archivedOn fields,
 * change org and project permissions from arrays to objects with username keys,
 * removal of org name uniqueness, and addition of source/target to base element.
 *
 * NOTE: There are some limitations with this migration. If the database is too
 * large, node may run out of memory while processing the new objects. It is
 * recommended that you do not proceed if you have more than 100,000 objects in
 * a collection. Additionally, all users will be required to reset their
 * passwords due to change in salt when password is hashed. If for some reason a
 * migration fails, any data removed from the database will be added to the
 * ./data directory.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
module.exports.up = async function() {
  try {
    // If data directory doesn't exist, create it
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    // Find all orgs
    const orgs = await Organization.find({});
    const jmiOrgs = jmi.convertJMI(1, 2, orgs);

    // Write contents to temporary file
    fs.writeFileSync(path.join(M.root, 'data', 'orgs.json'), JSON.stringify(orgs));

    // Find all projects
    const projects = await Project.find({});
    const jmiProjects = jmi.convertJMI(1, 2, projects);

    // Write contents to temporary file
    fs.writeFileSync(path.join(M.root, 'data', 'projects.json'), JSON.stringify(projects));

    // Find all elements
    const elements = await Element.find({});
    const jmiElements = jmi.convertJMI(1, 2, elements);

    // Write contents to temporary file
    fs.writeFileSync(path.join(M.root, 'data', 'elements.json'), JSON.stringify(elements));

    // Find all users
    const users = await User.find({});
    const jmiUsers = jmi.convertJMI(1, 2, users);

    // Write contents to temporary file
    fs.writeFileSync(path.join(M.root, 'data', 'users.json'), JSON.stringify(users));

    // Find all currently existing collections
    await sixToSevenOrgHelper(orgs, jmiUsers);
    await sixToSevenProjectHelper(projects, jmiUsers, jmiOrgs);
    await sixToSevenElementHelper(elements, jmiUsers, jmiProjects, jmiElements);
    await sixToSevenUserHelper(users, jmiUsers);
  }
  catch (error) {
    throw new M.DatabaseError(error.message, 'warn');
  }
};


/**
 * @description Helper function for 0.6.0 to 0.6.0.1 migration. Handles all
 * updates to the organization collection.
 *
 * @param {Array} orgs - The organizations being updated.
 * @param {object} jmi2Users - The found users in JMI Type 2 format.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function sixToSevenOrgHelper(orgs, jmi2Users) {
  return new Promise((resolve, reject) => {
    const orgsToInsert = [];

    // For each org
    orgs.forEach((org) => {
      // If the _id is an ObjectId, run the migration
      if (mongoose.Types.ObjectId.isValid(org._id)) {
        // Change the org _id to a string, rather than ObjectID
        org._id = org.id;
        // Set archive fields
        org.archived = org.deleted || false;
        org.archivedOn = org.deletedOn;
        org.archivedBy = org.deletedBy;
        // deleted, deletedOn and deletedBy fields have been removed
        delete org.deleted;
        delete org.deletedOn;
        delete org.deletedBy;

        // Change the permissions from ObjectIDs to strings
        org.permissions.read = org.permissions.read.map((u) => jmi2Users[u].username) || [];
        org.permissions.write = org.permissions.write.map((u) => jmi2Users[u].username) || [];
        org.permissions.admin = org.permissions.admin.map((u) => jmi2Users[u].username) || [];

        const newPermissions = {};
        // Convert permissions from arrays to objects with usernames as the keys,
        // permissions as the values
        org.permissions.read.forEach((user) => {
          if (org.permissions.admin.includes(user)) {
            newPermissions[user] = ['read', 'write', 'admin'];
          }
          else if (org.permissions.write.includes(user)) {
            newPermissions[user] = ['read', 'write'];
          }
          else {
            newPermissions[user] = ['read'];
          }
        });

        org.permissions = newPermissions;

        // Change createBy, archivedBy and lastModifiedBy from ObjectIDs to strings
        if (org.createdBy) {
          org.createdBy = jmi2Users[org.createdBy].username;
        }
        if (org.archivedBy) {
          org.archivedBy = jmi2Users[org.archivedBy].username;
        }
        if (org.lastModifiedBy) {
          org.lastModifiedBy = jmi2Users[org.lastModifiedBy].username;
        }

        // updatedOn is now set when org is created by default
        if (!org.updatedOn) {
          org.updatedOn = org.createdOn;
        }
      }
      // Add the org to be inserted later
      orgsToInsert.push(org);
    });

    // Remove the id field from all objects
    orgsToInsert.forEach((org) => delete org.id);

    // Delete all currently existing orgs
    Organization.deleteMany({})
    // Find all indexes in the organizations collections
    .then(() => Organization.getIndexes())
    .then((indexes) => {
      const promises = [];
      // Loop through the found indexes
      indexes.forEach((index) => {
        // If unique ID index exists, delete from orgs collection
        if (index.name === 'id_1') {
          promises.push(Organization.deleteIndex('id_1'));
        }
        // If unique name index exists, delete from orgs collection
        else if (index.name === 'name_1') {
          promises.push(Organization.deleteIndex('name_1'));
        }
      });

      // Return when all organization indexes have been dropped
      return Promise.all(promises);
    })
    // Insert updated orgs
    .then(() => {
      // If there are orgs to add, add them
      if (orgsToInsert.length > 0) {
        return Organization.insertMany(orgsToInsert);
      }
    })
    .then(() => {
      if (fs.existsSync(path.join(M.root, 'data', 'orgs.json'))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', 'orgs.json'), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}

/**
 * @description Helper function for 0.6.0 to 0.6.0.1 migration. Handles all
 * updates to the project collection.
 *
 * @param {Array} projects - The projects being updated.
 * @param {object} jmi2Users - The found users in JMI Type 2 format.
 * @param {object} jmi2Orgs - The found orgs in JMI Type 2 format.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function sixToSevenProjectHelper(projects, jmi2Users, jmi2Orgs) {
  return new Promise((resolve, reject) => {
    const projectsToInsert = [];

    // For each project
    projects.forEach((project) => {
      // If the _id is an ObjectId, run the migration
      if (mongoose.Types.ObjectId.isValid(project._id)) {
        // Change the project _id to a string, rather than ObjectID
        project._id = project.id;
        // Set archive fields
        project.archived = project.deleted || false;
        project.archivedOn = project.deletedOn;
        project.archivedBy = project.deletedBy;
        // deleted, deletedOn and deletedBy fields have been removed
        delete project.deleted;
        delete project.deletedOn;
        delete project.deletedBy;

        // Change the permissions from ObjectIDs to strings
        project.permissions.read = project.permissions.read
        .map((u) => jmi2Users[u].username) || [];
        project.permissions.write = project.permissions.write
        .map((u) => jmi2Users[u].username) || [];
        project.permissions.admin = project.permissions.admin
        .map((u) => jmi2Users[u].username) || [];

        const newPermissions = {};
        // Convert permissions from arrays to objects with username as the keys,
        // permissions as the values
        project.permissions.read.forEach((user) => {
          if (project.permissions.admin.includes(user)) {
            newPermissions[user] = ['read', 'write', 'admin'];
          }
          else if (project.permissions.write.includes(user)) {
            newPermissions[user] = ['read', 'write'];
          }
          else {
            newPermissions[user] = ['read'];
          }
        });

        project.permissions = newPermissions;

        // Change createBy, archivedBy and lastModifiedBy from ObjectIDs to strings
        if (project.createdBy) {
          project.createdBy = jmi2Users[project.createdBy].username;
        }
        if (project.archivedBy) {
          project.archivedBy = jmi2Users[project.archivedBy].username;
        }
        if (project.lastModifiedBy) {
          project.lastModifiedBy = jmi2Users[project.lastModifiedBy].username;
        }

        // updatedOn is now set when project is created by default
        if (!project.updatedOn) {
          project.updatedOn = project.createdOn;
        }

        // Change the org reference from ObjectID to string
        project.org = jmi2Orgs[project.org]._id;
      }

      // Add the project to be inserted later
      projectsToInsert.push(project);
    });

    // Remove the id field from all objects
    projectsToInsert.forEach((project) => delete project.id);

    // Delete all projects
    Project.deleteMany({})
    // Find all indexes in the projects collections
    .then(() => Project.getIndexes())
    .then((indexes) => {
      const indexNames = indexes.map(i => i.name);
      // If unique ID index exists, delete from projects collection
      if (indexNames.includes('id_1')) {
        return Project.deleteIndex('id_1');
      }
    })
    // Insert updated projects
    .then(() => {
      // If there are projects to add, add them
      if (projectsToInsert.length > 0) {
        return Project.insertMany(projectsToInsert);
      }
    })
    .then(() => {
      if (fs.existsSync(path.join(M.root, 'data', 'projects.json'))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', 'projects.json'), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}

/**
 * @description Helper function for 0.6.0 to 0.6.0.1 migration. Handles all
 * updates to the element collection.
 *
 * @param {Array} elements - The elements being updated.
 * @param {object} jmi2Users - The found users in JMI Type 2 format.
 * @param {object} jmi2Projects - The found projects in JMI Type 2 format.
 * @param {object} jmi2Elements - The found elements in JMI Type 2 format.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function sixToSevenElementHelper(elements, jmi2Users, jmi2Projects, jmi2Elements) {
  return new Promise((resolve, reject) => {
    const elementsToInsert = [];

    // For each element
    elements.forEach((element) => {
      // If the _id is an ObjectId, run the migration
      if (mongoose.Types.ObjectId.isValid(element._id)) {
        // Change the element _id to a string, rather than ObjectID
        element._id = element.id;
        // Set archive fields
        element.archived = element.deleted || false;
        element.archivedOn = element.deletedOn;
        element.archivedBy = element.deletedBy;
        // contains, type, uuid, deleted, deletedOn and deletedBy fields have been removed
        delete element.contains;
        delete element.type;
        delete element.uuid;
        delete element.deleted;
        delete element.deletedOn;
        delete element.deletedBy;

        // Change createBy, archivedBy and lastModifiedBy from ObjectIDs to strings
        if (element.createdBy) {
          element.createdBy = jmi2Users[element.createdBy].username;
        }
        if (element.archivedBy) {
          element.archivedBy = jmi2Users[element.archivedBy].username;
        }
        if (element.lastModifiedBy) {
          element.lastModifiedBy = jmi2Users[element.lastModifiedBy].username;
        }

        // updatedOn is now set when element is created by default
        if (!element.updatedOn) {
          element.updatedOn = element.createdOn;
        }

        // Change the project reference from ObjectID to string
        element.project = jmi2Projects[element.project]._id;

        // Change parent, source and target from ObjectID to string
        if (element.parent) {
          element.parent = jmi2Elements[element.parent].id;
        }
        if (element.source) {
          element.source = jmi2Elements[element.source].id;
        }
        else {
          // Every element now has a source, set default to null
          element.source = null;
        }
        if (element.target) {
          element.target = jmi2Elements[element.target].id;
        }
        else {
          // Every element now has a target, set default to null
          element.target = null;
        }
      }

      // Add the element to be inserted later
      elementsToInsert.push(element);
    });

    // Remove the id field from all objects
    elementsToInsert.forEach((element) => delete element.id);

    // Delete all elements in the database
    Element.deleteMany({})
    // Find all indexes in the elements collections
    .then(() => Element.getIndexes())
    .then((indexes) => {
      const promises = [];
      // Loop through the found indexes
      indexes.forEach((index) => {
        // If unique UUID index exists, delete from elements collection
        if (index.name === 'uuid_1') {
          promises.push(Element.deleteIndex('uuid_1'));
        }
        // If unique ID index exists, delete from elements collection
        else if (index.name === 'id_1') {
          promises.push(Element.deleteIndex('id_1'));
        }
      });

      // Return when all element indexes have been dropped
      return Promise.all(promises);
    })
    // Insert updated elements
    .then(() => {
      // If there are elements to add, add them
      if (elementsToInsert.length > 0) {
        return Element.insertMany(elementsToInsert);
      }
    })
    .then(() => {
      if (fs.existsSync(path.join(M.root, 'data', 'elements.json'))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', 'elements.json'), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}

/**
 * @description Helper function for 0.6.0 to 0.6.0.1 migration. Handles all
 * updates to the user collection.
 *
 * @param {Array} users - The users being updated.
 * @param {object} jmi2Users - The found users in JMI Type 2 format.
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
function sixToSevenUserHelper(users, jmi2Users) {
  return new Promise((resolve, reject) => {
    const usersToInsert = [];

    // For each user
    users.forEach((user) => {
      // If the _id is an ObjectId, run the migration
      if (mongoose.Types.ObjectId.isValid(user._id)) {
        // Change the user _id to a string, rather than ObjectID
        user._id = user.username;
        user.archived = user.deleted || false;
        user.archivedOn = user.deletedOn;
        user.archivedBy = user.deletedBy;
        // deleted, deletedOn and deletedBy fields have been removed
        delete user.deleted;
        delete user.deletedOn;
        delete user.deletedBy;

        // Change createBy, archivedBy and lastModifiedBy from ObjectIDs to strings
        if (user.createdBy) {
          user.createdBy = jmi2Users[user.createdBy].username;
        }
        if (user.archivedBy) {
          user.archivedBy = jmi2Users[user.archivedBy].username;
        }
        if (user.lastModifiedBy) {
          user.lastModifiedBy = jmi2Users[user.lastModifiedBy].username;
        }

        // updatedOn is now set when user is created by default
        if (!user.updatedOn) {
          user.updatedOn = user.createdOn;
        }
      }

      // Add the user to be inserted later
      usersToInsert.push(user);
    });

    // Delete all users in the database
    User.deleteMany({})
    // Insert updated users
    .then(() => {
      // If there are users to add, add them
      if (usersToInsert.length > 0) {
        return User.insertMany(usersToInsert);
      }
    })
    .then(() => {
      if (fs.existsSync(path.join(M.root, 'data', 'users.json'))) {
        return new Promise(function(res, rej) {
          fs.unlink(path.join(M.root, 'data', 'users.json'), function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}
