#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
// import { testEnv } from '../config/test-env';
// import { prodEnv } from '../config/prod-env';
import { S3LambdaConstructAppStack } from '../lib/s3-lambda-construct-app-stack';
import * as fs from 'fs';
import * as path from 'path';

const app = new cdk.App();
const environment = app.node.tryGetContext('env') || 'test';

// Load configuration specific to the environment
const configFilePath = path.join(__dirname, `../config/config-${environment}.json`);
const config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));

// Deploy the stack with environment-specific configuration
new S3LambdaConstructAppStack(app, `MyS3LambdaStackConstruct-${environment}`, {
  sourceBucketName: config.sourceBucketName,
  destinationBucketName: config.destinationBucketName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});