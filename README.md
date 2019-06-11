# Model-Based Engineering Environment
 
The Model-Based Engineering Environment (MBEE) is a modeling collaboration software
that integrates system models with multidisciplinary engineering data and tools.
This enables system models to be a single-source of truth. MMS4 allows for model
data to be more accessible across disciplines and skill sets via web-based UI.
The UI enables users to interact with system model data without needing to be a
systems modeler.

MBEE's mission is to better communicate data across engineering organizations
by implementing the core goals of model-based systems engineering through
software tools. MMS4 decreases ambiguity by making a single-source of truth for
data more achievable through its RESTful API, extensible plugins, and
distributed services.

## Prerequisites

**Node.js**
MMS4's only dependency to get started is Node.js and NPM. NPM comes with
Node.js; just install packages with NPM to get started. To start up MMS4,
node version 10.15.0 or greater is required.
See [nodejs.org](https://nodejs.org/en/) for information on Node.js.

**MongoDB**
You'll also need an instance of MongoDB. If you don't have a database already
set up, please see the [MongoDB Installation Tutorial](https://docs.mongodb.com/manual/installation/#tutorial-installation)
and the [MongoDB Getting Started Guide](https://docs.mongodb.com/manual/tutorial/getting-started/)
for up-to-date documentation on MongoDB.

**Source Code**
1. Clone the MMS4 code by running: `git clone https://github.com/lmco/mbee.git`. 
2. Enter the directory with `cd mbee`.

## Getting Started

1. Install dependencies and build by running `yarn install` or `npm install`.
2. Run MMS4 by running `node mbee start`. 

## Documentation
See the Flight Manual (source located at [`./doc`](./doc))
for all encompassing user manual of MMS4.

You can view the MBEE Flight Manual at the `/doc/flight-manual` route on a
running MMS4 server.
Included documentation:
- Flight Manual
  - API Documentation
  - Developer Documentation
  - Test Framework Documentation
  - Docker Set Up Documentation

## Known Plugins List
This is a list of repositories that contain plugins or example plugins for MMS4:

[Official Sandbox Plugin|https://github.com/lmco/mbee-plugin-sandbox]
[MBEE Requirements Plugin|https://github.com/josh-kaplan/mbee-requirements-plugin]

## Reporting Bugs

Please report issues via the OpenMBEE Community JIRA, or contact us through the OpenMBEE
community.
