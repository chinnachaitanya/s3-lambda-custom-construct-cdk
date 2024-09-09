import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { S3LambdaConstruct } from './s3-lambda-construct';

interface S3LambdaStackProps extends cdk.StackProps {
  sourceBucketName: string;
  destinationBucketName: string;
}

export class S3LambdaConstructAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3LambdaStackProps) {
    super(scope, id, props);

    // Use the reusable construct
    new S3LambdaConstruct(this, 'S3LambdaConstruct', {
      sourceBucketName: props.sourceBucketName,
      destinationBucketName: props.destinationBucketName,
    });
  }
}
