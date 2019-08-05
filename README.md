# Model-Based Engineering Environment
 
The Model-Based Engineering Environment (MBEE) is a modeling collaboration software
that integrates system models with multidisciplinary engineering data and tools.
This enables system models to be a single-source of truth. MBEE allows for model
data to be more accessible across disciplines and skill sets via web-based UI.
The UI enables users to interact with system model data without needing to be a
systems modeler.

MBEE's mission is to better communicate data across engineering organizations
by implementing the core goals of model-based systems engineering through
software tools. MBEE decreases ambiguity by making a single-source of truth for
data more achievable through its RESTful API, extensible plugins, and
distributed services.

## Prerequisites

**Node.js**
MBEE's only dependency to get started is Node.js and NPM. NPM comes with
Node.js; just install packages with NPM to get started. To start up MBEE,
node version 10.15.0 or greater is required.
See [nodejs.org](https://nodejs.org/en/) for information on Node.js.

**MongoDB**
You'll also need an instance of MongoDB. If you don't have a database already
set up, please see the [MongoDB Installation Tutorial](https://docs.mongodb.com/manual/installation/#tutorial-installation)
and the [MongoDB Getting Started Guide](https://docs.mongodb.com/manual/tutorial/getting-started/)
for up-to-date documentation on MongoDB.

**Source Code**
1. Clone the MBEE code by running: `git clone https://github.com/lmco/mbee.git`. 
2. Enter the directory with `cd mbee`.

## Getting Started

1. Install dependencies and build by running `yarn install` or `npm install`.
2. Run MBEE by running `node mbee start`. 

## Documentation
See the Flight Manual (source located at [`./doc`](./doc))
for all encompassing user manual of MBEE.

You can view the MBEE Flight Manual at the `/doc/flight-manual` route on a
running MBEE server.
Included documentation:
- Flight Manual
  - API Documentation
  - Developer Documentation
  - Test Framework Documentation
  - Docker Set Up Documentation

## Reporting Vulnerabilities and Bugs

If an issue is identified in MBEE, please email
[mbee-software.fc-space@lmco.com](mailto:mbee-software.fc-space@lmco.com).
