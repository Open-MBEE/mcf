# Appendix A: System Administration

## Docker Documentation
MBEE can be run in a docker container. The docker functionality includes
getting logs, cleaning, building, and running the docker container. To run the
commands, use `--[cmd]` after `node mbee docker`.  To run the container, you
must first build the container image with `--build`. This will build the docker
image using the dockerfile that is provided in the mbee code. Below is an
example of how a docker container can be built:

```bash
node mbee docker --build
```

After the image is built the docker container can be run using `--run`. The
container will be detached, but have an interactive processes. If docker
container unexpectedly exited, the container will restart. The docker image can
also be run with a specified MBEE environment variable. Below is an example of
how a docker container can be run:

```bash
MBEE_ENV=test node mbee docker --run
```
To get the logs of the docker container, you can use `--get-logs`. This will
print out the containers logs, which can be useful if an error has occured. If
the docker container needs to be rebuilt and the previous build needs to be
removed, use `--clean` to remove the previous docker build.

### Docker Documentation
MBEE can be run in a docker container. The docker functionality includes
getting logs, cleaning, building, and running the docker container.

You can find more on using docker with MBEE at the `/doc/index.html`
route on a running MBEE server.

## Advanced Configuration

### Configuration File
MBEE stores all it's configuration information in the `config` directory. By
default, it uses the `default.cfg` file, but that can be changed by setting the
`MBEE_ENV` environment variable. On startup, MBEE will load the configuration
file with a name matching the `MBEE_ENV` environment variable. For example,
if `MBEE_ENV=production`, MBEE will look for the file `config/production.cfg`.

The MBEE config is simply a JSON file that allows comments. MBEE is designed to
be largely parameterized by this config file. In this config file you will have
options to alter the server ports, Docker configurations, enabling and
disabling components, and swapping out authentication schemes. For a
more detailed explanation of the fields supported by the config file, see the
detailed comments provided [example.cfg](config/example.cfg).

To get started, you should edit the [default.cfg](config/default.cfg) to support
your configuration.

### Modular Authentication

MBEE supports modular authentication strategies. These strategies are defined
in the authentication modules in `/app/auth`. Which authentication strategy is
used is defined in the config file. The `auth` section contains a field called
`strategy`. This `auth.strategy` section should be set to the module you which
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

The `handleBasicAuth()` and `handleTokenAuth()` functions both defines how to
authenticate users for their respective input types. Both objects are passed the
request object, `req`, and response object, `res`. `handleBasicAuth()` is
passed the username and password which is obtained from either the authorization
header or form input depending on which is provided (with the former taking
precedence). `handleTokenAuth()` is passed a token which is retrieved either from
the authorization header or the `req.session.token` field (with the former
taking precedence). Both of these functions must return promise that resolves
the user object on success or rejects with an error if authentication fails.

The `doLogin()` function defines what actions should be done to actually log the
user in when authentication succeeds. This function is called for the following
routes:
    - `/api/login`: This function should set the `req.session.token` and call
    `next()` when done. Control will then be passed to the API controller which
    will return the token in the form `{ "token": "yourReqSessionToken" }`
    -`/login`: This function should perform login actions such as setting the
    `req.session.token` value then call `next()` when done which will handle
    appropriate redirection of the user.
