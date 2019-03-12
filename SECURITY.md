# MBEE Security

**Contents**
- [Disclosure Policy](#disclosure-policy)
- [Known Gaps and Issues](#known-gaps-and-issues)
- [Security Related Configuration](#security-related-configuration)
  - [Plugins and Integrations](#plugins-and-integrations)
  - [Ports](#ports)
  - [Configuration JSON File](#configuration-json-file)
  - [HTTPS](#https)
  - [Server Secret Key](#server-secret-key)
  - [MongoDB](#mongodb)
  - [Authentication](#authentication)


## Disclosure Policy

This will be defined in an upcoming release. This software is currently in 
beta and a formal disclosure policy will be defined by our 1.0.0 release.

## Known Gaps and Issues

#### MBEE Tests
The MBEE tests should not be run in production because the tests will create
an arbitrary admin user in the database.

It's important to ensure that all test users are deleted from the database.

#### Asynchronous Build Script 

Some components in the build script are asynchronous and the build script will 
print out a message that build is complete before build has finished.

#### UI Refresh
Refreshing some UI pages causes issues with page rendering due to client-side
applications mapping to server-side routes.



## Security Related Configuration

### Plugins and Integrations
There are a few ways of writing applications that interact with MBEE. Client
applications and service-based integrations interact with MBEE via its API
and don't require much discussion here. However, understanding plugins is
critical to maintaining the security posture of an MBEE instance.

A plugin is a type of integration for MBEE that runs on the same server. In
fact, it is part of the same running process. It is a module or collection of
modules written in JavaScript as an Express application that is included by MBEE
and used under namespaced routes. These plugins offer the ability to extend the
functionality of MBEE. On one hand they allow for high-performance integrations
with direct access to the underlying MBEE modules and database connections, on
the other hand they extend MBEE functionality in along a monolithic architecture
rather than a distributed microservice architecture that is created by API-based
integrations.

The most important thing to realize here is that a plugin, once-installed, is
part of MBEE. It is part of the same running process, has access to the running
configuration (which can include DB and/or LDAP credentials), and can execute
code on the server with the same privileges as the MBEE application.

This makes plugins critical to the running application's security posture.
It is the responsibility of the MBEE administrator to fully vet and understand
any plugins being installed on an MBEE instance.

### Ports

| Port   | Purpose                                                            |
|:-------|:-------------------------------------------------------------------|
| 9080   | MBEE HTTP port, this is adjustable in the configuration file.      |
| 9443   | MBEE HTTPS port, this is adjustable in the configuration file.     |
| 27017  | MongoDB. See [MongoDB section below](#mongodb) for more detail.    |


### Configuration JSON File

MBEE retrieves its configuration information from the JSON files in
`config/*.json`. Which JSON file is used depends on the value of the `NODE_ENV`
environment variable. MBEE looks for a file called `config/<NODE_ENV>.json`,
where `<NODE_ENV>` is the value stored in the `NODE_ENV` environment variabled.
For example, if `NODE_ENV` is set to `production` MBEE will use the file
`config/production.json` for its configuration.

This configuration file contains security-related information such as database
credentials, authentication information, SSL certificate info, and more. This
configuration should not be checked into version control.

### HTTPS

To run MBEE with SSL enabled, you need a valid SSL certificate for the server.
Once you have this you can simply define name of that certificate (which MBEE
expects to find in the `certs` directory of the project) in the `server.https`
section of the configuration JSON file. For example, consider the following
section of the configuration file:

```json
{
  "server": {
    "http": {
      "enabled": true,
      "port": 9080
    },
    "https": {
      "enabled": true,
      "port": 9443,
      "sslCertName": "your-cert-name-here"
    }
  }
}
```

HTTP and HTTPS can be enabled or disabled individually by setting their
respective `enabled` fields to either true or false. To run MBEE with only
HTTPS, simply disable HTTP by changing the `server.http.enabled` field to
`false`. Also, note that the ports used for HTTP and HTTPS can be configured.

### Server Secret Key

The `server` section of the config also contains a `secret` field which is used
as the secret key for symmetric encryption operations related to token-based
authentication. This secret key can be set manually, however, MBEE supports the
special case of a random key. When the `server.secret` field is set to `RANDOM`,
MBEE will use a randomly generated string as the secret key. This key is
generated on server startup and will change with each restart of the server.
This means that a restart of the server will invalidate session tokens.

### MongoDB

**MongoDB Authentication**
The `db` section of the configuration JSON file defines how MBEE will connect
to the MongoDB database. **MongoDB by default does not run securely.** By
default, MongoDB does not require authentication. To enable authentication on
MongoDB you must first run the server without authentication enabled (we
recommend doing this in an isolated environment). To do this, run
`mongod --dbpath=./db`, where `./db` is the path to your database.

> You can run MongoDB from whatever directory you like, but you must ensure the
> directory containing the database contents has appropriate permissions
> settings for your environment.

With MongoDB running, you can add an admin user as follows:

```
use admin
db.createUser(
  {
    user: "admin",
    pwd: "admin",
    roles: [{
        role: "userAdminAnyDatabase",
        db: "admin"
    }]
  }
)
```

The `use admin` command creates the admin database, then `db.createUser` is used
to create your admin user. To create a database and user for MBEE, you can
run the following:

```
use <YOUR_MBEE_DB>
db.createUser({
    user: "<YOUR_MBEE_USERNAME>",
    pwd: "<YOUR_MBEE_PASSWORD>",
    roles: [{
        role: "readWrite",
        db: "<YOUR_MBEE_DB>"
    }]
})
```

In this case, `<YOUR_MBEE_DB>` is the name of the MBEE database,
`<YOUR_MBEE_USERNAME>` is the name of your database user, and
`<YOUR_MBEE_PASSWORD>` is the password to use for your MBEE user.

> This goes without saying, but don't use easy to guess usernames and passwords.

Once authentication is configured, you can stop MongoDB and re-run it with the
`--auth` flag. For example:

```
mongod --auth --dbpath=./db
```

**SSL**
To enable SSL on MongoDB, you need a valid SSL certificate in `PEM` format and
a CA file for that certificate if necessary. To enable SSL, run MongoDB with
the following flags:

```
mongod --sslMode requireSSL \
       --sslPEMKeyFile /path/to/your/certificate.pem \
       --sslCAFile /path/to/your/certificateAuthority.pem \
       --sslAllowConnectionsWithoutCertificates
```

**Other Useful Security-Related Flags**
The `--bind_ip` flag can be used to tell MongoDB what interfaces to listen on.
For example `--bind_ip 0.0.0.0` will listen on all interfaces where
`--bind_ip 127.0.0.1` will only listen on localhost.

The `--logpath=/path/to/your/log/file.log` can be used to specify the MongoDB
log file.

**Recommendations**
Consider running MongoDB in the following way:

```
mongod --sslMode requireSSL \
       --sslPEMKeyFile /path/to/your/certificate.pem \
       --sslCAFile /path/to/your/ca.pem \
       --sslAllowConnectionsWithoutCertificates \
       --bind_ip YOUR.IP.ADDRESS.HERE \
       --auth --dbpath=/path/to/your/db \
       --fork --logpath=/path/to/your/log/file.log
```

### Authentication

MBEE operates on a concept of *modular authentication*. This means that one or
more authentication modules are defined in the MBEE code. These authentication
modules are located in the `app/auth` directory. MBEE was built to be an open
source product and was therefore designed with varying organizations in mind.

To accommodate this, we implemented these authentication modules which allow
each organization to write a few small functions to define their own
authentication strategies that meet their organization's needs. As such, the
module to be used is defined in the configuration JSON file. Consider the JSON
configuration example below:

```json
{
  "auth": {
    "strategy": "ldap-strategy",
    "ldap": {
        // LDAP information
    },
    "token": {
      "expires": 10,
      "units": "MINUTES"
    },
    "session": {
      "expires": 30,
      "units": "MINUTES"
    }
  }
}
```

The `auth.strategy` section tells MBEE which authentication module or *strategy*
to used. The `auth.ldap` section is required for the LDAP strategy and is used
to pass LDAP-specific information into MBEE.

Also important to note is the `auth.token` and `auth.session` configuration.
Both allow the definition of an expiration time, but there are differences
between the two that should be explained.

A token is generated within MBEE. It stores basic information about the user
(such as username and token expiration time) encrypted using the server's secret
key (see the section on [Server Secret Key](#server-secret-key) above). This
token is used to authenticate the user during session token authentication as
well as API token authentication. The `auth.token` section defines when this
token expires.

When interacting with MBEE via the UI, a user's token is stored in their session
object. The `auth.session` section defines when a session expires.

For API interactions with MBEE, only the `auth.token` expiration matters since
sessions aren't used. However, for UI interaction with MBEE, both the token
and session definitions matter. Whichever expires first will cause the user's
authentication to expire.
