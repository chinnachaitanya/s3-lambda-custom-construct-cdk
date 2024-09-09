import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

interface S3LambdaConstructProps {
  sourceBucketName: string;
  destinationBucketName: string;
}

export class S3LambdaConstruct extends Construct {
  constructor(scope: Construct, id: string, props: S3LambdaConstructProps) {
    super(scope, id);

    // Create Source S3 bucket
    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      bucketName: props.sourceBucketName,
    });

    // Create Destination S3 bucket
    const destinationBucket = new s3.Bucket(this, 'DestinationBucket', {
      bucketName: props.destinationBucketName,
    });

    // Create Lambda function
    const lambdaFunction = new lambda.Function(this, 'S3LambdaHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline(`
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { Upload } = require('@aws-sdk/lib-storage');
        const s3 = new S3Client();

        exports.handler = async function(event) {
          console.log("Event received:", JSON.stringify(event, null, 2));
          
          const sourceBucket = event.Records[0].s3.bucket.name;
          const objectKey = event.Records[0].s3.object.key;

          console.log("Source bucket:", sourceBucket);
          console.log("Object key:", objectKey);

          try {
            // Get the object from the source bucket
            const getObjectCommand = new GetObjectCommand({
              Bucket: sourceBucket,
              Key: objectKey
            });
            const getObjectResponse = await s3.send(getObjectCommand);

            console.log("Object retrieved from source bucket:", getObjectResponse);

            // Use the Upload class to handle stream uploads
            const upload = new Upload({
              client: s3,
              params: {
                Bucket: process.env.DESTINATION_BUCKET,
                Key: objectKey,
                Body: getObjectResponse.Body
              }
            });

            await upload.done();
            console.log("Successfully copied object to destination bucket:", process.env.DESTINATION_BUCKET);
          } catch (error) {
            console.error("Error occurred while copying object:", error);
          }
        };
      `),
      handler: 'index.handler',
      environment: {
        DESTINATION_BUCKET: destinationBucket.bucketName,  // Pass destination bucket name to Lambda
      },
      timeout: Duration.seconds(60),
    });

    // Attach S3 permissions to the Lambda's execution role
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:GetObject",
        "s3:PutObject"
      ],
      resources: [
        `arn:aws:s3:::${sourceBucket.bucketName}/*`,
        `arn:aws:s3:::${destinationBucket.bucketName}/*`
      ]
    }));

    // Grant Lambda permissions to read from Source and write to Destination
    sourceBucket.grantRead(lambdaFunction);
    destinationBucket.grantWrite(lambdaFunction);

    // Set up event notification for the Lambda function on object creation in the Source bucket
    sourceBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(lambdaFunction));

    // Ensure Lambda function waits for the Destination bucket to be created
    lambdaFunction.node.addDependency(destinationBucket);
  }
}
