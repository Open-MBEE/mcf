# Supported Artifact Configurations

MBEE supports two types of Artifact storage strategies for blob (arbitrary
binary files) storage. All artifact strategies require specific functions to be
implemented to work with MBEE. Each strategy may require different components
for configuration. 

Below are a list of currently supported artifact strategies and information on
how to configure each to work with MBEE.

### Local Strategy Configuration
The local artifact strategy stores blobs locally on the same server that MBEE is
running on. 

To configure MBEE to use the local strategy, the `artifact` section of the
running MBEE config should appear as follows:

```json
"artifact": {
  "strategy": "local-strategy"
}
```

### Amazon S3 Strategy Configuration
The S3 artifact strategy requires an existing Amazon S3 account, bucket, and 
user with permissions to access the bucket via an Access Key ID and Secret 
Access Key.

To configure MBEE to use the remote S3 strategy, the `artifact` section of the
running MBEE config should appear as follows:

```json
"artifact": {
    "strategy": "s3-strategy",
    "s3": {
      "accessKeyId": "your-access-key-id",
      "secretAccessKey": "your-secret-access-key",
      "region": "your-region",
      "Bucket": "your-bucket-name",
      "ca": "your/ssl/cert.pem",
      "proxy": "http://your-proxy.com:80"
    }
  }
```

