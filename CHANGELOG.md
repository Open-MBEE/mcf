# Changelog
All notable changes to this project will be documented in this file.

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
