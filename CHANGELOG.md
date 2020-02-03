# Changelog
All notable changes to this project will be documented in this file.

## [1.0.1] - 2020-01-31
### Major Features and Improvements
* Implemented HTTP/2 in place of HTTPS/1.1. This requires no change for the
  current user
* Added a new artifact strategy for Amazon's S3
* Added the ability for system wide admins to reset a users password
* Added support for temporary passwords. Whenever a local user is created or
  has their password reset, they must change their password upon first login
  
### Bug Fixes and Other Changes
* Fixed a bug causing the cursor to flicker while hovering over buttons in the
  UI
* Fixed a bug causing local plugins to not load properly on Windows
* Added an API endpoint which lists the filename and location of all artifact
  blobs on a project

## [1.0.0] - 2020-01-20
### Bug Fixes and Other Changes
* Added CONTRIBUTING.md file for detailing expectations for code contribution
* Added 8.0 User Interface Overview page to flight manual
* Updated element edit modal in the UI

## [0.10.5] - 2020-01-06
### Bug Fixes and Other Changes
* Upgraded the minimum mongoose version due to a bug with one of its dependencies

## [0.10.4] - 2019-12-20
### Major Features and Improvements
* Added a new database strategy for Amazon's DynamoDB. At this time the strategy
  is still in beta and should NOT be used in production
* Added the ability to allow for plugin functions to be triggered
  **synchronously** before and after most API routes
* Added a new system-admin only API endpoint to retrieve system logs
* Added a configuration option to enforce unique project ids, allowing for
  better backwards compatibility with the MMS API
* Added support for a configuration option which allows for enforcing how old a
  password must be, before in can be reused
* Added a new log file for requests and responses to security related endpoints


### Bug Fixes and Other Changes
* Added support for the `immutable` field in the `mongoose-mongodb-strategy.js`
* Fixed a bug where artifact documents were not cloned on creation of a branch
* Fixed a deprecation warning from the `crypto` library
* Added an ESlint plugin which enforces security related best practices
* Added an option to DELETE `/artifacts` and `/artifacts/:artifactid`
  called `deleteBlob` which if true, deletes the associated blob if no other
  artifact documents reference it

### Configuration Changes
* With the addition of the DynamoDB database strategy, there are new
  configuration options when the DynamoDB strategy is selected. Please refer to
  the database [README](/app/db/README.md) for configuration guidance
* Added the **required** string `log.security_file`, which specifies the name of
  the log file which stores requests/responses of security related endpoints
```json
{
  "log": {
    "security_file": "security.log"
  }
}
```
* Added the optional number `auth.oldPasswords` which specifies the minimum
  number of different passwords before a password can be reused. If this
  option is not supplied, there is no limit.
```json
{
  "auth": {
    "oldPasswords": 12
  }
}
```
* Added the optional boolean `server.uniqueProjects` which if true, enforces
  project IDs to be unique. Normally, two projects can have the same ID on
  different orgs, but if this option is true, attempting this will result in an
  error. This option helps support backwards compatibility with the MMS API
```json
{
  "server": {
    "uniqueProjects": true
  }
}
```

## [0.10.3] - 2019-12-06
### Major Features and Improvements
* Added page in UI for managing Artifacts. Allows the user to create,
  edit and delete artifacts on different branches
* Added support for webhooks. Webhooks can be created at the organization,
  project, branch and server levels. Webhooks can be triggered internally
  through the Node.js event system or externally through a URL
* Added the ability to run Mocha tests written in plugins. Any tests defined
  in a `tests` directory at the root of the plugin can be run by running the
  command `node mbee test --plugin {pluginName}` where `pluginName` is the
  name of the plugin defined in the config

### Bug Fixes and Other Changes
* Added the virtual field `referencedBy` to artifacts. If populated, returns
  all elements which reference the artifact
* Increased error testing coverage of branch and element controllers

### Configuration Changes
* Added the optional field `testOnStartup` to plugins. If this boolean value
  is true, the tests in the plugin will be run when it is built at server
  startup. This option can be defined for each plugin that is installed
```json
{
  "plugins": {
    "enabled": true,
    "plugins": {
      "sample-plugin": {
        "source": "path/to/sample/plugin",
        "testOnStartup": true
      },
      "test-plugin": {
        "source": "path/to/test/plugin",
        "testOnStartup": false
      }
    }
  }
}
```

## [0.10.2] - 2019-11-22
### Major Features and Improvements
* Abstracted out database migrations to support the database abstraction layer.
  Each database can now have migrations which are specific to that database, in
  addition to the system-wide database migrations
* Updated the Artifact schema by adding a `size` field, and changing the name of
  `name` to `description`
* Updated the Element schema by adding an `artifact` field which allows for
  referencing an artifact.

### Bug Fixes and Other Changes
* Refactored the database abstraction layer by removing the need to support
  callback functions in the parameters and by adding the requirement for
  supporting the operation `replaceOne` in `Model.bulkWrite()`
* Removed usage of the MongoDB specifc keywords `$unset`, `$push`, `$search` and
  `$meta`
* Modified queries searching the `permissions` field to use the keyword `$all`.
  Usage of this keyword specifies that all contents in the query **must** be
  found in an array for a document to match

## [0.10.1] - 2019-11-08
### Major Features and Improvements
* Added batch CRUD operations for artifact documents
* Refactored the Database Abstraction layer by removing the required methods
  `Schema.pre()`, `Schema.method()` and` Model.createDocument()`
* Updated tests to use random test data generated from custom validators if
  custom validators are defined in the running config

### Bug Fixes and Other Changes
* Fixed bug in UI where the selected branch did not persist between pages
* Removed the `lean` option from controllers

## [0.10.0] - 2019-10-28
### Major Features and Improvements
* Added basic CRUD operations for artifact documents in the API
* Added GET, POST and DELETE artifact blob API endpoints
* Implemented a local artifact storage strategy
* Implemented a database abstraction layer to support interchangeable databases.
  Please note this feature is in beta, and still a work in progress
* Added support for referencing elements in different projects in the UI
* Increased unit test coverage through addition of first UI unit tests
* Improved JSON rendering in UI `custom` fields
* Modified the `archived` option on GET requests. The option has been replaced
  with `includeArchived`, and the `archived` option now returns all documents
  which are archived
* Added a configuration validator, which verifies the running config has all
  required fields

### Bug Fixes and Other Changes
* Added pages for viewing all organizations and projects in the admin console
* Added `rootpath` option to GET `/elements/:elementid` which returns all
  parents of the specified element up through the root
* Added support for disabling the patch user password API endpoint
* Increased test coverage with addition of 8xx system level tests
* Added support for locking out local users after 5 failed login attempts in 15
  minutes. Users become archived, and must be unarchived by admins
* Increased linter coverage by adding rules for JSDoc headers
* Removed usage of $or and $regex in database queries to aid in implementation
  of different database strategies
* Removed organization and project pages from the profile page on the UI

### Configuration Changes
* Added the **required** field `db.strategy` whose value is a string, the name
  of the selected strategy. Please note that each strategy will have its own
  required fields in the `db` section
```json
{
  "db": {
    "strategy": "mongoose-mongodb-strategy"
  }
}
```
* Added the **required** section `artifact` which contains a single **required**
  field `artifact.strategy`, whose value is a string, the name of the selected
  strategy
```json
{
  "artifact": {
    "strategy": "local-strategy"
  }
}
```
* Added the optional validator `artifact_id` to the `validators` section
* Changed the name of the optional field `docker.mongo` to `docker.db`. If this
  field exists, it must be changed
* Added optional length validators to the `validators` section. These lengths
  are the MAX length of the ids
```json
{
  "validators": {
    "id_length": 36,
    "org_id_length": 36,
    "project_id_length": 36,
    "branch_id_length": 36,
    "artifact_id_length": 36,
    "element_id_length": 36,
    "user_username_length": 36
  }
}
```

## [0.9.0] - 2019-08-05
### Major Features and Improvements
* Added the ability to branch models in API and UI
* Added ability to view other users information in the UI
* Added support for system admins to create and delete users
* Added user search API endpoint
* Changed plugin configuration section to use objects rather than an array.
  See `example.cfg` for an example
* Added an advanced search for elements in the UI
* Added support for sorting results in GET operations
* Added support for sending .gzip files in all post/patch/put endpoints

### Bug Fixes and Other Changes
* Removed support for the `logDir` field in the configuration
* Added additional debug level logging during database calls
* Added resource consumption info to debug level logs
* Added additional info level logging on response from API calls
* Refined UI routes to better align with API structure
* Added support for referencing projects in the `default` org
* Updated clean command to delete contents of `data` directory
* Allow for archived elements to optionally be displayed in the UI
* Allow for element ids to be hidden from the element tree in the UI
* Added support for re-inserting data upon a failed PUT request
* Lowered permissions for PUT requests from system admins to org/project writers
* Fixed bug which crashed server when a plugin failed to be cloned
* Fixed bug which did not refresh the element tree upon creation of elements

## [0.8.0] - 2019-05-13
### Major Features and Improvements
* Updated UI pages for organization, project, user, and elements
* Added new options to element API endpoint for improved query capabilities
* Added the ability to reference elements outside the current project
  (must be in the same org)
* Added the __mbee__, holding_bin and undefined elements to all projects
* API performance improvements
* Moved session management to models directory
* Updated element tree display
* Added edit function for organization, project, user, and elements
* Added side panels for element information view
* Added element add and delete capabilities
* Updated some of the styles throughout the UI
* Added the sidebar plugin capabilities for projects
* Changed node version requirements to be 10.15.0 or higher

### Bug Fixes and Other Changes
* Fixed a bug causing the build process to mark completion prior to the build
  being complete
* Fixed a bug in the logger script causing incompatibility with Windows
* Other minor bugfixes
* Improved authentication error responses
* Added a step during startup to check that installed dependencies are up to
  date.
* Added lean option to controllers
* Added the ability to customize request timeout
* Added CHANGELOG.md

## [0.7.3] - 2019-03-15
### Major Features and Improvements
* Added the minified option to all API endpoints
* Added the skip option to all find() functions and GET endpoints
* Renamed the "jmiOpt" option to "format"
* Added event emitter library and default events

## [0.7.2] - 2019-03-13
### Major Features and Improvements
* Added createOrReplace controller functions and PUT endpoints for all object
  types
* Added the fields options to all controller functions (excluding remove())
* Added the limit option to all find() functions
* Added the element search controller function and API endpoint
* Created an additional test suite to test for expected errors

### Bug Fixes and Other Changes
* Added CREDITS file

## [0.7.1] - 2019-02-20
### Major Features and Improvements
* Added new API endpoint for updating user passwords
* Integration of front-end UI framework to support future UI development
* Provided basic support for Docker
* Provided a default configuration file
* Improved dependency management for plugins

### Bug Fixes and Other Changes
* Updated permissions logic

## [0.7.0] - 2019-02-25
### Major Features and Improvements
* Added API Controller backwards compatibility
* Introduced database schema migration support
* Added MBEE Flight Manual (user manual)

### Bug Fixes and Other Changes
* Updated JSDoc formatting

## [0.6.0] - 2018-12-05
### Major Features and Improvements
* Initial release
