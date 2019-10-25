# Changelog
All notable changes to this project will be documented in this file.

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
