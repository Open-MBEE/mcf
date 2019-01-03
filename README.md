# Model-Based Engineering Environment Core Framework (MCF)

The Model-Based Engineering Environment Core Framework or MCF is a modeling collaboration tool based on the OpenMBEE 4.0 
Reference Architecture (Execubots) and which enables the integration system models with multidisciplinary engineering data to 
form a single-source of truth for project data. It makes model
data more accessible via a web-based user interface (UI) for ease of use across
disciplines and skill sets within an organization. MCF provides a web-based UI
for team members to interact with system model data without needing to be a
systems modeler themselves.

The goal of MCF is to better communicate data across engineering organizations
by implementing the core goals of model-based systems engineering through
software tools. MCF decreases ambiguity by making a single-source of truth for
data more achievable through its RESTful API, extensible plugins, and
distributed services.

## Quick Start

### Prerequisites
MCF is designed so that the only dependency to get started is Node.js and NPM.
NPM comes with Node.js, all you need to do is make sure you can install packages
with NPM and you can get started.

You'll also need an instance MongoDB. If you don't have a database already set
up, please see the [MongoDB Installation Tutorial](https://docs.mongodb.com/manual/installation/#tutorial-installation)
and the [MongoDB Getting Started Guide](https://docs.mongodb.com/manual/tutorial/getting-started/)
for up-to-date documentation on MongoDB.

Finally, you need to clone the MCF code by running:
`git clone https://github.com/Open-MBEE/mcf.git `. And enter the directory
with `cd mbee`.

### Configuring MCF
MCF stores all its configuration information in the `config` directory. By
default, it uses the `default.cfg` file, but that can be changed by setting the
`MBEE_ENV` environment variable. On startup, MCF will load the configuration
file with a name matching the `MBEE_ENV` environment variable. For example,
if `MBEE_ENV=production`, MCF will look for the file `config/production.cfg`.

The MCF config is simply a JSON file that allows comments. MCF is designed to
be largely parameterized by this config file. In this config file you will have
options to alter the server ports, Docker configurations, enabling and
disabling components, and swapping out authentication schemes. For a
more detailed explanation of the fields supported by the config file, see the
detailed comments provided [example.cfg](config/example.cfg).

To get started, you should edit the [default.cfg](config/default.cfg) to support
your configuration.

### Modular Authentication
MCF supports modular authentication strategies. These authentication modules
have well defined interfaces that can be dynamically replaced. This allows you
to write a custom authentication module to accommodate the needs of your
company or organization without having to make major changes to MCF. You can
then specify which authentication module to use in the MCF config file.

Alter the `auth.strategy` field in the [default.cfg](config/default.cfg)
to use your authentication strategy.

### Build and run
1. Install dependencies by running `yarn install`. If you don't have `yarn`, 
install it by running `npm install -g yarn`. 
2. Build: `node mbee build`. 
3. Run: `node mbee start`

## Test

A test framework for the MBEE Core Framework is under development and 
will be made public in an upcoming release.

## ESLint and EditorConfig

MCF is configured to use ESLint. Run `node mbee lint`. The rule set for ESLint
is defined in the [.eslintrc](.eslintrc) file and aligns with our style guide.

We also recommend using EditorConfig. The [.editorconfig](.editorconfig) file
in the project's root directory will help enforce some of those style 
conventions.

## Documentation

### API Documentation
The API documentation is generated with Swagger and Swagger-JSDoc.
The API routes, which are defined in [app/api-routes.js](app/api-routes.js),
are documented via Swagger-JSDoc block comments. All API documentation and
API definition occurs in that file.

The rendered Swagger documentation can be viewed via the at the `/doc/api` route
on a running MCF server.

### Developer Documentation
Developer documentation created using [JSDoc](http://usejsdoc.org/).
The developer documentation is generated and rendered during the build process.
It can be viewed at the `/doc/developer` route on a running MCF server.

### User Documentation
This is currently under development and will be made available in an upcoming
release.

## Public Release Info
Approved for public release per PIRA #SSS201809050.
