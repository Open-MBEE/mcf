# Model Management System 4.0

The Model Management System or MMS is a modeling collaboration backend and supporting UI
that stores and integrates system models with multidisciplinary engineering data to enable
the system model to be a single-source of truth project data. It makes model
data more accessible via RESTful API's for ease of use across
disciplines and skill sets within an organization. MMS4 also provides a web-based UI framework
for team members to manage system model data without needing to interact with a modeling tool.

The goal of MBEE overal is to better communicate data across engineering organizations
by implementing the core goals of model-based systems engineering through
software tools. MMS4 enables a single-source of truth for model
data more achievable through its RESTful API, extensible plugins, and
distributed services.

## Prerequisites

**Node.js**
MMS4's only dependency to get started is Node.js and NPM. NPM comes with
Node.js, just install packages with NPM to get started.
See [nodejs.org](https://nodejs.org/en/) for information on Node.js.

**MongoDB**
You'll also need an instance of MongoDB. If you don't have a database already
set up, please see the [MongoDB Installation Tutorial](https://docs.mongodb.com/manual/installation/#tutorial-installation)
and the [MongoDB Getting Started Guide](https://docs.mongodb.com/manual/tutorial/getting-started/)
for up-to-date documentation on MongoDB.

**Source Code**
1. Clone the MMS4 code by running: `git clone https://github.com/Open-MBEE/mms4.git`.
2. Enter the directory with `cd mbee`.

## Getting Started

1. Install dependencies and build by running `yarn install` or `npm install`.
2. Run MMS4 by running `node mbee start`.

## Documentation
See the Flight Manual (source located at [`./doc`](./doc))
for all encompassing user manual of MMS4.

You can view the MMS4 Flight Manual at the `/doc/flight-manual` route on a
running MMS4 server.
Included documentation:
- Flight Manual
  - API Documentation
  - Developer Documentation
  - Test Framework Documentation
  - Docker Set Up Documentation

## Public Release Info
Approved for public release per PIRA #SSS201809050.
