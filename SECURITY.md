# MBEE Security

**Contents**
- [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
- [Disclosure and Security Update Policy](#disclosure-and-security-update-policy)
- [Known Gaps and Issues](#known-gaps-and-issues)
- [Security Related Configuration](#security-related-configuration)
  - [Plugins and Integrations](#plugins-and-integrations)
  - [Ports](#ports)
  - [Configuration JSON File](#configuration-json-file)
  - [HTTPS](#https)
  - [Server Secret Key](#server-secret-key)
  - [Authentication](#authentication)


## Reporting Security Vulnerabilities
If a security related  issue is identified in the open source version MBEE,
please email
[mbee-software.fc-space@lmco.com](mailto:mbee-software.fc-space@lmco.com).
This will notify the Lockheed Martin MBEE Software Engineering team of the
issue. Your email will be acknowledged within 1 business day and a more detailed
follow-up will be provided within 5 business days.

When disclosing a vulnerability, please provide the following information:

- Server information: any environment details that can be provided about the 
instance of MBEE on which the vulnerability was identified on.
- The MBEE version (can be retrieved from the MBEE `/about` page)
- Whether or not the original source code has been modified. Details about any modifications
can be helpful, if that information can be provided.
- A detailed description of the issue (the more detail, the better) so our team
can quickly reproduce the issue.
- Organization(s) impacted/affected.

If your disclosure is of a sensitive nature, you may choose to encrypt your 
report using the following GPG public key:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mQENBFzS4/QBCACtj/64Ok3X+XWmlzo/5bCz+fj2jLgQt8YgX4wxQTXbDmlXY7in
FQoD0foTC2BkB4royg01leZlnd5HfYh5Nz0WxUzw9zPZoaitsrUxzWcQHT0323G1
c2Oclb28RK/JVIF7w9EF6wlL4+ZfJ+ZJ7WtUEcseAPMvFlYOx9eOPa5guyvUk9eV
tWxt/67ki0/kfIFN6LtS35X6K44qDAFURAramIFOrODmkNcWQNFkm39Eg3ygHnUS
eqlTlPwvzG7bVI2hmFf6+IDoqQuMleN3r5fbWmHkZVg1q9gvBJ0+X6OVquEnHz8F
ZE39fa9Vl+UREH/55yO4xApTQDhRuVozkzXZABEBAAG0L21iZWUtc29mdHdhcmUg
PG1iZWUtc29mdHdhcmUuZmMtc3BhY2VAbG1jby5jb20+iQFUBBMBCAA+FiEEoVqm
0EvHGIs7jWRzgW7AYu0iZGAFAlzS4/QCGwMFCQPCZwAFCwkIBwIGFQgJCgsCBBYC
AwECHgECF4AACgkQgW7AYu0iZGD1mgf9FdZFoEgDUeyQPkbXAjV0AGbTXp9VUdPU
zVacT9zIxyeFvQpA8uP8V3C+5+uay72UliI/AK1VK9EBMYklTTKuRLmOmZGx/DNQ
jwPZBXaBuCaykjX6EfoqT6+ZZc/sqQRcPRchR2siUWD6et3ZD5I74++L3mXXFVqd
Rog5LIDF6KbIRkVCNn9nSuKU5KX0vuLT9nu5B7LuH/YXHRJgM7HYzfpRVuvFUZp9
P9FEQgD0cufFTC61kQcK0UAId0EK7ub9SElkwWIn+fU62/jHKPCHJdDjhFF5cn9v
x3iJ0DmEpy098goksLQi991x73gep07hg8Jr/OeAPw5ci4MgFUfRLrkBDQRc0uP0
AQgA4RaTUjGhdg2ZqtfLPHq7fokaRYmmpIYXVNGo62AJHutZnwx1FZF0WMefKcpj
hQkAkJ86Mi0sKGR1J0B6xjZsYpO5Jlyx0b2cHfr68m8Hxv9tH+zcnJqVj+gsdIQ+
yLVadxjTd9xxayhDrwE0jVz9nzMgoqyYSjmLyaWl7TzJfO3PuGkXgLkxTlXPR1qT
fwNMIToePxH5FRPykXygj8NVnrZN3ATtyjFCR7qd9LmAunEFBtOpCxeLNqAsKuZq
Cx90oJEIVZc5mCfo497fOdCEx3f0uIal7BeYcvLL1A89rw9nPZPX/5A/r7rxxfTZ
Zcl9z6OK9Wo8D/f6NgjIBdXu1QARAQABiQE8BBgBCAAmFiEEoVqm0EvHGIs7jWRz
gW7AYu0iZGAFAlzS4/QCGwwFCQPCZwAACgkQgW7AYu0iZGBsrAf/XWHrNgaLijAF
7tODGpdd4fQSIsMjc7Ad61UrpG7SeNZY8QnPtWP5U/LrPMYjvzHj5r38eCQFOqy4
aX8mgs1ttdmNfavkgOihyMlOuAxTvjlO7V47GP45J0ZRS1tR/+R4kI+qPGAILECI
gYOiLM2cRu1qAafi7urfLh710Z37Pw35A78MVZfPmr6PmogjpF8v2zihRC1tvU7G
qMJqy0jExIvfZVEoRB4+AuRh0eeYpgLPL4nCmV+R4gXq/oT7KESze+8DGMy6aGl1
OuzehpapwPugAPonYf5UTloSflxRsQYqjAt71c4KK+joeYHK2cqM6wPw+GX5zQBj
0tpmsfEDeA==
=Zzxx
-----END PGP PUBLIC KEY BLOCK-----
```

To encrypt a message, save this file as `mbee-software.key.pub` and import the 
key into GPG by running:

```
gpg --import mbee-software.key.pub
```

Then encrypt your message by running:

```
gpg -e -r mbee-software file_to_encrypt.txt
```

## Disclosure and Security Update Policy
If and when security-related updates are made to MBEE, refer to `CHANGELOG.md`
for instructions on how to mitigate the issue.

## Known Gaps and Issues

#### MBEE Tests
The MBEE tests should not be run in production because the tests will create
an arbitrary admin user in the database.

It's important to ensure that all test users are deleted from the database.

Additionally, when using custom id validators in the config, the testing script
will attempt to generate new ids for test data that match the custom validators.
However, if an invalid RegEx is supplied for a custom validator, or a RegEx that
otherwise conflicts with the maximum or minimum id length, a critical error will
be logged and the process will exit due to not being able to generate test data.

#### Element Search UI
A known issue exists in the advanced element search in the UI. If the same field
is selected more than once for the advanced search, only the first value is
searched. For example, if searching by type `class` and by the type `block`,
only the `class` results would be found.

#### Internet Explorer
Internet Explorer does not currently have great support for React applications.
Because MBEE is written primarily in React, users who attempt to use MBEE on
Internet Explorer will not be able to use any of the UI features past the
login screen. Seeing that Mircosoft Edge is now the supported Windows browser,
it is not in the plans to officially support MBEE for Internet Explorer.

#### Plugin Loading
Due to the nature of how plugins are loaded, the API and UI are not accessible
until a plugin has been succesfully loaded. This can cause issues if plugins
hang while loading, and can prevent the UI and API from being accessible.

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
with direct access to the underlying MBEE modules and database connections. On
the other hand, they extend MBEE functionality in a monolithic approach
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

Below are the default ports necessary for running an MBEE instance and what those
ports are used for. The HTTP and HTTPS ports are adjustable in the configuration
file, and the database port can be adjusted on deployment and in the 
configuration file.

| Port   | Purpose           |
|:-------|:----------------- |
| 9080   | MBEE HTTP port    |
| 9443   | MBEE HTTPS port   |
| 27017  | Database          |


### Configuration JSON File

MBEE retrieves its configuration information from the JSON files in
`config/*.json`. Which JSON file is used depends on the value of the `NODE_ENV`
environment variable. MBEE looks for a file called `config/<NODE_ENV>.json`,
where `<NODE_ENV>` is the value stored in the `NODE_ENV` environment variable.
For example, if `NODE_ENV` is set to `production` MBEE will use the file
`config/production.json` for its configuration.

This configuration file contains security-related information such as database
credentials, authentication information, SSL certificate info, and more. This
configuration should not be checked into version control.

### Password Validation

Password validation was designed to be configurable through each authentication
module. When a user is created, the configured auth module is checked for an
exported validator function called `validatePassword()`. This function should
accept up to two parameters, the password (required) and the provider
(optional), and should return a boolean of whether the password is valid or not.

When creating a user, this function is ran and if the value *false* is returned,
the creation of that user is rejected. The default password requirements
provided in the local-strategy expect each password to contain at least 8
characters and at least one number, uppercase letter, lowercase letter and at
least one special character. If desired, one implementing this function can
allow for stricter requirements, but we do not suggest lessening the
requirements for security reasons.

If using an auth module that does not need to store passwords in the database
(such as LDAP), the `validatePassword()` function still needs to be provided and
exported, but only needs to return *true* for any case.

### HTTPS

To run MBEE with SSL enabled, you need a valid SSL certificate for the server.
Once you have this you can simply define the name of that certificate (which MBEE
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
      "sslCertName": "path/to/your/ssl/cert.crt"
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

### Authentication

MBEE operates on a concept of *modular authentication*. This means that one or
more authentication modules are defined in the MBEE code. These authentication
modules are located in the `app/auth` directory.

MBEE was built to be an open source product and was therefore designed with 
varying organizations in mind. To accommodate this, we implemented these 
authentication modules which allow each organization to write a few small 
functions to define their own authentication strategies that meet their 
organization's needs. As such, the module to be used is defined in the 
configuration JSON file. Consider the JSON configuration example below:

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
to use. The `auth.ldap` section is required for the LDAP strategy and is used
to pass LDAP-specific information into MBEE.

Also important to note are the `auth.token` and `auth.session` configuration 
options. Both allow the definition of an expiration time, but there are 
differences between the two that should be explained.

A token is generated within MBEE. It stores basic information about the user
(such as username and token expiration time), which is encrypted using the server's 
secret key (see the section on [Server Secret Key](#server-secret-key) above). This
token is used to authenticate the user during session token authentication as
well as API token authentication. The `auth.token` section defines when this
token expires.

When interacting with MBEE via the UI, a user's token is stored in their session
object. The `auth.session` section defines when a session expires.

For API interactions with MBEE, only the `auth.token` expiration matters since
sessions are not used. However, for UI interaction with MBEE, both the token
and session definitions matter. Whichever expires first will cause the user's
authentication to expire.
