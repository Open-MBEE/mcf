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
 *         description: OK, the API is up.
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
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK, Succeeded to login user, returns session token data.
 *       400:
 *         description: Bad Request, Failed to login due to invalid credentials.
 *       401:
 *         description: Unauthorized, Failed to login due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to login due to a server
 *                      side issue.
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
 *         description: OK, Succeeded to get version.
 *       401:
 *         description: Unauthorized, Failed to get version due to not being
 *                      logged in.
 *       500:
 *         description: Internal Server Error, Failed to get version due to
 *                      server side issue.
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
 *     description: Returns an array of organizations the requesting user has
 *                  read access to. By default, returns all organizations the
 *                  user has read access to. Optionally, an array of IDs can be
 *                  provided in the request body or a comma separated list in
 *                  the request parameters to find multiple, specific orgs.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: An array of object IDs to search for. If both query
 *                      parameter and body are not provided, all objects the
 *                      user has access to are found.
 *       - name: ids
 *         description: Comma separated list of IDs to search for. If both the
 *                      query parameter and body are not provided, all objects
 *                      the user has access to are found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET orgs, returns public org data.
 *       400:
 *         description: Bad Request, Failed to GET orgs due to invalid request
 *                      format.
 *       401:
 *         description: Unauthorized, Failed to GET orgs due to not being logged
 *                      in.
 *       404:
 *         description: Not Found, Failed to GET orgs due to orgs not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET orgs due to a
 *                      server side issue.
 *   post:
 *     tags:
 *       - organizations
 *     description: Creates multiple organizations from the data provided in the
 *                  request body. Returns the created organization's public
 *                  data. This endpoint is reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: orgs
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               custom:
 *                 type: object
 *               permissions:
 *                 type: object
 *                 description: Any preset permissions. Keys are the users
 *                              usernames, and values are the permission.
 *         description: An array of objects containing organization data.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST orgs, returns orgs' public data.
 *       400:
 *         description: Bad Request, Failed to POST orgs due to invalid field in
 *                      request body.
 *       401:
 *         description: Unauthorized, Failed to POST orgs due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST orgs due to already existing
 *                      orgs with same id.
 *       500:
 *         description: Internal Server Error, Failed to POST orgs due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - organizations
 *     description: Updates multiple organizations from the data provided in the
 *                  request body. Orgs that are currently archived must first be
 *                  unarchived before making any other updates. The following
 *                  fields can be updated [name, custom, archived, permissions].
 *                  NOTE, the id is required in the request body, but CANNOT be
 *                  updated.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: orgs
 *         description: An array of objects containing updates to multiple orgs.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The current ID of the org, cannot be updated.
 *               name:
 *                 type: string
 *               custom:
 *                 type: object
 *               archived:
 *                 type: boolean
 *               permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH orgs, returns orgs' public data.
 *       400:
 *         description: Bad Request, Failed to PATCH orgs due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH orgs due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH orgs due to org already being
 *                      archived.
 *       500:
 *         description: Internal Server Error, Failed to PATCH orgs due to a
 *                      server side issue.
 *   delete:
 *     tags:
 *       - organizations
 *     description: Deletes multiple organizations and any projects and elements
 *                  name-spaced under the specified orgs. NOTE this endpoint can
 *                  be used by system-admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgIDs
 *         description: An array of organization IDs to delete. Can optionally
 *                      be an array of objects containing id key/value pairs.
 *         in: body
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE orgs, returns deleted orgs' ids.
 *       400:
 *         description: Bad Request, Failed to DELETE orgs due to invalid data
 *                      in the request body.
 *       401:
 *         description: Unauthorized, Failed to DELETE orgs due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE orgs due to not having
 *                      correct permissions.
 *       500:
 *         description: Internal Server Error, Failed to PATCH org due to a
 *                      server side issue.
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
 * /api/orgs/{orgid}:
 *   get:
 *     tags:
 *       - organizations
 *     description: Finds and returns an organizations public data if the user
 *                  has read permissions on that org.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to find.
 *         in: path
 *         required: true
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET org, returns org public data.
 *       400:
 *         description: Bad Request, Failed to GET org due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET org due to not being logged
 *                      in.
 *       404:
 *         description: Not Found, Failed to GET org due to org not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET org due to a server
 *                      side issue.
 *   post:
 *     tags:
 *       - organizations
 *     description: Create a new organization from the given data in the request
 *                  body. This endpoint is reserved for system-admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: org
 *         description: The object containing the new organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - name
 *           properties:
 *             id:
 *               type: string
 *               description: Must match the id in the request parameters.
 *             name:
 *               type: string
 *             custom:
 *               type: object
 *             permissions:
 *               type: object
 *               description: Any preset permissions. Keys are the users
 *                            usernames, and values are the permission.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST org, returns org public data.
 *       400:
 *         description: Bad Request, Failed to POST org due to invalid field in
 *                      request data.
 *       401:
 *         description: Unauthorized, Failed to POST org due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST org due to an existing org
 *                      with same id.
 *       500:
 *         description: Internal Server Error, Failed to POST org due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - organizations
 *     description: Updates an existing organization. The following fields can
 *                  be updated [name, custom, archived, permissions]. Orgs that
 *                  are currently archived must first be unarchived before
 *                  making any other updates.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to update.
 *         in: path
 *         required: true
 *         type: string
 *       - name: update
 *         description: The object containing the updated organization data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             custom:
 *               type: object
 *             archived:
 *               type: boolean
 *             permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH org, returns updated org public
 *                      data.
 *       400:
 *         description: Bad Request, FAILED to PATCH org due to invalid
 *                      update request data.
 *       401:
 *         description: Unauthorized, FAILED to PATCH org due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, FAILED to PATCH org due to updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, FAILED to PATCH org due to not finding org.
 *       500:
 *         description: Internal Server Error, Failed to PATCH org due to a
 *                      server side issue.
 *   delete:
 *     tags:
 *       - organizations
 *     description: Deletes the specified organization and any projects and
 *                  elements name-spaced under the org. NOTE this endpoint is
 *                  reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to delete.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE org, return deleted org ID.
 *       400:
 *         description: Bad Request, Failed to DELETE org due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE org due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE org due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to DELETE org due to not finding org.
 *       500:
 *         description: Internal Server Error, Failed to DELETE org due to a
 *                      server side issue.
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
 * /api/projects:
 *   get:
 *     tags:
 *       - projects
 *     description: Returns a list of all projects and their public data that
 *                  the requesting user has access to.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET projects, returns project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET projects due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET projects due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET projects due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET projects due to projects not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET projects due to a
 *                      server side issue.
 */
api.route('/projects')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getAllProjects
);

/**
 * @swagger
 * /api/orgs/{orgid}/projects:
 *   get:
 *     tags:
 *       - projects
 *     description: Returns an array of projects the requesting user has read
 *                  access to on a specified org. By default, returns all
 *                  projects on the specified org that the user has read access
 *                  to. Optionally, an array of IDs can be provided in the
 *                  request body or a comma separated list in the request
 *                  parameters to find multiple, specific projects.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization which contains the searched
 *                      projects.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: An array of object IDs to search for. If both query
 *                      parameter and body are not provided, all objects the
 *                      user has access to (under the specified org) are found.
 *       - name: ids
 *         description: Comma separated list of IDs to search for. If both query
 *                      parameter and body are not provided, all objects the
 *                      user has access to (under the specified org) are found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET projects, returns project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET projects due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET projects due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET projects due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET projects due to projects not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET projects due to a
 *                      server side issue.
 *   post:
 *     tags:
 *       - projects
 *     description: Creates multiple projects from the supplied data in the
 *                  request body. Returns the created projects' public data.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projects
 *         in: body
 *         description: An array of objects containing new project data.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               custom:
 *                 type: object
 *               visibility:
 *                 type: string
 *                 default: private
 *                 enum: [internal, private]
 *               permissions:
 *                 type: object
 *                 description: Any preset permissions. Keys are the users
 *                              usernames, and values are the permission.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST projects, returns project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST projects due to invalid
 *                      project data.
 *       401:
 *         description: Unauthorized, Failed to POST projects due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST projects due to project ids
 *                      already existing.
 *       500:
 *         description: Internal Server Error, Failed to POST projects due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - projects
 *     description: Updates multiple projects from the data provided in the
 *                  request body. Projects that are currently archived must
 *                  first be unarchived before making any other updates. The
 *                  following fields can be updated [name, custom, archived,
 *                  permissions]. NOTE, the id is required in the request body,
 *                  but CANNOT be updated.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to update.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         name: projects
 *         description: An array of objects containing updates to multiple
 *                      projects.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The current ID of the project, cannot be
 *                              updated.
 *               name:
 *                 type: string
 *               custom:
 *                 type: object
 *               archived:
 *                 type: boolean
 *               permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH project, returns project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PATCH project due to invalid
 *                      request data.
 *       401:
 *         description: Unauthorized, Failed to PATCH project due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH project due to updating an
 *                      immutable field.
 *       500:
 *         description: Internal Server Error, Failed to PATCH project due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       - projects
 *     description: Deletes multiple projects and any elements name-spaced under
 *                  the specified project. NOTE this endpoint can be used by
 *                  system-admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects are to be
 *                      deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectIDs
 *         description: An array of project IDs to delete. Can optionally be an
 *                      array of objects containing id key/value pairs.
 *         in: body
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE projects, return deleted
 *                      projects' ids.
 *       400:
 *         description: Bad Request, Failed to DELETE project due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to DELETE project due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE project due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to DELETE org due to a
 *                      server side issue.
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
 * /api/orgs/{orgid}/projects/{projectid}:
 *   get:
 *     tags:
 *       - projects
 *     description: Finds and returns a projects public data if the user has
 *                  read permissions on that project.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization the project is a part of.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project to find.
 *         in: path
 *         required: true
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET project, returns project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET project due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET project due to not not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET project due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET project due to project with
 *                      specified id not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET project due to a
 *                      server side issue.
 *   post:
 *     tags:
 *       - projects
 *     description: Creates a new project from the given data in the request
 *                  body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the new project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: project
 *         description: The object containing the new project data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - name
 *           properties:
 *             id:
 *               type: string
 *               description: Must match the id in the request parameters.
 *             name:
 *               type: string
 *             custom:
 *               type: object
 *             visibility:
 *               type: string
 *               default: private
 *               enum: [internal, private]
 *             permissions:
 *               type: object
 *               description: Any preset permissions. Keys are the users
 *                            usernames, and values are the permission.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST project, return project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST project due to invalid
 *                      project data.
 *       401:
 *         description: Unauthorized, Failed to POST project due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST project due posting with an
 *                      already existing id.
 *       404:
 *         description: Not Found, Failed to POST project due to org not being
 *                      found.
 *       500:
 *         description: Internal Server Error, Failed to POST project due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - projects
 *     description: Updates an existing project. The following fields can be
 *                  updated [name, custom, archived, permissions]. Projects that
 *                  are currently archived must first be unarchived before
 *                  making any other updates.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project to update.
 *         in: path
 *         required: true
 *         type: string
 *       - name: update
 *         description: The object containing the updated project data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             custom:
 *               type: object
 *             archived:
 *               type: boolean
 *             permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH project, return updated project
 *                      public data.
 *       400:
 *         description: Bad Request, Failed to PATCH project due to invalid
 *                      update request data.
 *       401:
 *         description: Unauthorized, Failed to PATCH project due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH project due to updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH project due to not finding
 *                      project.
 *       500:
 *         description: Internal Server Error, Failed to PATCH project due to a
 *                      server side issue.
 *   delete:
 *     tags:
 *       - projects
 *     description: Deletes the specified project and any elements name-spaced
 *                  under the project. NOTE this endpoint is reserved for
 *                  system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the project
 *                      to be deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project to delete.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE project, return deleted project
 *                      ID.
 *       400:
 *         description: Bad Request, Failed to DELETE project due to invalid
 *                      project data.
 *       401:
 *         description: Unauthorized, Failed to DELETE project due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE project due to not having
 *                      permissions on org.
 *       404:
 *         description: Not Found, Failed to DELETE project due to not finding
 *                      project.
 *       500:
 *         description: Internal Server Error, Failed to DELETE project due to
 *                      server side issue.
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
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/elements:
 *   get:
 *     tags:
 *       - elements
 *     description: Returns an array of elements on a specified branch. By
 *                  default, returns all elements on the specified branch.
 *                  Optionally, an array of IDs can be provided in the request
 *                  body or a comma separated list in the request parameters to
 *                  find multiple, specific elements.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch containing the searched elements.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: An array of object IDs to search for. If both query
 *                      parameter and body are not provided, all objects the
 *                      user has access to (under the specified branch) are
 *                      found.
 *       - name: ids
 *         description: Comma separated list of IDs to search for. If both query
 *                      parameter and body are not provided, all objects the
 *                      user has access to (under the specified branch) are
 *                      found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: subtree
 *         description: If true, returns all searched elements as well as the
 *                      elements in the searched element's subtree.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET elements, returns elements public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET elements due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET elements due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET elements due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET elements due to a non-existent
 *                      org, project or branch.
 *       500:
 *         description: Internal Server Error, Failed to GET elements due to
 *                      server side issue.
 *   post:
 *     tags:
 *       - elements
 *     description: Creates multiple elements from the supplied data in the
 *                  request body. Returns the created element' public data.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch whose elements are being created.
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         in: body
 *         description: An array of objects containing new element data.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               parent:
 *                 type: string
 *                 default: 'model'
 *               source:
 *                 type: string
 *                 description: Required if target is provided.
 *               target:
 *                 type: string
 *                 description: Required if source is provided.
 *               documentation:
 *                 type: string
 *                 default: ''
 *                 description: An optional field to provided notes or
 *                              description about an element.
 *               type:
 *                 type: string
 *                 default: ''
 *               custom:
 *                 type: object
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST elements, return element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST elements due to invalid
 *                      element data.
 *       401:
 *         description: Unauthorized, Failed to POST elements due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST elements due to permissions
 *                      or already existing elements with matching ids.
 *       404:
 *         description: Not Found, Failed to GET branch, project or org.
 *       500:
 *         description: Internal Server Error, Failed to POST elements due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - elements
 *     description: Updates multiple elements from the data provided in the
 *                  request body. Elements that are currently archived must
 *                  first be unarchived before making any other updates. The
 *                  following fields can be updated [name, custom, archived,
 *                  parent, type, documentation]. NOTE, the id is required in
 *                  the request body, but CANNOT be updated.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch whose elements are to be updated.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         name: elements
 *         description: An array of objects containing updates to multiple
 *                      elements.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The current ID of the element, cannot be
 *                              updated.
 *               name:
 *                 type: string
 *               parent:
 *                 type: string
 *               documentation:
 *                 type: string
 *               type:
 *                 type: string
 *               custom:
 *                 type: object
 *               archived:
 *                 type: boolean
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH elements, returns element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PATCH elements due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to PATCH element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH elements due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to PATCH elements due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       - elements
 *     description: Deletes multiple elements. NOTE this endpoint can be used by
 *                  system-admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch whose elements are to be deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: elementIDs
 *         description: An array of element IDs to delete. Can optionally be an
 *                      array of objects containing id key/value pairs.
 *         in: body
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE elements, return deleted
 *                      elements' ids.
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
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid/elements')
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
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/elements/{elementid}:
 *   get:
 *     tags:
 *       - elements
 *     description: Returns an elements public data on a specified branch.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch containing the searched element.
 *         in: path
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to find.
 *         in: path
 *         required: true
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: subtree
 *         description: If true, returns all elements in the search elements
 *                      subtree. If true, returns an array of elements rather
 *                      than a single object.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET element, returns element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET element due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET element due to element not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET element due to
 *                      server side issue.
 *   post:
 *     tags:
 *       - elements
 *     description: Creates a new element from given data in the request body.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch containing the new element.
 *         in: path
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         description: The object containing the new element data.
 *         in: body
 *         required: false
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: The ID of the element. If provided, it must
 *                      match the element ID provided in the path.
 *             name:
 *               type: string
 *             parent:
 *               type: string
 *               default: 'model'
 *               description: The ID of the parent of the new element.
 *             source:
 *               type: string
 *               description: An optional field that stores the ID of a source
 *                            element. If provided, target is required.
 *             target:
 *               type: string
 *               description: An optional field that stores the ID of a target
 *                            element. If provided, source is required.
 *             documentation:
 *               type: string
 *               default: ''
 *               description: The documentation for the element.
 *             type:
 *               type: string
 *               default: ''
 *             custom:
 *               type: object
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST element, returns element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST element due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to POST element due to branch, project
 *                      or org not existing.
 *       500:
 *         description: Internal Server Error, Failed to POST element due to
 *                      server side issue.
 *   patch:
 *     tags:
 *       - elements
 *     description: Updates an existing element. The following fields can be
 *                  updated [name, custom, archived, parent, documentation,
 *                  type]. Elements that are currently archived must first be
 *                  unarchived before making any other updates.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch containing the element to be
 *                      updated.
 *         in: path
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to update.
 *         in: path
 *         required: true
 *         type: string
 *       - name: update
 *         description: The object containing the updated element data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             parent:
 *               type: string
 *             documentation:
 *               type: string
 *             type:
 *               type: string
 *             custom:
 *               type: object
 *             archived:
 *               type: boolean
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH element, returns element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PATCH element due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to PATCH element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH element due to updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH element due to element not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to PATCH element due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       -  elements
 *     description: Deletes the specified element and all elements in the
 *                  specified elements subtree. NOTE this endpoint is reserved
 *                  for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified branch.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch containing the element to be
 *                      deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to delete.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE element, returns deleted
 *                      element's id.
 *       400:
 *         description: Bad Request, Failed to DELETE element due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to DELETE element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE element due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to DELETE element due to element not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE element due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid')
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
 *     description: Returns an array of users. By default, returns all users.
 *                  Optionally, an array of usernames can be provided in the
 *                  request body or a comma separated list in the request
 *                  parameters to find multiple, specific users.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: An array of usernames to search for. If both query
 *                      parameter and body are not provided, all users are
 *                      found.
 *       - name: usernames
 *         description: Comma separated list of usernames to search for. If both
 *                      the query parameter and body are not provided, all
 *                      users are found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived users will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET users, returns user public data.
 *       400:
 *         description: Bad Request, Failed to GET users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET users due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET users due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET users due to users not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET users due to
 *                      server side issue.
 *   post:
 *     tags:
 *       - users
 *     description: Creates multiple users from the data provided in the request
 *                  body. Returns the created user's public data. NOTE This
 *                  endpoint is reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: users
 *         description: An array of objects containing new user data.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Required unless running LDAP auth.
 *               fname:
 *                 type: string
 *                 description: User's first name.
 *               lname:
 *                 type: string
 *                 description: User's last name.
 *               preferredName:
 *                 type: string
 *               email:
 *                 type: string
 *               provider:
 *                 type: string
 *                 default: 'local'
 *               admin:
 *                 type: boolean
 *                 description: If true, user is system-wide admin.
 *               custom:
 *                 type: object
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST users returns public users data.
 *       400:
 *         description: Bad Request, Failed to POST users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST users due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST users due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to POST users due to
 *                      server side issue.
 *   patch:
 *     tags:
 *       - users
 *     description: Updates multiple users from the data provided in the request
 *                  body. Users that are currently archived must first be
 *                  unarchived before making any other updates. The following
 *                  fields can be updated [custom, archived, fname, lname,
 *                  preferredName, email]. NOTE, the username is required in the
 *                  request body, but CANNOT be updated. This endpoint is
 *                  reserved for admins only, unless user is updating self.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: users
 *         description: An array of objects containing updates to multiple
 *                      users.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: The current username of the user, cannot be
 *                              updated.
 *               fname:
 *                 type: string
 *               lname:
 *                 type: string
 *               preferredName:
 *                 type: string
 *               email:
 *                 type: string
 *               custom:
 *                 type: object
 *               archived:
 *                 type: boolean
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH users, returns user's public
 *                      data.
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
 *     description: Deletes multiple users. Removes them from any orgs or
 *                  projects which they have permissions on. NOTE this endpoint
 *                  is reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: usernames
 *         description: An array of usernames to delete. Can optionally be an
 *                      array of objects containing id key/value pairs.
 *         in: body
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE users, return deleted user's
 *                      usernames.
 *       400:
 *         description: Bad Request, Failed to DELETE users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE users due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE users due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to DELETE users due to
 *                      server side issue.
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
 *     description: Returns the currently logged in user's public information.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET current user information returns
 *                      user public data.
 *       401:
 *         description: Unauthorized, Failed to GET user information due to not
 *                      being logged in.
 *       403:
 *         description: Forbidden, Failed to GET user information due to not
 *                      having permissions.
 *       404:
 *         description: Not Found, Failed to GET current user information due to
 *                      not finding user.
 *       500:
 *         description: Internal Server Error, Failed to GET user info due to
 *                      server side issue.
 */
api.route('/users/whoami')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.whoami
);

/**
 * @swagger
 * /api/users/{username}:
 *   get:
 *     tags:
 *       - users
 *     description: Finds and returns a users public data.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to find.
 *         required: true
 *         type: string
 *         in: path
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET user, returns user's public data.
 *       400:
 *         description: Bad Request, Failed to GET user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET user due to not being logged
 *                      in.
 *       403:
 *         description: Forbidden, Failed to GET user due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET user due to user not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET user due to server
 *                      side issue.
 *   post:
 *     tags:
 *       - users
 *     description: Create a new user from the given data in the request body.
 *                  This endpoint is reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to create.
 *         required: true
 *         type: string
 *         in: path
 *       - name: user
 *         description: The object containing the new user data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             username:
 *               type: string
 *               description: The username of the user to create. If provided,
 *                            this must match the username provided in the path.
 *             password:
 *               type: string
 *               description: The password of the user being created. This field
 *                            is required unless LDAP authentication is used.
 *             fname:
 *               type: string
 *             lname:
 *               type: string
 *             preferredName:
 *               type: string
 *             email:
 *               type: string
 *             provider:
 *               type: string
 *               default: 'local'
 *             admin:
 *               type: boolean
 *             custom:
 *               type: object
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST user, return user's public data.
 *       400:
 *         description: Bad Request, Failed to POST user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST user due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST user due to using username
 *                      that already exists.
 *       500:
 *         description: Internal Server Error, Failed to POST user due to server
 *                      side issue.
 *   patch:
 *     tags:
 *       - users
 *     description: Updates an existing user. The following fields can be
 *                  updated [fname, lname, preferredName, email, custom,
 *                  archived]. Users that are currently archived must first be
 *                  unarchived before making any other updates.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to update.
 *         required: true
 *         type: string
 *         in: path
 *       - name: update
 *         description: The object containing the updated user data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             fname:
 *               type: string
 *             lname:
 *               type: string
 *             preferredName:
 *               type: string
 *             email:
 *               type: string
 *             custom:
 *               type: object
 *             archived:
 *               type: boolean
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH user, return user's public data.
 *       400:
 *         description: Bad Request, Failed to PATCH user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH user due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH user due updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, Failed ot PATCH user due to user not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed ot PATCH user due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       - users
 *     description: Deletes the specified user. Removes them from any orgs or
 *                  projects which they have permissions on. NOTE this endpoint
 *                  is reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to delete.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE user, returns deleted user's
 *                      username.
 *       400:
 *         description: Bad Request, Failed to DELETE user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE user due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE user due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to DELETE user due to user not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE user due to
 *                      server side issues.
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

/**
 * @swagger
 * /api/users/{username}/password:
 *   patch:
 *     tags:
 *       - users
 *     description: Updates an existing users password. Users can only update
 *                  their own password.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to update.
 *         required: true
 *         type: string
 *         in: path
 *       - in: body
 *         description: The object containing the updated user data.
 *         name: passwordInfo
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - oldPassword
 *             - password
 *             - confirmPassword
 *           properties:
 *             oldPassword:
 *               type: string
 *               description: The user's old password.
 *             password:
 *               type: string
 *               description: The user's new password.
 *             confirmPassword:
 *               type: string
 *               description: The users new password a second time, to confirm
 *                            they match.
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH user returns public user data.
 *       400:
 *         description: Bad Request, Failed to PATCH user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PATCH user due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH user due updating an
 *                      immutable field.
 *       500:
 *         description: Internal Server Error, Failed to DELETE user due to
 *                      server side issues.
 */
api.route('/users/:username/password')
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.patchPassword
);

// Catches any invalid api route not defined above.
api.use('*', APIController.invalidRoute);

// Export the API router
module.exports = api;
