/**
 * Classification: UNCLASSIFIED
 *
 * @module api-routes
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines the MBEE API routes.
 *
 * Note: Routes that require authentication calls
 * "AuthController.authenticate()" as their first function.
 * This will authenticate the user and move to the next function.
 */

// Node modules
const express = require('express');
const api = express.Router();

// MBEE modules
const APIController = M.require('controllers.api-controller');
const AuthController = M.require('lib.auth');
const Middleware = M.require('lib.middleware');


/**
 * @swagger
 * /api/test:
 *   get:
 *     tags:
 *       - general
 *     description: Returns a 200 status. Used to test if the API is up or a
 *        connection can be established.
 *     responses:
 *       200:
 *         description: OK, Succeeded to test the API is up.
 */
api.get('/test', Middleware.logRoute, APIController.test);


/**
 * @swagger
 * /api/doc/swagger.json:
 *   get:
 *     tags:
 *       - general
 *     description: Returns the swagger spec file in JSON format.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK, Succeeded to get the swagger doc.
 */
api.get('/doc/swagger.json', Middleware.logRoute, APIController.swaggerJSON);

/**
 * @swagger
 * /api/login:
 *   post:
 *     tags:
 *       - general
 *     description: Logs the user into the application.
 *     parameters:
 *       - name: Content
 *         description: The object containing username and password
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *           properties:
 *             username:
 *               type: string
 *             password:
 *               type: string
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK, Succeeded to login returns session token data.
 *       400:
 *         description: Bad Request, Failed to login due to invalid credentials.
 *       401:
 *         description: Unauthorized, Failed to login due to not having permissions.
 *       500:
 *         description: Internal Server Error, Failed to login due to a server side issue.
 */
api.route('/login')
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  AuthController.doLogin,
  APIController.login
);


/**
 * @swagger
 * /api/version:
 *   get:
 *     tags:
 *       - general
 *     description: Returns the application version as JSON.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK, Succeeded to get version returns version.
 *       401:
 *         description: Unauthorized, Failed to get version due to not having permissions.
 *       500:
 *         description: Internal Server Error, Failed to get version due to a server side issue.
 */
api.route('/version')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.version
);

/**
 * @swagger
 * /api/orgs:
 *   get:
 *     tags:
 *       - organizations
 *     description: Returns an array of organizations that the requesting user is a member of.
 *         If the user is not a member of any organizations, an empty array is returned.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET orgs returns orgs' data.
 *       400:
 *         description: Bad Request, Failed to GET orgs due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET orgs due to not being logged in.
 *       404:
 *         description: Not Found, Failed to GET orgs due to orgs not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET orgs due to a server side issue.
 *   post:
 *     tags:
 *       - organizations
 *     description: Creates multiple organizations from the data provided in the
 *                  request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing the organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - orgs
 *           properties:
 *             orgs:
 *               type: object
 *               description: An array of objects containing organization data.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST orgs returns orgs' data.
 *       400:
 *         description: Bad Request, Failed to POST orgs due to invalid field in orgs' data.
 *       401:
 *         description: Unauthorized, Failed to POST orgs due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST orgs due to an already existing orgs with same id.
 *       500:
 *         description: Internal Server Error, Failed to POST orgs due to a server side issue.
 *   patch:
 *     tags:
 *       - organizations
 *     description: Updates multiple organizations from the data provided in the
 *                  request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing the organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - orgs
 *           properties:
 *             orgs:
 *               type: object
 *               description: An array of orgs to update. Can either be the
 *                            org objects or the ids of the orgs.
 *             update:
 *               type: object
 *               description: An object containing fields to update in the orgs
 *                            and their corresponding values.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH orgs returns orgs' data.
 *       400:
 *         description: Bad Request, Failed to PATCH orgs due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH orgs due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH orgs due to an already existing org with same id.
 *       500:
 *         description: Internal Server Error, Failed to PATCH orgs due to a server side issue.
 *   delete:
 *     tags:
 *       - organizations
 *     description: Deletes multiple organizations from the data provided in the
 *                  request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing the organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - orgs
 *           properties:
 *             orgs:
 *               type: object
 *               description: An array of orgs to delete. Can either be the
 *                            org objects or the ids of the orgs.
 *             hardDelete:
 *               type: boolean
 *               description: The boolean indicating if the org should be hard
 *                            deleted or not. The user must be a global admin
 *                            to hard delete. Defaults to false.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE orgs returns deleted orgs' data.
 *       400:
 *         description: Bad Request, Failed to DELETE orgs due to invalid orgs' data.
 *       401:
 *         description: Unauthorized, Failed to DELETE orgs due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE orgs due to not having permissions.
 *       500:
 *         description: Internal Server Error, Failed to DELETE org due to a server side issue.
 */
api.route('/orgs')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getOrgs
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postOrgs
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchOrgs
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteOrgs
);


/**
 * @swagger
 * /api/orgs/:orgid:
 *   get:
 *     tags:
 *       - organizations
 *     description: Returns an organization's public data.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to get
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET org returns org data.
 *       400:
 *         description: Bad Request, Failed to GET org due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET org due to not being logged in.
 *       404:
 *         description: Not Found, Failed to GET org due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET org due to a server side issue.
 *   post:
 *     tags:
 *       - organizations
 *     description: Create a new organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to create. A valid orgid must
 *                      only contain lowercase letters, numbers, and dashes
 *                      ("-") and must begin with a letter.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - name
 *           properties:
 *             name:
 *               type: string
 *               description: The name of the organization. A valid organization name
 *                            can only contain letters, numbers, dashes ("-"), and
 *                            spaces.
 *             id:
 *               type: string
 *               description: The ID of the organization to create. A valid id must
 *                            only contain lowercase letters, numbers, and dashes
 *                            ("-") and must begin with a letter.
 *             custom:
 *               type: JSON Object
 *               description: Custom JSON data that can be added to an organization
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST org returns org data.
 *       400:
 *         description: Bad Request, Failed to POST org due to invalid field in data.
 *       401:
 *         description: Unauthorized, Failed to POST org due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST org due to an existing org with same id.
 *       500:
 *         description: Internal Server Error, Failed to POST org due to a server side issue.
 *
 *   patch:
 *     tags:
 *       - organizations
 *     description: Updates an existing organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the existing organization to update.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the updated organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The updated name of the organization.
 *             custom:
 *               type: JSON Object
 *               description: The updated custom JSON data of the organization.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH org returns updated org data.
 *       400:
 *         description: Bad Request, FAILED to PATCH org due to invalid update data.
 *       401:
 *         description: Unauthorized, FAILED to PATCH org due to not being logged in.
 *       403:
 *         description: Forbidden, FAILED to PATCH org due to updating an immutable field.
 *       404:
 *         description: Not Found, FAILED to PATCH org due to not finding org.
 *       500:
 *         description: Internal Server Error, Failed to PATCH org due to a server side issue.
 *
 *   delete:
 *     tags:
 *       - organizations
 *     description: Deletes the organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to delete.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing delete options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             hardDelete:
 *               type: boolean
 *               description: The boolean indicating if the organization should be hard deleted or
 *                            not. The user must be a global admin to hard delete. Defaults to
 *                            false.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE org return deleted org data.
 *       400:
 *         description: Bad Request, Failed to DELETE org due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE org due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE org due to not having permissions.
 *       404:
 *         description: Not Found, Failed to DELETE org due to not finding org.
 *       500:
 *         description: Internal Server Error, Failed to DELETE org due to a server side issue.
 */
api.route('/orgs/:orgid')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getOrg
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postOrg
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchOrg
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteOrg
);

/**
 * @swagger
 * /api/orgs/:orgid/projects:
 *   get:
 *     tags:
 *       - projects
 *     description: Returns a list of all projects and their public data that the requesting
 *                  user has access to within an organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to get.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing get project options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             softDeleted:
 *               type: boolean
 *               description: The boolean indicating if soft deleted projects are returned. The user
 *                            must be a global admin or an admin on the organization to find soft
 *                            deleted projects.
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET projects returns org data.
 *       400:
 *         description: Bad Request, Failed to GET projects due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET projects due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET projects due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET projects due to projects not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET projects due to a server side issue.
 *
 *   post:
 *     tags:
 *       - projects
 *     description: Creates multiple projects from the supplied data in the body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to get.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing project objects to be created.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           description: An array of projects to create. Each project must
 *                        contain the name and id of that project.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST projects returns project data
 *       400:
 *         description: Bad Request, Failed to POST projects due to invalid project data.
 *       401:
 *         description: Unauthorized, Failed to POST projects due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST projects due to project ids already existing.
 *       500:
 *         description: Internal Server Error, Failed to POST projects due to a server side issue.
 *   patch:
 *     tags:
 *       - projects
 *     description: Updates multiple projects from the data provided in the
 *                  request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing the project data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           description: An array of updated project objects.
 *
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH project returns project data.
 *       400:
 *         description: Bad Request, Failed to PATCH project due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH project due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH project due to updating an immutable field.
 *       500:
 *         description: Internal Server Error, Failed to PATCH project due to server side issue.
 *   delete:
 *     tags:
 *       - projects
 *     description: Deletes multiple projects either by the organization or by
 *                  a supplied list in the body of the request.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to get.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing delete projects options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           description: An array of projects to delete.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE projects return deleted project data.
 *       400:
 *         description: Bad Request, Failed to DELETE project due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE project due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE project due to not having permissions on org.
 *       500:
 *         description: Internal Server Error, Failed to DELETE org due to a server side issue.
 */
api.route('/orgs/:orgid/projects')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getProjects
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postProjects
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchProjects
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteProjects
);

/**
 * @swagger
 * /api/orgs/:orgid/projects/:projectid:
 *   get:
 *     tags:
 *       - projects
 *     description: Returns a project's public data.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization the project is in.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to get.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing get project options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             softDeleted:
 *               type: boolean
 *               description: The boolean indicating if a soft deleted project is returned. The user
 *                            must be a global admin or an admin on the organization to find a soft
 *                            deleted project.
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET project returns project data.
 *       400:
 *         description: Bad Request, Failed to GET project due to invalid id field.
 *       401:
 *         description: Unauthorized, Failed to GET project due to not not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET project due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET project due to project with given id not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET project due to a server side issue.
 *
 *   post:
 *     tags:
 *       - projects
 *     description: Creates a new project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the new project.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the new project. A valid project ID must consist
 *                      of only lowercase letters, numbers, and dashes (e.g.
 *                      "-") and must begin with a letter.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the new project data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - id
 *             - name
 *           properties:
 *             id:
 *               type: string
 *               description: The project ID. If this is provided, it must
 *                      match the project ID provided in the URI. A valid
 *                      project ID must consist of only lowercase letters,
 *                      numbers, and dashes (e.g. "-") and must begin with a
 *                      letter.
 *             name:
 *               type: string
 *               description: The name of the new project. A valid project name can
 *                      only consist of only letters, numbers, and dashes
 *                      (e.g. "-").
 *             orgid:
 *               type: string
 *               description: The ID of the organization containing project. If this
 *                      is provided, it must match the organization ID provided
 *                      in the URI.
 *             custom:
 *               type: JSON Object
 *               description: Custom JSON data that can be added to a project.
 *             visibility:
 *               type: string
 *               description: Indicates the visibility of the project. Can be either
 *                            private or internal. Defaults to private if not included.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST project return project data.
 *       400:
 *         description: Bad Request, Failed to POST project due to invalid project data.
 *       401:
 *         description: Unauthorized, Failed to POST project due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST project due posting with an already existing id.
 *       404:
 *         description: Not Found, Failed to POST project due to org not being found.
 *       500:
 *         description: Internal Server Error, Failed to POST project due to a server side issue.
 *
 *   patch:
 *     tags:
 *       - projects
 *     description: Updates an existing project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to update.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to update.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description:
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The updated name for the project.
 *             custom:
 *               type: JSON Object
 *               description: The updated custom data for the project.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH project returns updated project data.
 *       400:
 *         description: Bad Request, Failed to PATCH project due to invalid update data.
 *       401:
 *         description: Unauthorized, Failed to PATCH project due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH project due to updating an immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH project due to not finding project.
 *       500:
 *         description: Internal Server Error, Failed to PATCH project due to a server side issue.
 *
 *   delete:
 *     tags:
 *       - projects
 *     description: Deletes a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to be deleted.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to delete.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing delete options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             hardDelete:
 *               type: boolean
 *               description: The boolean indicating if the project should be hard deleted or
 *                            not. The user must be a global admin to hard delete.
 *                            Defaults to false.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE project return deleted project data.
 *       400:
 *         description: Bad Request, Failed to DELETE project due to invalid project data.
 *       401:
 *         description: Unauthorized, Failed to DELETE project due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE project due to not having permissions on org.
 *       404:
 *         description: Not Found, Failed to DELETE project due to not finding project.
 *       500:
 *         description: Internal Server Error, Failed to DELETE project due to server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getProject
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postProject
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchProject
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteProject
);


/**
 * @swagger
 * /api/orgs/:orgid/members:
 *   get:
 *     tags:
 *       - organizations
 *     description: Returns a list of user permissions who are members of an organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to get members permissions from.
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET members from org returns list of members.
 *       400:
 *         description: Bad Request, Failed to GET members due to invalid org data.
 *       401:
 *         description: Unauthorized, Failed to GET members due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET members due to not having permissions on org.
 *       404:
 *         description: Not Found, Failed to GET members from org due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET members due to a server side issue.
 */
api.route('/orgs/:orgid/members')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getAllOrgMemRoles
);

/**
 * @swagger
 * /api/orgs/:orgid/members/:username:
 *   get:
 *     tags:
 *       - organizations
 *     description: Returns the permissions a user has on an organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to get a users permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to return permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET user from org returns public user data.
 *       400:
 *         description: Bad Request, Failed to GET user from org due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET user due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET user due to not having permissions
 *       404:
 *         description: Not Found, Failed to GET user due to not finding user or org.
 *       500:
 *         description: Internal Server Error, Failed to GET user due to server side issue.
 *
 *   post:
 *     tags:
 *       - organizations
 *     description: Sets or updates a users permissions on an organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to set or update user permission on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to set up update permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the permissions level to set.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - role
 *           properties:
 *             role:
 *               type: string
 *               description: The role the user will be set to on the organization.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST org user role returns org data.
 *       400:
 *         description: Bad Request, Failed to POST org user role due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST org user role due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST org user role due to not having permissions.
 *       404:
 *         description: Not Found, Failed to POST org user role due to not finding org.
 *       500:
 *         description: Internal Server Error, Failed to POST user role due to server side issue.
 *
 *   patch:
 *     tags:
 *       - organizations
 *     description: Sets or updates a users permissions on an organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to set or update user permission on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to set up update permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the permissions level to set.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - role
 *           properties:
 *             role:
 *               type: string
 *               description: The role the user will be set to on the organization.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH org user role returns org data.
 *       400:
 *         description: Bad Request, Failed to PATCH org user role due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH org user role due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH org user role due to not having permissions.
 *       404:
 *         description: Not Found, Failed to PATCH org user role due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to PATCH user role due to server side issue.
 *
 *   delete:
 *     tags:
 *       - organizations
 *     description: Removes all users permissions from an organization.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to remove the user from.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to remove from the organization.
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE user role returns org data.
 *       400:
 *         description: Bad Request, Failed to DELETE user role due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE user role due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE user role due to not having permissions.
 *       404:
 *         description: Not Found, Failed to DELETE user role due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE user role due to server side issue.
 */
api.route('/orgs/:orgid/members/:username')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getOrgRole
)
// NOTE: POST and PATCH have the same functionality in this case,
// thus they map to the same route.
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postOrgRole
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postOrgRole
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteOrgRole
);

/**
 * @swagger
 * /api/orgs/:orgid/projects/:projectid/members:
 *   get:
 *     tags:
 *       - projects
 *     description: Returns a list of members and their permissions for a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to get members permissions from.
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET project members returns list of members.
 *       400:
 *         description: Bad Request, Failed to GET project members due to invalid project data.
 *       401:
 *         description: Unauthorized, Failed to GET project members due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET project members due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET project members due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET members due to server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/members')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getAllProjMemRoles
);

/**
 * @swagger
 * /api/orgs/:orgid/projects/:projectid/members/:username:
 *   get:
 *     tags:
 *       - projects
 *     description: Returns the permissions a user has on a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to get a users permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to return permissions for.
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET user from project returns user public data.
 *       400:
 *         description: Bad Request, Failed to GET user from project due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET user from project due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET user from project due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET user from project due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET user due to server side issue.
 *
 *   post:
 *     tags:
 *       - projects
 *     description: Sets or updates a users permissions on a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to set or update a user's permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to set permissions for.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the permissions level to set.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - role
 *           properties:
 *             role:
 *               type: string
 *               description: The role the user will be set to on the project.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST project user role returns project data.
 *       400:
 *         description: Bad Request, Failed to POST project user role due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST project user role due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST project user role due to not having permissions.
 *       404:
 *         description: Not Found, Failed to POST project user role due to project not existing.
 *       500:
 *         description: Internal Server Error, Failed to POST user role due to server side issue.
 *
 *   patch:
 *     tags:
 *       - projects
 *     description: Sets or updates a users permissions on a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to set or update a user's permissions on.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to set permissions for.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the permissions level to set.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - role
 *           properties:
 *             role:
 *               type: string
 *               description: The role the user will be set to on the project.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH project user role returns project data.
 *       400:
 *         description: Bad Request, Failed to PATCH project user role due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH project user role due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH project user role due to not having permissions.
 *       404:
 *         description: Not Found, Failed to PATCH project user role due to project not existing.
 *       500:
 *         description: Internal Server Error, Failed to PATCH user role due to server side issue.
 *
 *   delete:
 *     tags:
 *       - projects
 *     description: Removes all users permissions from a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID to remove the user from.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username of the user to remove from the project.
 *         in: URI
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE project user role returns org data.
 *       400:
 *         description: Bad Request, Failed to DELETE project user role due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE project user role due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE project user role due to not having permissions.
 *       404:
 *         description: Not Found, Failed to DELETE project user role due to project not existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE user role due to server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/members/:username')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getProjMemRole
)
// NOTE: POST and PATCH have the same functionality in this case,
// thus they map to the same route.
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postProjectRole
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postProjectRole
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteProjectRole
);

/**
 * @swagger
 * /api/orgs/:orgid/projects/:projectid/elements:
 *   get:
 *     tags:
 *       - elements
 *     description: Returns an array of all elements of a project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID containing the element.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing elements options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             softDeleted:
 *               type: boolean
 *               description: The boolean indicating if a soft deleted element is returned. The user
 *                            must be a global admin or an admin on the project to find a soft
 *                            deleted elements.
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET elements returns elements data
 *       400:
 *         description: Bad Request, Failed to GET elements due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET elements due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET elements due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET elements due to a non existing project or org.
 *       500:
 *         description: Internal Server Error, Failed to GET elements due to server side issue.
 *
 *   post:
 *     tags:
 *       - elements
 *     description: Creates multiple elements from the data provided in the
 *                  request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID containing the elements.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the element data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           description: An array of element objects to create.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST element, return element data.
 *       400:
 *         description: Bad Request, Failed to POST elements due to invalid element data.
 *       401:
 *         description: Unauthorized, Failed to POST elements due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST elements due to permissions or already
 *                      existing elements.
 *       404:
 *         description: Not Found, Failed to GET project or organization.
 *       500:
 *         description: Internal Server Error, Failed to POST elements due to a server side issue.
 *   patch:
 *     tags:
 *       - elements
 *     description: Updates multiple elements from the data provided in the
 *                  request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing the element data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - elements
 *             - update
 *           properties:
 *             elements:
 *               type: object
 *               description: An array of elements to update. Can either be the
 *                            element objects or the ids of the elements.
 *             update:
 *               type: object
 *               description: An object containing fields to update in the
 *                            elements and their corresponding values.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH elements, returns elements data
 *       400:
 *         description: Bad Request, Failed to PATCH elements due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to PATCH element due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH elements due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to PATCH elements due to server side issue.
 *   delete:
 *     tags:
 *       - elements
 *     description: Deletes multiple elements either by the org and project or by
 *                  a supplied list in the body of the request.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to get.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID whose elements to delete.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing delete elements options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             projects:
 *               type: object
 *               description: An array of elements to delete. Can either be the
 *                            element objects or the ids of the elements. If the
 *                            list is not provided, all elements under the
 *                            project will be deleted.
 *             hardDelete:
 *               type: boolean
 *               description: The boolean indicating if the element should be
 *                            hard deleted or not. The user must be a global
 *                            admin to hard delete. Defaults to false.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE elements, returns elements data
 *       400:
 *         description: Bad Request, Failed to DELETE elements due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to DELETE element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE elements due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to DELETE elements due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/elements')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getElements
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postElements
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchElements
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteElements
);

/**
 * @swagger
 * /api/orgs/:orgid/projects/:projectid/elements/:elementid:
 *   get:
 *     tags:
 *       - elements
 *     description: Returns an element.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID containing the element.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to return.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing get element options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             softDeleted:
 *               type: boolean
 *               description: The boolean indicating if the soft deleted element is returned. The
 *                            user must be a global admin or an admin on the project to
 *                            find a soft deleted element.
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET element returns element data.
 *       400:
 *         description: Bad Request, Failed to GET element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET element due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET element due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET element due to element not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET element due to server side issue.
 *
 *   post:
 *     tags:
 *       - elements
 *     description: Creates a new element.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID containing the element.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to be created.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the new element data.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           required:
 *             - id
 *             - name
 *           properties:
 *             id:
 *               type: string
 *               description: The ID of the element. If this is provided, it must
 *                      match the element ID provided in the URI.
 *             name:
 *               type: string
 *               description: The name for the element.
 *             documentation:
 *               type: string
 *               description: The documentation for the element.
 *             custom:
 *               type: JSON Object
 *               description: Custom JSON data to be added to the element.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST element returns element data.
 *       400:
 *         description: Bad Request, Failed to POST element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST element due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST element due to not having permissions.
 *       404:
 *         description: Not Found, Failed to POST element due to project/org not existing.
 *       500:
 *         description: Internal Server Error, Failed to POST element due to server side issue.
 *
 *   patch:
 *     tags:
 *       - elements
 *     description: Updates an existing element.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID containing the element.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to be updated.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing the updated element data.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The updated name for the element.
 *             documentation:
 *               type: string
 *               description: The updated documentation for the element.
 *             custom:
 *               type: JSON Object
 *               description: The updated custom JSON data for the element.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH element returns element data.
 *       400:
 *         description: Bad Request, Failed to PATCH element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH element due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH element due to updating an immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH element due to element not existing.
 *       500:
 *         description: Internal Server Error, Failed to PATCH element due to server side issue.
 *
 *   delete:
 *     tags:
 *       -  elements
 *     description: Deletes an element.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The project ID containing the element.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to delete.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: content
 *         description: The object containing delete options.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             hardDelete:
 *               type: boolean
 *               description: The boolean indicating if the element should be hard deleted or
 *                            not. The user must be a global admin to hard delete.
 *                            Defaults to false.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE element returns element data.
 *       400:
 *         description: Bad Request, Failed to DELETE element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE element due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE element due to not having permissions.
 *       404:
 *         description: Not Found, Failed to DELETE element due to element not existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE element due to server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/elements/:elementid')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getElement
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postElement
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchElement
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteElement
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - users
 *     description: Returns an array of all user's public data.
 *     produces:
 *       - application/json
 *     parameters:
 *       - N/A
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET users returns public user data.
 *       400:
 *         description: Bad Request, Failed to GET users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET users due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET users due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET users due to not finding any users.
 *       500:
 *         description: Internal Server Error, Failed to GET users due to server side issue.
 *
 *   post:
 *     tags:
 *       - users
 *     description: Creates multiple users from the supplied data in the body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing user objects to be created.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             users:
 *               type: object
 *               description: An array of users to create. Each user must
 *                            contain the username of that user.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST users returns public users data.
 *       400:
 *         description: Bad Request, Failed to POST users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST users due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST users due to not having permissions.
 *       500:
 *         description: Internal Server Error, Failed to POST users due to server side issue.
 *   patch:
 *     tags:
 *       - users
 *     description: Updates multiple users from the supplied list in the body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing user objects to be updated.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             users:
 *               type: object
 *               description: An array of users to update. Can either be a list
 *                            of user objects or of usernames.
 *             update:
 *               type: object
 *               description: An object containing fields to update in the users
 *                            and their corresponding values.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH users, returns public users data.
 *       400:
 *         description: Bad Request, Failed to PATCH users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH users due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH users due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to PATCH users due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       - users
 *     description: Deletes multiple users from the supplied list in the body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: content
 *         description: The object containing user objects to be deleted.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             users:
 *               type: object
 *               description: An array of users to delete. Can either be a list
 *                            of user objects or of usernames.
 *             hardDelete:
 *               type: boolean
 *               description: The boolean indicating if the users should be hard
 *                            deleted or not. Defaults to false.
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE users return users data.
 *       400:
 *         description: Bad Request, Failed to DELETE users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE users due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE users due to not having permissions.
 *       500:
 *         description: Internal Server Error, Failed to DELETE users due to server side issue.
 */
api.route('/users')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.getUsers
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.postUsers
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.patchUsers
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.deleteUsers
);

/**
 * @swagger
 * /api/users/whoami:
 *   get:
 *     tags:
 *       - users
 *     description: Returns the currently logged in user's public information
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET current user information returns user public data.
 *       400:
 *         description: Bad Request, Failed to GET current user information due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET user information due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET user information due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET current user information due to not finding user.
 *       500:
 *         description: Internal Server Error, Failed to GET user info due to server side issue.
 */
api.route('/users/whoami')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.whoami
);

/**
 * @swagger
 * /api/users/:username:
 *   get:
 *     tags:
 *       - users
 *     description: Returns a user's public information.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to return
 *         required: true
 *         type: string
 *         in: URI
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET user returns user public data.
 *       400:
 *         description: Bad Request, Failed to GET user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET user due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to GET user due to not having permissions.
 *       404:
 *         description: Not Found, Failed to GET user due to user not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET user due to server side issue.
 *
 *   post:
 *     tags:
 *       - users
 *     description: Creates a new user.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to create.
 *         required: true
 *         type: string
 *         in: URI
 *       - name: content
 *         description: The object containing the new user data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *           properties:
 *             username:
 *               type: string
 *               description: The username of the user to create. If provided, this
 *                            must match the username provided in the URI.
 *             password:
 *               type: string
 *               description: The password of the user being created. This field
 *                            is required unless LDAP authentication is used.
 *             fname:
 *               type: string
 *               description: The user's first name.
 *             lname:
 *               type: string
 *               description: The user's last name.
 *             preferredName:
 *               type: string
 *               description: The user's preferred first name.
 *             email:
 *               type: string
 *               description: The user's email address.
 *             custom:
 *               type: JSON Object
 *               description: Custom JSON data that can be added to a user.
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST user returns public user data.
 *       400:
 *         description: Bad Request, Failed to POST user due to invalid information.
 *       401:
 *         description: Unauthorized, Failed to POST user due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to POST user due to using username that already exists.
 *       500:
 *         description: Internal Server Error, Failed to POST user due to server side issue.
 *
 *   patch:
 *     tags:
 *       - users
 *     description: Updates an existing user.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to update.
 *         required: true
 *         type: string
 *         in: URI
 *       - name: content
 *         description: The object containing the updated user data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *           properties:
 *             fname:
 *               type: string
 *               description: The user's updated first name.
 *             lname:
 *               type: string
 *               description: The user's updated last name.
 *             preferredName:
 *               type: string
 *               description: The user's updated preferred first name.
 *             email:
 *               type: string
 *               description: The user's updated email address.
 *             custom:
 *               type: JSON Object
 *               description: The updated custom JSON data for the user.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH user returns public user data.
 *       400:
 *         description: Bad Request, Failed to PATCH user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH user due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH user due updating an immutable field.
 *       404:
 *         description: Not Found, Failed ot PATCH user due to user not existing.
 *       500:
 *         description: Internal Server Error, Failed ot PATCH user due to server side issue.
 *
 *   delete:
 *     tags:
 *       - users
 *     description: Deletes a user.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to delete.
 *         required: true
 *         type: string
 *         in: URI
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE user returns user public data.
 *       400:
 *         description: Bad Request, Failed to DELETE user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE user due to not being logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE user due to not having permissions.
 *       404:
 *         description: Not Found, Failed to DELETE user due to user not existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE user due to server side issues.
 */
api.route('/users/:username')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.getUser
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.postUser
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.patchUser
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.deleteUser
);

// Catches any invalid api route not defined above.
api.use('*', APIController.invalidRoute);

// Export the API router
module.exports = api;
