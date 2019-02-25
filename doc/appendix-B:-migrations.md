# Migrations

As MBEE progresses, changes to how data is stored and which data is
stored need to be made. This is done through database migrations. Whenever a
significant change in the database structure occurs, a migration script is
released that updates the data stored in the database to the new format.

## Running Migrations

Every migration script released has the ability to migrate up a version and
migrate down a version. To migrate the database to the latest version, simply
run the command `node mbee migrate`. The ability to migrate to a
specific version is also available, simply by passing in an additional argument
'--to', and the version number desired. For example:
`node mbee migrate --to 0.7.0`. **This is NOT the recommended
approach, and should only be done if necessary.**

## Migration Failures

In the rare chance a migration does fail, content from the database is at
at risk of being lost. To counter this, prior to any content being deleted or
altered, all data is stored in JSON files in the /data directory. The files are
named based on the collection altered, for example: *projects.json*. Upon
successful migration of that specific collection, the file is removed from the
/data directory. If for some reason a failure does occur, this data can be used
to recreate the lost items, and help prevent any data loss.

## Previous Migrations

Below is a list of previous migrations which had implications that required
additional effort by system administrators. Each section below contains
instructions for system admins to get the database back to a correct state.

#### 0.6.0 -> 0.7.0

This migration made a significant change to the database and did cause
breaking changes to users. Due to how users passwords are encrypted and stored,
**the changes to users have caused all users passwords to be invalidated.**
This means all existing (non-LDAP) users will have to be deleted and recreated.
*NOTE: This is not the case for LDAP users as LDAP passwords are not stored in
the database.*

###### System Admin Instructions
1. Remove all local users manually from the database.
2. Restart the server, which creates the default admin.
3. Using the default admin, recreate all users through API, ensuring users have
the same username.

