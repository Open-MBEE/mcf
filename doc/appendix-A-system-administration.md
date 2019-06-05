# Appendix A: System Administration

## Overview
MBEE is designed to be deployed in a number of different architectural 
configurations. At its simplest, it can be deployed as a single instance of
an application or it can be run in more complex configurations, such as
clustered behind a load balancer. This document will primarily focus on the 
first case: a single running instance of the MBEE Core Framework.

### System Requirements
MBEE is designed to be cross-platform, but is primarily tested on Linux and 
other Posix systems. Windows support is intended, but not yet fully supported.

> Windows Users: MBEE should be able to run on Windows, but plugins may not be 
> fully supported. It is intended that full Windows support will be available by
> version 0.10.0 of the MBEE Core Framework.

The server should have at least 1 CPU and 0.5 GB RAM. The amount of disk space
required is dependent on the total model storage needed.

## Obtaining the MBEE Source Code
The MBEE source code can be obtained from [GitHub](https://github.com/lmco/mbee.git).
Clone the source code using Git by running:

```shell
git clone https://github.com/lmco/mbee.git
```

## Building MBEE
Before running MBEE, the software must be built. The build process compiles 
Sass into CSS, transpiles React JSX into vanilla Javascript, builds 
documentation, prepares other static files, and more.

The build process will output these runtime files to the `build` directory.

Yarn is the recommended build tool for MBEE. To install it, run 

```
npm install -g yarn
```

### Quickstart
If you're building MBEE for the first time, the easiest way to get started is 
to run

```
yarn install
```

By default this will install all dependencies and run a post-install script to 
build MBEE. 

### Build Process Breakdown
The installation process (e.g. `yarn install`) installs the necessary 
dependencies to build and run MBEE. The installation includes a 
*pre-install* and *post-install* script. The pre-install script cleans and 
removes an existing build. The post-install script runs the MBEE build.

Either of these scripts can be turned off by setting the `NOPREINSTALL` or 
`NOPOSTINSTALL` environment variables.

```shell
export NOPREINSTALL=1     # Turns off the pre-install script
export NOPOSTINSTALL=1    # Turns off the post-install script
yarn install
```

The build can be run separately from the dependency installation, but the 
dependencies must be installed first.

To build MBEE run the following command:

```shell
node mbee build
```

The build process also supports several command line options for only running
certain sections of the build. When no options are provided, all build sections
are executed. The following options are supported:

- **`--copy-deps`** - Copies static runtime dependencies into the build folder.
- **`--jsdoc`** - Builds the JSDoc documentation.
- **`--fm`** - Builds the flight-manual.
- **`--sass`** - Builds the Sass into CSS.
- **`--react`** - Transpiles the React JSX into client-side Javascript 

Additionally, a **`--all`** option tells the build script to run all sections of
the build. This is the default behavior when no options are provided.

### Database Schema Migrations
*Appendix B* of the Flight Manual covers database migration in more detail, but
it will be discussed here briefly.

Database migration refers to altering the database contents and schema with new 
versions of MBEE. To facilitate this, MBEE contains a collection of migration
scripts for updating from one version to another.

To run the migrations and update to the latest version, run 

```
node mbee migrate
```

By default, this will run the migration scripts to update to the latest version.
MBEE stores the current schema version in the database and compares that version
to the `schemaVersion` field in the `package.json` file.

When no schema version information can be found in the database, MBEE will 
automatically apply any necessary migrations.

The migrations command will typically prompt the user to confirm the action.
To automatically answer *yes* to this prompt (i.e. for scripting the migration
command), the `-y` option can be used. 

```shell
node mbee migrate -y
```

## Running MBEE
Before running MBEE, it must be built. See the *Building MBEE* section above
to build MBEE.

### Running in Development
To run MBEE, run the following command:

```shell
node mbee start
```

By default, the Node.js process has a limited amount of memory (this size may 
vary depending on your configuration and Node version). To increase the default
memory limit use the `--max-old-space-size` option. For example:

```shell
node --max-old-space-size=8192 mbee start
```

> NOTE: The value above is in megabytes (MB).

### Using PM2
Run `npm install -g pm2` or `yarn global add pm2` to install the `pm2` 
process manager for Node.js. Make sure the `pm2` binary is in your PATH.

To run MBEE, run `pm2 start mbee.js -- start`. Run `pm2 logs mbee` to view the
server log output. You should now be able to navigate to MBEE in your web 
browser and view the running application.

To stop the running server, run `pm2 stop mbee`. To remove the process from PM2
entirely, run `pm2 delete mbee`. Running `pm2 list` at this point should no
longer include MBEE in the process list.

### Using Docker
MBEE can be run in a docker container and has convenient command line options
for enabling this. To run the commands, use `--[cmd]` after `node mbee docker`.  
You must build MBEE first (see the *Building MBEE* section above) before 
building the Docker image.

To build the docker image, run `node mbee docker --build`. This will build the 
Docker image using the Dockerfile specified in the MBEE configuration file.
The Dockerfile, image name, container name, and other options can be configured
in the MBEE config file.

After the image is built, the docker container can be run using the `--run` 
subcommand. The container will be detached, but have interactive processes. 
The default runtime configuration will restart the Docker container if the
server crashes. Below is an example of how a docker container can be run:

```bash
node mbee docker --run
```

To get the logs from the docker container, you can use `--get-logs`. This will
print out the container logs, which can be useful if an error has occurred. 

If the docker container needs to be rebuilt and the previous build needs to be
removed, use the `--clean` subcommand to remove the previous docker image and 
container.


## Advanced Configuration
MBEE stores all it's configuration information in the `config` directory. By
default, it uses the `default.cfg` file, but that can be changed by setting the
`MBEE_ENV` environment variable. On startup, MBEE will load the configuration
file with a name matching the `MBEE_ENV` environment variable. For example,
if `MBEE_ENV=production`, MBEE will look for the file `config/production.cfg`.

The MBEE config is simply a JSON file that allows comments. MBEE is designed to
be largely parameterized by this config file. The file supports options for
defining the server ports, Docker configuration information, enabling and
disabling application components, swapping out authentication schemes, and more. 

For a detailed explanation of the fields supported by the config file, see the
detailed comments provided in the [example.cfg](config/example.cfg).

Some of the noteworthy options are

> **NOTE:** The notation below uses `.` characters to describe nested JSON.
> For example `auth.strategy` refers to the `strategy` field within the `auth`
> section. Or as JSON:
> ```json
> {
>   "auth": {
>     "strategy": "someString"
>   }
> }
> ```
>

- **auth**: For authentication-related information. 
  - **auth.strategy**: This section is used to define which 
  authentication strategy will be used.
  - **auth.token** and **auth.session**: Defines when sessions and tokens will
  expire. In most cases these should be the same.
- **db**: Used to configure the database connection.
- **docker**: Defines the Docker configuration. This is used when running the 
`node mbee docker` command.
- **log**: Defines the log level and log file names.
- **server**: This is the bulk of the application configuration.
  - **server.defaultAdminUsername**: The default admin user created on first
  server startup.
  - **server.defaultAdminPassword**: The default admin user's password.
  - **server.defaultOrganizationId**: The default organization ID that all users
  will be members of.
  - **defaultOrganizationName**: The friendly name of the default organization.
  - **server.http**
    - **server.http.enabled**: Used to enable/disable HTTP.
    - **server.http.port**: Defines the HTTP port.
    - **server.http.redirectToHTTPS**: If `true`, redirects all HTTP traffic to
    HTTPS. HTTPS must be enabled.
  - **server.https**: 
    - **server.https.enabled**: Used to enable/disable HTTPS.
    - **server.https.port**: Defines the HTTPS port.
    - **server.https.sslCert**: The path to the server SSL certificate 
    (e.g. "path/to/your/ssl/cert.crt").
    - **server.https.sslKey**: The path to the server SSL key 
    (e.g. "path/to/your/ssl/key.key").
  - **server.requestTimeout**: The time at which server requests will time out
  in seconds.
  - **server.requestSize**: The maximum size request. 
  - **server.api**: {
    - **server.api.enabled**:Can be used to enable/disable the API.
    - **server.api.userAPI**: Can be used to disable certain user API endpoints
    such as create and update. This may be useful when using a separate 
    authentication provider such as LDAP.
  - **server.plugins**: {
    - **server.plugins.enabled**: Can be used to enable/disable plugins.
    - **server.plugins.plugins**: This is where plugins are defined. This
    section tells MBEE which plugins should be installed and where to obtain 
    them.
  - **server.ui**
    - **server.ui.enabled**: Can be used to enable/disable the UI. This may be
    useful if the MBEE API is desired without the front-end GUI.
    - **server.ui.mode**: This is used during build to define the build mode for
    React. Valid options are "development" and "production".
    - **server.ui.banner**: This section can be used to define a banner at the
    top and bottom of the UI for providing sensitivity labels.
  - **server.secret**: This is the secret key used by the server for encrypting
   authentication tokens. If the word "RANDOM" is provided, a key will be 
   randomly generated on server startup.
- **test**: Defines test configuration. Used when running `node mbee test`.
- **validators**: Validators can be used to overwrite certain default data model
validation behaviors. Any validator defined in the `app/lib/validators.js` file 
can be overwritten here.

## Modular Authentication
MBEE supports modular authentication strategies. These strategies are defined
in the authentication module in `/app/auth`. Which authentication strategy is
used is defined in the config file. The `auth` section contains a field called
`strategy`. This `auth.strategy` section should be set to the module you wish
to use.

These authentication modules have well defined interfaces that can be
dynamically replaced based on the configuration. This allows you
to write a custom authentication module to accommodate the needs of your
company or organization without having to make major changes to MBEE. You can
then specify which authentication module to use in the MBEE config file.

By default, MBEE provides strategies for local authentication or LDAP
authentication. Local is used by default because it has fewer dependencies and
is easiest to get started. LDAP can be used by specifying that strategy in the
[default.cfg](config/default.cfg) and altering the `auth.ldap` section of the
config to define your LDAP configuration.

An authentication module has the following requirements:

- It must be located in the `app/auth` directory.
- It must implement and export the following functions
    - handleBasicAuth(req, res, username, password) - Returns a Promise
    - handleTokenAuth(req, res, token) - Returns a Promise
    - doLogin(req, res, next)
    - validatePassword(password, provider) - Returns a boolean

The `handleBasicAuth()` and `handleTokenAuth()` functions both defines how to
authenticate users for their respective input types. Both objects are passed the
request object, `req`, and response object, `res`. `handleBasicAuth()` is
passed the username and password which is obtained from either the authorization
header or form input depending on which is provided (with the former taking
precedence). `handleTokenAuth()` is passed a token which is retrieved either
from the authorization header or the `req.session.token` field (with the former
taking precedence). Both of these functions must return a promise that resolves
the user object on success or rejects with an error if authentication fails.

The `doLogin()` function defines what actions should be done to actually log the
user in when authentication succeeds. This function is called for the following
routes:
    - `/api/login`: This function should set the `req.session.token` and call
    `next()` when done. Control will then be passed to the API controller which
    will return the token in the form `{ "token": "yourReqSessionToken" }`
    -`/login`: This function should perform login actions such as setting the
    `req.session.token` value and then call `next()` when done, which will
    handle appropriate redirection of the user.

The `validatePassword()` function is meant to validate the password of each user
being created. This function should accept the password (and optionally the
provider), verify the password meets some requirements, and return a boolean
denoting whether that password is valid or not. By default, the requirements
provided in the local-strategy expect each password to be at least 8 characters
in length, and have at least one number, uppercase letter, lowercase letter and
at least one special character. For security reasons, it is recommended that
you do not lessen these requirements.
