/**
 * @classification UNCLASSIFIED
 *
 * @module api-routes
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 * @author Josh Kaplan
 * @author Leah De Laurell
 * @author Connor Doyle
 * @author Jake Ursetta
 * @author Phillip Lee
 *
 * @description This file defines the MBEE API routes.
 *
 * Note: Routes that require authentication calls
 * "AuthController.authenticate()" as their first function.
 * This will authenticate the user and move to the next function.
 */

// NPM modules
const express = require('express');
const api = express.Router();

// MBEE modules
const APIController = M.require('controllers.api-controller');
const AuthController = M.require('lib.auth');
const Middleware = M.require('lib.middleware');
const logger = M.require('lib.logger');


/**
 * @swagger
 * /api/test:
 *   get:
 *     tags:
 *       - general
 *     description: Returns a 200 status. Used to test if the API is up and a
 *        connection can be established.
 *     responses:
 *       200:
 *         description: OK, the API is up.
 */
api.get('/test', Middleware.logRoute, APIController.test);
api.get(
  '/coffee',
  AuthController.authenticate,
  Middleware.logRoute,
  (req, res) => {
    const str = 'I\'m a teapot.';
    res.status(418).send(str);
    logger.logResponse(str.length, req, res);
  }
);


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
api.get('/doc/swagger.json',
  Middleware.logRoute,
  APIController.swaggerJSON);

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
 *                  read access to. Optionally, an array of IDs can be
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
 *         description: An array of org IDs to search for. If both query
 *                      parameter and body are not provided, all orgs the
 *                      user has read access to are found.
 *       - name: ids
 *         description: Comma separated list of IDs to search for. If both the
 *                      query parameter and body are not provided, all orgs
 *                      the user has read access to are found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.  Overridden by the archived search option
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: name
 *         description: Search for orgs with a specific name.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for orgs created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for orgs last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived orgs.  If false, only returns
 *                      unarchived orgs.  Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: Search for orgs archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello
 *         in: query
 *         type: string
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - organizations
 *     description: Creates or replaces multiple organizations from the data
 *                  provided in the request body. If the organization already
 *                  exists, it is replaced with the provided data. NOTE This
 *                  function is reserved for system-wide admins ONLY.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT orgs, returns orgs' public data.
 *       400:
 *         description: Bad Request, Failed to PUT orgs due to invalid field in
 *                      request body.
 *       401:
 *         description: Unauthorized, Failed to PUT orgs due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT orgs due to an invalid request
 *                      body.
 *       500:
 *         description: Internal Server Error, Failed to PUT orgs due to a
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
 *                 description: NOTE when updating the custom data, the object
 *                              is completely replaced.
 *               archived:
 *                 type: boolean
 *               permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *     description: Deletes multiple organizations and any projects, branches
 *                  or elements name-spaced under the specified orgs. NOTE
 *                  this endpoint can be used by system-admins ONLY.
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE orgs, returns deleted org's ids.
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
 *         description: Internal Server Error, Failed to DELETE org due to a
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.putOrgs
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
 *     description: Finds and returns an organization's public data if the user
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - organizations
 *     description: Creates or replaces an organization from the given data in
 *                  the request body. If the organization already exists it is
 *                  replaced, otherwise it is created. This endpoint is reserved
 *                  for system-admins ONLY.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT org, returns org public data.
 *       400:
 *         description: Bad Request, Failed to PUT org due to invalid field in
 *                      request data.
 *       401:
 *         description: Unauthorized, Failed to PUT org due to not being logged
 *                      in.
 *       403:
 *         description: Forbidden, Failed to PUT org due to an existing org with
 *                      same id.
 *       500:
 *         description: Internal Server Error, Failed to PUT org due to a server
 *                      side issue.
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
 *               description: NOTE when updating the custom data, the object
 *                            is completely replaced.
 *             archived:
 *               type: boolean
 *             permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      projects]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, permissions,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *     description: Deletes the specified organization and any projects, branches,
 *                  and elements name-spaced under the org. NOTE this endpoint is
 *                  reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization to delete.
 *         in: path
 *         required: true
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.putOrg
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
 *     description: Returns a list of all project's public data that the
 *                  requesting user has read access to.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: name
 *         description: Search for projects with a specific name.
 *         in: query
 *         type: string
 *       - name: visibility
 *         description: Search for projects with a specific level of visibility.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for projects created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for projects last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archivedBy
 *         description: Search for projects archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET projects, returns project's public
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
 *                  access to on a specified org. Optionally, an array of IDs
 *                  can be provided in the request body or a comma separated
 *                  list in the request parameters to find multiple, specific
 *                  projects.
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
 *         description: An array of project IDs to search for. If both query
 *                      parameter and body are not provided, all projects the
 *                      user has read access to (under the specified org) are
 *                      found.
 *       - name: ids
 *         description: Comma separated list of project IDs to search for. If
 *                      both query parameter and body are not provided, all
 *                      projects the user has read access to (under the
 *                      specified org) are found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through. Overridden by the archived search option.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: name
 *         description: Search for projects with a specific name.
 *         in: query
 *         type: string
 *       - name: visibility
 *         description: Search for projects with a specific level of visibility.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for projects created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for projects last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived projects.  If false, only returns
 *                      unarchived projects.  Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: Search for projects archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET projects, returns project's public
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
 *                  Requesting user must have at least write access on the
 *                  organization to create projects.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - projects
 *     description: Creates or replaces multiple projects from the supplied data
 *                  in the request body. If the project already exists, it will
 *                  be replaced along with the pre-set elements. Returns the
 *                  created projects' public data. NOTE this endpoint is
 *                  reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization whose projects to create or
 *                      replace.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projects
 *         in: body
 *         description: An array of objects containing project data.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT projects, returns project's public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PUT projects due to invalid
 *                      project data.
 *       401:
 *         description: Unauthorized, Failed to PUT projects due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT projects due to invalid
 *                      parameters.
 *       500:
 *         description: Internal Server Error, Failed to PUT projects due to a
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
 *                 description: NOTE when updating the custom data, the object
 *                              is completely replaced.
 *               archived:
 *                 type: boolean
 *               permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *     description: Deletes multiple projects, along with any branches or elements
 *                  name-spaced under the specified project. NOTE this endpoint
 *                  can be used be system-admins ONLY.
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *                      server side issue
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.putProjects
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
 *     description: Finds and returns a project's public data if the user has
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *                  body. Requesting user must have at least write access on the
 *                  organization to create a project.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - projects
 *     description: Creates or replaces a project from the given data in the
 *                  request body. If the project already exists, it will be
 *                  replaced. NOTE this function is reserved for system-wide
 *                  admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project to create/replace.
 *         in: path
 *         required: true
 *         type: string
 *       - name: project
 *         description: The object containing the project data.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT project, return project public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PUT project due to invalid
 *                      project data.
 *       401:
 *         description: Unauthorized, Failed to PUT project due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT project due to an invalid
 *                      parameter.
 *       404:
 *         description: Not Found, Failed to PUT project due to org not being
 *                      found.
 *       500:
 *         description: Internal Server Error, Failed to PUT project due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - projects
 *     description: Updates an existing project. The following fields can be
 *                  updated [name, custom, archived, permissions]. Projects that
 *                  are currently archived must first be unarchived before
 *                  making any other updates. Requesting user must be a project
 *                  admin to update the project.
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
 *               description: NOTE when updating the custom data, the object
 *                            is completely replaced.
 *             archived:
 *               type: boolean
 *             permissions:
 *                 type: object
 *                 description: An object where keys are usernames and values
 *                              are the new role the user has. To remove a user,
 *                              the role should be REMOVE_ALL.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      org]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, name, org,
 *                      permissions, updatedOn, visibility]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *     description: Deletes the specified project, alone with any branches or
 *                  elements name-spaced under the project. NOTE this endpoint
 *                  is reserved for system-wide admins ONLY.
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.putProject
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
 * /api/orgs/{orgid}/projects/{projectid}/branches:
 *   get:
 *     tags:
 *       - branches
 *     description: Returns an array of branches, if the requesting user has read
 *                  access on the specified project. Optionally, an array of IDs
 *                  can be provided in the request body or a comma separated
 *                  list in the request parameters to find multiple, specific
 *                  branches.
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
 *         description: The ID of the project which contains the searched
 *                      branches.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         schema:
 *           type: array
 *           items:
 *            type: string
 *         description: An array of branch IDs to search for. If both query
 *                      parameter and body are not provided, all branches the
 *                      user has read access to (under the specified project) are
 *                      found.
 *       - name: ids
 *         description: Comma separated list of branch IDs to search for. If
 *                      both query parameter and body are not provided, all
 *                      branches the user has read access to (under the
 *                      specified project) are found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, source]
 *         in: query
 *         type: string
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through. Overridden by the archived search option
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, updatedOn, name, org,
 *                      project, source, tag]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: tag
 *         description: Search for branches with a specific tag value.
 *         in: query
 *         type: boolean
 *       - name: source
 *         description: Search for branches with a specific source branch.
 *         in: query
 *         type: string
 *       - name: name
 *         description: Search for branches with a specific name.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for branches created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for branches last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived branches.  If false, only returns
 *                      unarchived branches.  Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: Search for branches archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET branches, returns branches' public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET branches due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET branches due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET branches due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET branches due to branches not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET branches due to a
 *                      server side issue.
 *   post:
 *     tags:
 *       - branches
 *     description: Creates multiple branches from the supplied data in the
 *                  request body. Returns the created branches' public data.
 *                  Requesting user must have at least write access on the
 *                  project to create branches.
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
 *         description: The ID of the projects containing the branches to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branches
 *         in: body
 *         description: An array of objects containing new branch data.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - source
 *             properties:
 *               id:
 *                 type: string
 *                 required: true
 *               name:
 *                 type: string
 *               source:
 *                 type: string
 *                 required: true
 *                 default: null
 *                 description: NOTE The source field needs to be the same
 *                              branch with every branch being created.
 *               tag:
 *                 type: boolean
 *                 default: false
 *                 description: This field defines if a branch is actually a tag.
 *                              A tag can not be updated, nor can the branch
 *                              add, update, or delete elements.
 *               custom:
 *                 type: object
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, source]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, updatedOn, name, org,
 *                      project, source, tag]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST branches, returns branch public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST branches due to invalid
 *                      branch data.
 *       401:
 *         description: Unauthorized, Failed to POST branches due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST branches due to branch ids
 *                      already existing.
 *       500:
 *         description: Internal Server Error, Failed to POST branches due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - branches
 *     description: Updates multiple branches from the data provided in the
 *                  request body. Branches that are currently archived must
 *                  first be unarchived before making any other updates. The
 *                  following fields can be updated [name, custom, archived].
 *                  NOTE, the id is required in the request body,
 *                  but CANNOT be updated.
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
 *         description: The ID of the project containing the branches to update.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         name: branches
 *         description: An array of objects containing updates to multiple
 *                      branches.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The current ID of the branch, cannot be
 *                              updated.
 *               name:
 *                 type: string
 *               archived:
 *                 type: boolean
 *               custom:
 *                 type: object
 *                 description: NOTE when updating the custom data, the object
 *                              is completely replaced.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, source]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, updatedOn, name,
 *                      org, project, tag, source]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH branches, returns branches' public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PATCH branches due to invalid
 *                      request data.
 *       401:
 *         description: Unauthorized, Failed to PATCH branches due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH branches due to updating an
 *                      immutable field.
 *       500:
 *         description: Internal Server Error, Failed to PATCH branches due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       - branches
 *     description: Deletes multiple branches and any elements name-spaced under
 *                  the specified branch.
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
 *         description: The ID of the project containing the branches to be
 *                      deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchIDs
 *         description: An array of branch IDs to delete. Can optionally be an
 *                      array of objects containing id key/value pairs.
 *         in: body
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE branches, return deleted
 *                      branches' ids.
 *       400:
 *         description: Bad Request, Failed to DELETE branches due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to DELETE branches due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE branches due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to DELETE branches due to a
 *                      server side issue
 */
api.route('/orgs/:orgid/projects/:projectid/branches')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getBranches
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postBranches
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchBranches
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteBranches
);

/**
 * @swagger
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}:
 *   get:
 *     tags:
 *       - branches
 *     description: Finds and returns a branch's public data if the user has
 *                  read permissions on specified project.
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
 *         description: The ID of the branch to find.
 *         in: path
 *         required: true
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, source]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, updatedOn, name,
 *                      org, source, project]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET branch, returns branch public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET branch due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET branch due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET branch due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET branch due to branch with
 *                      specified id not existing.
 *       500:
 *         description: Internal Server Error, Failed to GET branch due to a
 *                      server side issue.
 *   post:
 *     tags:
 *       - branches
 *     description: Creates a new branch from the given data in the request
 *                  body. Requesting user must have at least write access on the
 *                  project to create a branch.
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
 *         description: The ID of the project containing the new branch to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branch
 *         description: The object containing the new branch data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - source
 *           properties:
 *             id:
 *               type: string
 *               description: Must match the id in the request parameters.
 *             name:
 *               type: string
 *             tag:
 *               type: boolean
 *               default: false
 *               description: This will define if the branch is actually a tag
 *                            A tag can not be updated, nor can it create, update,
 *                            or delete elements on the tag.
 *             source:
 *               type: string
 *               required: true
 *               default: null
 *               description: This is a require field so the branch can clone
 *                            the elements from the correct branch.
 *             custom:
 *               type: object
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, source]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, updatedOn, name,
 *                       org, project, tag, source
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST branch, return branch public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST branch due to invalid
 *                      branch data.
 *       401:
 *         description: Unauthorized, Failed to POST branch due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST branch due to posting with an
 *                      already existing id.
 *       404:
 *         description: Not Found, Failed to POST branch due to project not being
 *                      found.
 *       500:
 *         description: Internal Server Error, Failed to POST branch due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - branches
 *     description: Updates an existing branch. The following fields can be
 *                  updated [name, custom, archived]. Branches that
 *                  are currently archived must first be unarchived before
 *                  making any other updates. Requesting user must have project
 *                  write permissions to update the branch.
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
 *         description: The ID of the project containing the branch to be updated.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch to update.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branch
 *         description: The object containing the updated branch data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             archived:
 *               type: boolean
 *             custom:
 *               type: object
 *               description: NOTE when updating the custom data, the object
 *                            is completely replaced.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, source]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, updatedOn, name,
 *                      org, source, project, tag]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH branch, return updated branch
 *                      public data.
 *       400:
 *         description: Bad Request, Failed to PATCH branch due to invalid
 *                      update request data.
 *       401:
 *         description: Unauthorized, Failed to PATCH branch due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH branch due to updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH branch due to not finding
 *                      branch.
 *       500:
 *         description: Internal Server Error, Failed to PATCH branch due to a
 *                      server side issue.
 *   delete:
 *     tags:
 *       - branches
 *     description: Deletes the specified branch and any elements name-spaced
 *                  under the branch.
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
 *         description: The ID of the project containing the branch to
 *                      be deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: branchid
 *         description: The ID of the branch to delete.
 *         in: path
 *         required: true
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE branch, return deleted branch
 *                      ID.
 *       400:
 *         description: Bad Request, Failed to DELETE branch due to invalid
 *                      branch data.
 *       401:
 *         description: Unauthorized, Failed to DELETE branch due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE branch due to not having
 *                      permissions on project.
 *       404:
 *         description: Not Found, Failed to DELETE branch due to not finding
 *                      branch.
 *       500:
 *         description: Internal Server Error, Failed to DELETE branch due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getBranch
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postBranch
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchBranch
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteBranch
);

/**
 * @swagger
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/elements/search:
 *   get:
 *     tags:
 *       - elements
 *     description: Finds multiple elements using text based search on the
 *                  documentation and name fields. Allows for exact searches by
 *                  quoting the desired string "exact search", or the ability to
 *                  not include a word in a search by using a dash -not. Returns
 *                  the elements public data.
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
 *       - name: q
 *         description: The desired text to be searched for.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through. Overridden by the archived search option
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: parent
 *         description: Search for elements with a specific parent.
 *         in: query
 *         type: string
 *       - name: source
 *         description: Search for elements with a specific source.
 *         in: query
 *         type: string
 *       - name: target
 *         description: Search for elements with a specific target.
 *         in: query
 *         type: string
 *       - name: type
 *         description: Search for elements with a specific type.
 *         in: query
 *         type: string
 *       - name: name
 *         description: Search for elements with a specific name.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for elements created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for elements last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived elements.  If false, only returns
 *                      unarchived elements.  Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: Search for elements archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello.
 *         in: query
 *         type: string
 *       - name: artifact
 *         description: Search for elements which reference a specific artifact.
 *         in: query
 *         type: string
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
 */
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid/elements/search')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.searchElements
);


/**
 * @swagger
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/elements:
 *   get:
 *     tags:
 *       - elements
 *     description: Returns an array of elements on a specified branch if the
 *                  requesting user has read access on the project. Optionally,
 *                  an array of IDs can be provided in the request body or a
 *                  comma separated list in the request parameters to find
 *                  multiple, specific elements.
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
 *         description: An array of element IDs to search for. If both query
 *                      parameter and body are not provided, all elements the
 *                      user has access to (under the specified branch) are
 *                      found.
 *       - name: ids
 *         description: Comma separated list of IDs to search for. If both query
 *                      parameter and body are not provided, all elements the
 *                      user has access to (under the specified branch) are
 *                      found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through. Overridden by the archived search option
 *         in: query
 *         type: boolean
 *       - name: subtree
 *         description: If true, returns all searched elements as well as the
 *                      elements in the found element's subtrees.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, aritfact]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: format
 *         description: The desired format of the response. If jmi1, the
 *                      elements are returned in an array of element objects. If
 *                      jmi2, an object is returned where keys are the element
 *                      ids, and values are the element object. If jmi3, an
 *                      object is returned in a tree-like structure.
 *         in: query
 *         type: string
 *         default: jmi1
 *         enum: [jmi1, jmi2, jmi3]
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: parent
 *         description: Search for elements with a specific parent.
 *         in: query
 *         type: string
 *       - name: source
 *         description: Search for elements with a specific source.
 *         in: query
 *         type: string
 *       - name: target
 *         description: Search for elements with a specific target.
 *         in: query
 *         type: string
 *       - name: type
 *         description: Search for elements with a specific type.
 *         in: query
 *         type: string
 *       - name: name
 *         description: Search for elements with a specific name.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for elements created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for elements last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived elements. If false, only returns
 *                      unarchived elements. Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: Search for elements archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello
 *         in: query
 *         type: string
 *       - name: artifact
 *         description: Search for elements which reference a specific artifact.
 *         in: query
 *         type: string
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
 *                  Requesting user must have write permissions on the project
 *                  to create elements.
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
 *               sourceNamespace:
 *                 type: object
 *                 description: An optional field to specify the namespace of
 *                              the source element. The source's project must
 *                              be in the same organization or the default org.
 *                 properties:
 *                   org:
 *                     type: string
 *                   project:
 *                     type: string
 *                   branch:
 *                     type: string
 *               target:
 *                 type: string
 *                 description: Required if source is provided.
 *               targetNamespace:
 *                 type: object
 *                 description: An optional field to specify the namespace of
 *                              the target element. The targets's project must
 *                              be in the same organization or the default org.
 *                 properties:
 *                   org:
 *                     type: string
 *                   project:
 *                     type: string
 *                   branch:
 *                     type: string
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
 *               artifact:
 *                 type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *         description: Not Found, Failed to POST elements due to org, project,
 *                      or branch not existing.
 *       500:
 *         description: Internal Server Error, Failed to POST elements due to a
 *                      server side issue.
 *   put:
 *     tags:
 *       - elements
 *     description: Creates or replaces multiple elements from the supplied data
 *                  in the request body. In an element with a matching ID
 *                  already exists, it is replaced. Returns the element's public
 *                  data. NOTE this route is reserved for system-wide admins
 *                  ONLY.
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
 *         description: The ID of the branch whose elements are being
 *                      created/replaced.
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         in: body
 *         description: An array of objects containing element data.
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
 *               sourceNamespace:
 *                 type: object
 *                 description: An optional field to specify the namespace of
 *                              the source element. The source's project must
 *                              be in the same organization or the default org.
 *                 properties:
 *                   org:
 *                     type: string
 *                   project:
 *                     type: string
 *                   branch:
 *                     type: string
 *               target:
 *                 type: string
 *                 description: Required if source is provided.
 *               targetNamespace:
 *                 type: object
 *                 description: An optional field to specify the namespace of
 *                              the target element. The targets's project must
 *                              be in the same organization or the default org.
 *                 properties:
 *                   org:
 *                     type: string
 *                   project:
 *                     type: string
 *                   branch:
 *                     type: string
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
 *               artifact:
 *                 type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT elements, return element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PUT elements due to invalid
 *                      element data.
 *       401:
 *         description: Unauthorized, Failed to PUT elements due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT elements due to invalid
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to PUT elements because branch,
 *                      project or org did not exist.
 *       500:
 *         description: Internal Server Error, Failed to PUT elements due to a
 *                      server side issue.
 *   patch:
 *     tags:
 *       - elements
 *     description: Updates multiple elements from the data provided in the
 *                  request body. Elements that are currently archived must
 *                  first be unarchived before making any other updates. The
 *                  following fields can be updated [name, custom, archived,
 *                  parent, type, documentation]. NOTE, the id is required in
 *                  the request body, but CANNOT be updated. Requesting user
 *                  must have write permissions on the project to update
 *                  elements.
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
 *               source:
 *                 type: string
 *               sourceNamespace:
 *                 type: object
 *                 description: An optional field to specify the namespace of
 *                              the source element. The source's project must
 *                              be in the same organization or the default org.
 *                 properties:
 *                   org:
 *                     type: string
 *                   project:
 *                     type: string
 *                   branch:
 *                     type: string
 *               target:
 *                 type: string
 *               targetNamespace:
 *                 type: object
 *                 description: An optional field to specify the namespace of
 *                              the target element. The target's project must
 *                              be in the same organization or the default org.
 *                 properties:
 *                   org:
 *                     type: string
 *                   project:
 *                     type: string
 *                   branch:
 *                     type: string
 *               documentation:
 *                 type: string
 *               type:
 *                 type: string
 *               custom:
 *                 type: object
 *                 description: NOTE when updating the custom data, the object
 *                              is completely replaced.
 *               archived:
 *                 type: boolean
 *               artifact:
 *                 type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *     description: Deletes multiple elements and all elements in their
 *                  subtrees.
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.putElements
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
 *                  Requesting user must have read access on the project to find
 *                  elements.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
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
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: rootpath
 *         description: An option to specify finding the parent, grandparent, etc
 *                      of the query element all the way up to the root element.
 *         in: query
 *         type: boolean
 *         default: false
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
 *                  Requesting user must have at least write access on the
 *                  project to create an element.
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
 *             sourceNamespace:
 *               type: object
 *               description: An optional field to specify the namespace of
 *                            the source element. The source's project must
 *                            be in the same organization or the default org.
 *               properties:
 *                 org:
 *                   type: string
 *                 project:
 *                   type: string
 *                 branch:
 *                   type: string
 *             target:
 *               type: string
 *               description: An optional field that stores the ID of a target
 *                            element. If provided, source is required.
 *             targetNamespace:
 *               type: object
 *               description: An optional field to specify the namespace of
 *                            the target element. The target's project must
 *                            be in the same organization or the default org.
 *               properties:
 *                 org:
 *                   type: string
 *                 project:
 *                   type: string
 *                 branch:
 *                   type: string
 *             documentation:
 *               type: string
 *               default: ''
 *               description: The documentation for the element.
 *             type:
 *               type: string
 *               default: ''
 *             custom:
 *               type: object
 *             artifact:
 *               type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - elements
 *     description: Creates or replaces an element from given data in the
 *                  request body. If an element with the same ID already exists,
 *                  it will be replaced. NOTE this route is reserved for system
 *                  admins ONLY.
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
 *         description: The ID of the branch containing the element.
 *         in: path
 *         required: true
 *         type: string
 *       - name: elementid
 *         description: The ID of the element to create/replace.
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         description: The object containing the element data.
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
 *               description: The ID of the parent element.
 *             source:
 *               type: string
 *               description: An optional field that stores the ID of a source
 *                            element. If provided, target is required.
 *             sourceNamespace:
 *               type: object
 *               description: An optional field to specify the namespace of
 *                            the source element. The source's project must
 *                            be in the same organization or the default org.
 *               properties:
 *                 org:
 *                   type: string
 *                 project:
 *                   type: string
 *                 branch:
 *                   type: string
 *             target:
 *               type: string
 *               description: An optional field that stores the ID of a target
 *                            element. If provided, source is required.
 *             targetNamespace:
 *               type: object
 *               description: An optional field to specify the namespace of
 *                            the target element. The target's project must
 *                            be in the same organization or the default org.
 *               properties:
 *                 org:
 *                   type: string
 *                 project:
 *                   type: string
 *                 branch:
 *                   type: string
 *             documentation:
 *               type: string
 *               default: ''
 *               description: The documentation for the element.
 *             type:
 *               type: string
 *               default: ''
 *             custom:
 *               type: object
 *             artifact:
 *               type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT element, returns element public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PUT element due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PUT element due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT element due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to PUT element due to branch, project
 *                      or org not existing.
 *       500:
 *         description: Internal Server Error, Failed to PUT element due to
 *                      server side issue.
 *   patch:
 *     tags:
 *       - elements
 *     description: Updates an existing element. The following fields can be
 *                  updated [name, custom, archived, parent, documentation,
 *                  type]. Elements that are currently archived must first be
 *                  unarchived before making any other updates. Requesting user
 *                  must have at least write access on the project to update an
 *                  element.
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
 *             source:
 *               type: string
 *             sourceNamespace:
 *               type: object
 *               description: An optional field to specify the namespace of
 *                            the source element. The source's project must
 *                            be in the same organization or the default org.
 *               properties:
 *                 org:
 *                   type: string
 *                 project:
 *                   type: string
 *                 branch:
 *                   type: string
 *             target:
 *               type: string
 *             targetNamespace:
 *               type: object
 *               description: An optional field to specify the namespace of
 *                            the target element. The target's project must
 *                            be in the same organization or the default org.
 *               properties:
 *                 org:
 *                   type: string
 *                 project:
 *                   type: string
 *                 branch:
 *                   type: string
 *             documentation:
 *               type: string
 *             type:
 *               type: string
 *             custom:
 *               type: object
 *               description: NOTE when updating the custom data, the object
 *                            is completely replaced.
 *             archived:
 *               type: boolean
 *             artifact:
 *               type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      parent, source, target, project, branch, sourceOf,
 *                      targetOf, contains, artifact]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, documentation, lastModifiedBy, name,
 *                      org, parent, project, source, target, type, updatedOn,
 *                      branch, artifact]
 *
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *                  specified element's subtree.
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.putElement
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
 * /api/orgs/{orgid}/projects/{projectid}/artifacts/blob:
 *   get:
 *     tags:
 *       - artifacts
 *     description: Returns an artifact Blob. Requesting user must have read access
 *                  on the project to find an artifact.
 *     produces:
 *       - application/octet-stream
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the artifact blob.
 *         in: path
 *         required: true
 *         type: string
 *       - name: filename
 *         in: query
 *         description: Artifact filename.
 *         required: true
 *         type: string
 *       - name: location
 *         in: query
 *         description: Artifact Blob storage location.
 *         required: true
 *         type: string
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET artifact, returns artifact blob.
 *       400:
 *         description: Bad Request, Failed to GET artifact due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET artifact due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET artifact due to
 *                      server side issue.
 *
 *   post:
 *     tags:
 *       - artifacts
 *     description: Post an artifact Blob. Requesting user must have write
 *                  access on the project to post an artifact.
 *     produces:
 *       - application/json
 *     consumes: multipart/form-data
 *     parameters:
 *       - name: orgid
 *         description: The ID of the organization containing the specified
 *                      project.
 *         in: path
 *         required: true
 *         type: string
 *       - name: projectid
 *         description: The ID of the project containing the specified artifact.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The artifact ID.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: file
 *         in: formData
 *         description: File blob to upload.
 *         required: true
 *         type: file
 *       - name: filename
 *         in: formData
 *         description: Artifact filename.
 *         required: true
 *         type: string
 *       - name: location
 *         in: formData
 *         description: Artifact Blob storage location.
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST artifact, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST artifact due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to POST artifact due to branch, project
 *                      or org not existing
 *       500:
 *         description: Internal Server Error, Failed to POST artifact due to
 *                      server side issue.
 *
 *   delete:
 *     tags:
 *       - artifacts
 *     description: Deletes an artifact Blob. Requesting user must have read access
 *                  on the project to delete an artifact.
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
 *         description: The ID of the project containing the specified artifact.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The artifact ID.
 *         in: URI
 *         required: true
 *         type: string
 *       - name: filename
 *         in: query
 *         description: Artifact filename.
 *         required: true
 *         type: string
 *       - name: location
 *         in: query
 *         description: Artifact Blob storage location.
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE artifact, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to DELETE artifact due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to DELETE artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to DELETE artifact due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE artifact due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/artifacts/blob')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getBlob
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postBlob
).delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteBlob
);


/**
 * @swagger
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/artifacts:
 *   get:
 *     tags:
 *       - artifacts
 *     description: Returns an array of artifacts public data on a specified branch.
 *                  Requesting user must have read access on the project to find
 *                  artifacts.
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
 *         description: The ID of the branch containing the searched artifacts.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: An array of artifact IDs to search for. If both query
 *                      parameter and body are not provided, all artifacts the
 *                      user has access to (under the specified branch) are
 *                      found.
 *       - name: ids
 *         description: Comma separated list of IDs to search for. If both query
 *                      parameter and body are not provided, all artifacts the
 *                      user has access to (under the specified branch) are
 *                      found.
 *         in: query
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, branch]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through. Overridden by the archived search option
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, description, org,
 *                      project, updatedOn, branch, filename, location, strategy,
 *                      size]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: format
 *         description: The desired format of the response. If jmi1, the
 *                      artifacts are returned in an array of artifact objects. If
 *                      jmi2, an object is returned where keys are the artifact
 *                      ids, and values are the artifact object.
 *         in: query
 *         type: string
 *         default: jmi1
 *         enum: [jmi1, jmi2]
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: description
 *         description: Search for artifacts with a specific description.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: Search for artifacts created by a specific user.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: Search for artifacts last modified by a specific user.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived artifacts. If false, only returns
 *                      unarchived artifacts. Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: Search for artifacts archived by a specific user.
 *         in: query
 *         type: string
 *       - name: custom
 *         description: Search for a specific key/value pair in the custom data.
 *                      To find a specific key, separate the keys using dot
 *                      notation. For example, custom.hello
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET artifacts, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET artifacts due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET artifacts due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET artifacts due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET artifacts due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET artifacts due to
 *                      server side issue.
 *
 *   post:
 *     tags:
 *       - artifacts
 *     description: Creates multiple artifacts from given data in request body.
 *                  Requesting user must have at least write access on the
 *                  project to create an artifact.
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
 *         description: The ID of the branch containing the new artifacts.
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         description: An array of objects containing new artifact data.
 *         in: body
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *               - location
 *               - filename
 *             properties:
 *               id:
 *                 type: string
 *                 description: The ID of the artifact.
 *               description:
 *                 type: string
 *               filename:
 *                 type: string
 *                 description: Blob file name associated with this artifact.
 *               location:
 *                 type: string
 *                 description: Blob storage location.
 *               custom:
 *                 type: object
 *               size:
 *                 type: number
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, description, org,
 *                      project, updatedOn, branch, filename, location, strategy,
 *                      size]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST artifacts, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST artifacts due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST artifacts due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST artifacts due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to POST artifacts due to branch, project
 *                      or org not existing.
 *       500:
 *         description: Internal Server Error, Failed to POST artifacts due to
 *                      server side issue.
 *   patch:
 *     tags:
 *       - artifacts
 *     description: Updates multiple artifacts. Artifacts that are currently
 *                  archived must first be unarchived before making any other
 *                  updates. Requesting user must have at least write access
 *                  on the project to update an artifact.
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
 *         description: The ID of the branch containing the artifacts to be
 *                      updated.
 *         in: path
 *         required: true
 *         type: string
 *       - in: body
 *         name: artifacts
 *         description: An array of objects containing updates to multiple
 *                      artifacts.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The current ID of the artifact, cannot be updated.
 *               description:
 *                 type: string
 *                 description: Description of Artifact.
 *               filename:
 *                 type: string
 *                 description: Filename of Artifact.
 *               location:
 *                 type: string
 *                 description: Storage location of Artifact.
 *               custom:
 *                 type: object
 *                 description: NOTE when updating the custom data, the object
 *                              is completely replaced.
 *               size:
 *                 type: number
 *               archived:
 *                 type: boolean
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, description, org,
 *                      project, updatedOn, branch, filename, location, strategy,
 *                      size]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH artifacts, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PATCH artifacts due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to PATCH artifacts due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH artifacts due to updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH artifacts due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to PATCH artifacts due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       -  artifacts
 *     description: Deletes multiple artifacts.
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
 *         description: The ID of the branch containing the artifacts to be
 *                      deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactIDs
 *         description: An array of artifact IDs to delete. Can optionally be an
 *                      array of objects containing id key/value pairs.
 *         in: body
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE artifacts, returns deleted
 *                      artifact's id.
 *       400:
 *         description: Bad Request, Failed to DELETE artifacts due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to DELETE artifacts due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE artifacts due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to DELETE artifacts due to artifacts not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE artifacts due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getArtifacts
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postArtifacts
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchArtifacts
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteArtifacts
);

/**
 * @swagger
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/artifacts/{artifactid}:
 *   get:
 *     tags:
 *       - artifacts
 *     description: Returns an artifact public data on a specified branch.
 *                  Requesting user must have read access on the project to find
 *                  an artifact.
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
 *         description: The ID of the branch containing the searched artifact.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The artifact ID.
 *         in: path
 *         required: true
 *         type: string
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy,
 *                      project, branch]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, description, org, project,
 *                      updatedOn, branch, filename, location, strategy, size]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET artifact, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET artifact due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET artifact due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET artifact due to
 *                      server side issue.
 *
 *   post:
 *     tags:
 *       - artifacts
 *     description: Creates a new artifact from given data in form data body.
 *                  Requesting user must have at least write access on the
 *                  project to create an artifact.
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
 *         description: The ID of the branch containing the new artifact.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The ID of the artifact to create.
 *         in: path
 *         required: true
 *         type: string
 *       - name: body
 *         description: The object containing the new artifact data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: The ID of the artifact. If provided, it must
 *                      match the artifact ID provided in the path.
 *             description:
 *               type: string
 *             filename:
 *               type: string
 *               description: Blob file name associated with this artifact.
 *             location:
 *               type: string
 *               description: Blob storage location.
 *             custom:
 *               type: object
 *             size:
 *               type: number
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, description, org,
 *                      project, updatedOn, branch, filename, location, strategy,
 *                      size]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to POST artifact, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to POST artifact due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to POST artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to POST artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to POST artifact due to branch, project
 *                      or org not existing.
 *       500:
 *         description: Internal Server Error, Failed to POST artifact due to
 *                      server side issue.
 *   patch:
 *     tags:
 *       - artifacts
 *     description: Updates an existing artifact. Artifacts that are currently
 *                  archived must first be unarchived before making any other
 *                  updates. Requesting user must have at least write access
 *                  on the project to update an artifact.
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
 *         description: The ID of the branch containing the artifact to be
 *                      updated.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The ID of the artifact to update.
 *         in: path
 *         required: true
 *         type: string
 *       - name: update
 *         description: The object containing the updated artifact data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             description:
 *               type: string
 *               description: Description of Artifact.
 *             filename:
 *               type: string
 *               description: Filename of Artifact.
 *             location:
 *               type: string
 *               description: Storage location of Artifact.
 *             custom:
 *               type: object
 *               description: NOTE when updating the custom data, the object
 *                            is completely replaced.
 *             size:
 *               type: number
 *             archived:
 *               type: boolean
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object.
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the id field is returned. To specifically NOT
 *                      include a field, include a '-' in front of the field
 *                      (-name). [archived, archivedBy, archivedOn, createdBy,
 *                      createdOn, custom, lastModifiedBy, description, org,
 *                      project, updatedOn, branch, filename, location, strategy,
 *                      size]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PATCH artifact, returns artifact public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to PATCH artifact due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to PATCH artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PATCH artifact due to updating an
 *                      immutable field.
 *       404:
 *         description: Not Found, Failed to PATCH artifact due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to PATCH artifact due to
 *                      server side issue.
 *   delete:
 *     tags:
 *       -  artifacts
 *     description: Deletes the specified artifact.
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
 *         description: The ID of the branch containing the artifact to be
 *                      deleted.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The ID of the artifact to delete.
 *         in: path
 *         required: true
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to DELETE artifact, returns deleted
 *                      artifact's id.
 *       400:
 *         description: Bad Request, Failed to DELETE artifact due to invalid
 *                      data.
 *       401:
 *         description: Unauthorized, Failed to DELETE artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to DELETE artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to DELETE artifact due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to DELETE artifact due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getArtifact
)
.post(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.postArtifact
)
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.patchArtifact
)
.delete(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.deleteArtifact
);

/**
 * @swagger
 * /api/orgs/{orgid}/projects/{projectid}/branches/{branchid}/artifacts/{artifactid}/blob:
 *   get:
 *     tags:
 *       - artifacts
 *     description: Returns an artifact Blob via artifact ID. Requesting user must have
 *                  read access on the project to find an artifact.
 *     produces:
 *       - application/octet-stream
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
 *         description: The ID of the branch containing the searched artifact.
 *         in: path
 *         required: true
 *         type: string
 *       - name: artifactid
 *         description: The artifact ID.
 *         in: path
 *         required: true
 *         type: string
 *       - name: includeArchived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET artifact, returns artifact blob.
 *       400:
 *         description: Bad Request, Failed to GET artifact due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET artifact due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to GET artifact due to not having
 *                      permissions.
 *       404:
 *         description: Not Found, Failed to GET artifact due to artifact not
 *                      existing.
 *       500:
 *         description: Internal Server Error, Failed to GET artifact due to
 *                      server side issue.
 */
api.route('/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid/blob')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.getBlobById
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - users
 *     description: Returns an array of users. Optionally, an array of usernames
 *                  can be provided in the request body or a comma separated
 *                  list in the request parameters to find multiple, specific
 *                  users.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: includeArchived
 *         description: If true, archived users will be also be searched
 *                      through. Overridden by the archived search option
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: fname
 *         description: A search parameter that will attempt to find matches with
 *                      the user's first name, or fname field.
 *         in: query
 *         type: string
 *       - name: lname
 *         description: A search parameter that will attempt to find matches with
 *                      the user's last name, or lname field.
 *         in: query
 *         type: string
 *       - name: preferredName
 *         description: A search parameter that will attempt to find matches with
 *                      the user's preferredName field.
 *         in: query
 *         type: string
 *       - name: email
 *         description: A search parameter that will attempt to find matches with
 *                      the user's email field.
 *         in: query
 *         type: string
 *       - name: createdBy
 *         description: A search parameter that will attempt to find users that
 *                      were created by a specific person.
 *         in: query
 *         type: string
 *       - name: lastModifiedBy
 *         description: A search parameter that will attempt to find users that
 *                      were last modified by a specific person.
 *         in: query
 *         type: string
 *       - name: archived
 *         description: Search only for archived users.  If false, only returns
 *                      unarchived users.  Overrides the includeArchived option.
 *         in: query
 *         type: boolean
 *       - name: archivedBy
 *         description: A search parameter that will attempt to find users that
 *                      were archived by a specific person.
 *         in: query
 *         type: string
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
 *                 description: Required unless running LDAP auth or some custom
 *                              authentication strategy which does not store
 *                              passwords.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - users
 *     description: Creates or replaces multiple users from the data provided in
 *                  the request body. Returns the user's public data. NOTE This
 *                  endpoint is reserved for system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: users
 *         description: An array of objects containing user data.
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
 *                 description: Required unless running LDAP auth or some custom
 *                              authentication strategy which does not store
 *                              passwords.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT users returns public users data.
 *       400:
 *         description: Bad Request, Failed to PUT users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PUT users due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT users due to not having
 *                      permissions.
 *       500:
 *         description: Internal Server Error, Failed to PUT users due to
 *                      server side issue.
 *   patch:
 *     tags:
 *       - users
 *     description: Updates multiple users from the data provided in the request
 *                  body. Users that are currently archived must first be
 *                  unarchived before making any other updates. The following
 *                  fields can be updated [custom, archived, fname, lname,
 *                  preferredName, email, admin]. NOTE, the username is required
 *                  in the request body, but CANNOT be updated. This endpoint is
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
 *                 description: NOTE when updating the custom data, the object
 *                              is completely replaced.
 *               archived:
 *                 type: boolean
 *               admin:
 *                 type: boolean
 *                 description: NOTE only current system-wide admins can update
 *                              this field.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.putUsers
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
 *     parameters:
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 * /api/users/search:
 *   get:
 *     tags:
 *       - users
 *     description: Finds multiple users using text based search on the fname,
 *                  lname, and preferredName fields. Allows for exact searches by
 *                  quoting the desired string "exact search", or the ability to
 *                  not include a word in a search by using a dash -not. Returns
 *                  the users public data
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: q
 *         description: The desired text to be searched for.
 *         in: query
 *         type: string
 *       - name: includeArchived
 *         description: Flag to include archived users in search results. Overridden
 *                      by the archived search option
 *         in: query
 *         type: boolean
 *         required: false
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: limit
 *         description: The maximum number of objects to return. A limit of 0 is
 *                      equivalent to setting no limit.
 *         in: query
 *         type: number
 *       - name: skip
 *         description: The number of objects to skip returning. For example,
 *                      if 10 objects are found and skip is 5, the first five
 *                      objects will NOT be returned. NOTE, skip cannot be a
 *                      negative number.
 *         in: query
 *         type: number
 *       - name: sort
 *         description: Provide a particular field to sort the results by.
 *                      You may also add a negative sign in front of the field
 *                      to indicate sorting in reverse order.
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to GET users, returns users public
 *                      data.
 *       400:
 *         description: Bad Request, Failed to GET users due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to GET users due to not being
 *                      logged in.
 *       404:
 *         description: Not Found, Failed to GET users
 *       500:
 *         description: Internal Server Error, Failed to GET users due to
 *                      server side issue.
 */
api.route('/users/search')
.get(
  AuthController.authenticate,
  Middleware.logRoute,
  APIController.searchUsers
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: archived
 *         description: If true, archived objects will be also be searched
 *                      through.
 *         in: query
 *         type: boolean
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *                  NOTE this endpoint is reserved for system-wide admins ONLY.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *   put:
 *     tags:
 *       - users
 *     description: Creates or replaces a user from the given data in the
 *                  request body. If a user with the username already exists,
 *                  they are replaced. NOTE This endpoint is reserved for
 *                  system-wide admins ONLY.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: The username of the user to create/replace.
 *         required: true
 *         type: string
 *         in: path
 *       - name: user
 *         description: The object containing the user data.
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             username:
 *               type: string
 *               description: The username of the user. If provided, this must
 *                            match the username provided in the path.
 *             password:
 *               type: string
 *               description: The password of the user. This field is required
 *                            unless LDAP authentication is used or some custom
 *                            authentication strategy that does not store
 *                            passwords.
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
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *         required: false
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
 *     responses:
 *       200:
 *         description: OK, Succeeded to PUT user, return user's public data.
 *       400:
 *         description: Bad Request, Failed to PUT user due to invalid data.
 *       401:
 *         description: Unauthorized, Failed to PUT user due to not being
 *                      logged in.
 *       403:
 *         description: Forbidden, Failed to PUT user due to an invalid request
 *                      body.
 *       500:
 *         description: Internal Server Error, Failed to PUT user due to server
 *                      side issue.
 *   patch:
 *     tags:
 *       - users
 *     description: Updates an existing user. The following fields can be
 *                  updated [fname, lname, preferredName, email, custom,
 *                  archived, admin]. Users that are currently archived must
 *                  first be unarchived before making any other updates. NOTE
 *                  this endpoint is reserved for system-wide admins only,
 *                  unless a user is updating themselves.
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
 *               description: NOTE when updating the custom data, the object
 *                            is completely replaced.
 *             archived:
 *               type: boolean
 *             admin:
 *               type: boolean
 *               description: NOTE only current system-wide admins can update
 *                            this field.
 *       - name: populate
 *         description: Comma separated list of values to be populated on return
 *                      of the object. [archivedBy, lastModifiedBy, createdBy]
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Comma separated list of specific fields to return. By
 *                      default the username field is returned. To specifically
 *                      NOT include a field, include a '-' in front of the field
 *                      (-name). [admin, archived, archivedBy, archivedOn,
 *                      createdBy, createdOn, custom, email, fname,
 *                      lastModifiedBy, lname, username, preferredName,
 *                      updatedOn]
 *         in: query
 *         type: string
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *         description: Internal Server Error, Failed to PATCH user due to
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
.put(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserAPI,
  APIController.putUser
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
 *       - name: minified
 *         description: If true, the returned JSON is minified. If false, the
 *                      returned JSON is formatted based on the format specified
 *                      in the config. The default value is false.
 *         in: query
 *         type: boolean
 *         default: false
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
 *         description: Internal Server Error, Failed to PATCH user due to
 *                      server side issues.
 */
api.route('/users/:username/password')
.patch(
  AuthController.authenticate,
  Middleware.logRoute,
  Middleware.disableUserPatchPassword,
  APIController.patchPassword
);


// Catches any invalid api route not defined above.
api.use('*', APIController.invalidRoute);

// Export the API router
module.exports = api;
