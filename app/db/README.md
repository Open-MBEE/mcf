# Supported Database Configurations

New with MBEE v0.10.0 is the database abstraction layer. The database
abstraction layer defines a list of classes and functions which must be
implemented by each unique database strategy for MBEE to work. Below are a list
of currently supported databases and how to configure each to work with MBEE.

**Supported Databases**
  - [MongoDB w/ Mongoose](#mongodb)
  - [DynamoDB](#dynamodb)

## MongoDB

The preferred database of choice is MongoDB. MongoDB is a document based
database which stores JSON data, and Mongoose.js is used with MongoDB to provide
a schema layer on top of MongoDB. MBEE was originally designed for MongoDB, and
thus takes advantage of many of the built in features to improve speed and
performance of database queries.

#### Configuration

To configure MBEE to use Mongoose/MongoDB, the following `db` section of the
running config should be configured as follows:

```json
{
  "db": {
    "strategy": "mongoose-mongodb-strategy",
    "url": "your-db-url.com",
    "port": "27017",
    "name": "your-db-name",
    "username": "your-db-user",
    "password": "your-db-pass",
    "ssl": true,
    "ca": "your/ssl/cert.pem"
  }
}
```

The default port which MongoDB runs on is 27017, but this can be configured on
setup of MongoDB as well as configured in the MBEE config.

##### Docker
If configuring MongoDB in a Docker container, the following section must be
added to the `docker` section of the configuration file.

```json
{
  "db": {
    "enabled": true,
    "port": 27024
  }
}
```

Where the port is the port which will be exposed from the docker container.

##### MongoDB Authentication
By default, MongoDB does not require authentication. To enable authentication on
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

##### SSL
To enable SSL on MongoDB, you need a valid SSL certificate in `PEM` format and
a CA file for that certificate if necessary. To enable SSL, run MongoDB with
the following flags:

```
mongod --sslMode requireSSL \
       --sslPEMKeyFile /path/to/your/certificate.pem \
       --sslCAFile /path/to/your/certificateAuthority.pem \
       --sslAllowConnectionsWithoutCertificates
```

##### Other Useful Security-Related Flags
The `--bind_ip` flag can be used to tell MongoDB what interfaces to listen on.
For example `--bind_ip 0.0.0.0` will listen on all interfaces where
`--bind_ip 127.0.0.1` will only listen on localhost.

The `--logpath=/path/to/your/log/file.log` can be used to specify the MongoDB
log file.

##### Recommendations
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

Some additional useful references are the [MongoDB Installation Tutorial](https://docs.mongodb.com/manual/installation/#tutorial-installation)
and the [MongoDB Getting Started Guide](https://docs.mongodb.com/manual/tutorial/getting-started/).


## DynamoDB

Support for DynamoDB was added to help test out the database abstraction layer.
While stable, it has not been thoroughly tested and should be considered to be
in alpha. If working with critical information, we strongly recommend using
MongoDB as it has been thoroughly tested and is much more efficient than the
current DynamoDB implementation.

#### Configuration

To configure MBEE to use DynamoDB, the following `db` section of the running
config should be configured as follows:

```json
{
  "db": {
    "strategy": "dynamodb-strategy",
    "url": "your-db-url.com",
    "port": "8000",
    "accessKeyId": "your-aws-access-key",
    "secretAccessKey": "your-aws-secret-access-key",
    "region": "your-db-region",
    "ssl": "true/false",
    "proxy": "your-optional-proxy-url",
    "billingMode": "PAY_PER_REQUEST/PROVISIONED"
  }
}
```

The default port which DynamoDB runs on is 8000, but this can be configured on
setup of DynamoDB as well as configured in the MBEE config.

For more information about the different billing modes, please see the 
[DynamoDB Pricing Guide](https://aws.amazon.com/dynamodb/pricing/).

#### Running DynamoDB
Currently, MBEE has only been tested with a local instance of DynamoDB. There
are two requirements for running DynamoDB locally, a copy of the DynamoDB.jar
and the AWS CLI.

Before downloading DynamoDB, the AWS CLI must be setup. To install the CLI, run
the command

```bash
pip install aws-cli
```

if on Mac or Linux or download for Windows [here](https://aws.amazon.com/cli/).

Once the CLI is installed, it must be configured to work with DynamoDB. To
configure the CLI, run the command

```bash
aws configure
```

Pleas note that if using the local version of DynamoDB, the `Access Key ID`,
`Secret Access Key` and `Region` can be any value desired, as the local version
does not use these credentials.

Once the AWS CLI is configured, DynamoDB must be installed. A local version of
DynamoDB can be downloaded [here](https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz). Once it has been downloaded, the following
command must be run to start up the database:

```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

#### Local Configuration Options

When running DynamoDB locally there are a few configuration options which can
be supplied.

* -port <port-number>

    To change the port which DynamoDB is running on, supply the option
    `-port <port-number>`.
    
* -dbpath <path>
    
    Specifies the location to store the database files at.
    
    
#### Special Considerations
There are a few special considerations to take into account when using DynamoDB
with MBEE. 

The first is that the value `null` cannot be stored in string fields,
unlike MongoDB. Because of this, the value `null` must first be converted to a
string before being saved to the database. Due to this issue, users cannot
explicitly pass in the string `'null'` if the field which they are trying to
set has a default of `null`. If a user attempts this, an error will be thrown
from the `dynamodb-strategy`.

Second, blank strings are also not allowed to be stored in DynamoDB. By default,
if a string field is not provided, the default value is often times a blank
string (or null). If a blank string is passed in, the field is simply not stored
in the database. The affect of this needs to be further investigated. 

Finally due to the restrictions on indexes, queries that are not querying the
`_id` field **only**, are much slower. The current implementation uses a
database scan if not querying the `_id`, which results in order of magnitude
lengthier queries. 
