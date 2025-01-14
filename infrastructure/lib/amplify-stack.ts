import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the existing S3 bucket using its ARN
    const s3GameBucket = s3.Bucket.fromBucketArn(
      this,
      'TezzGameS3Arn',
      cdk.Fn.importValue('GameS3BucketArn') // Import the ARN from the BucketStack
    );

    // Create the Amplify App
    const amplifyApp = new amplify.CfnApp(this, 'TezzGameApp', {
      name: 'tezz-web-app',

      // Basic auth for the app
      basicAuthConfig: {
        enableBasicAuth: false,
      },

      // No need for buildSpec as we're using pre-uploaded static files
    });

    // Create a branch (e.g., main)
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'tezzwebapp',
      stage: 'PRODUCTION',
      enableAutoBuild: false, // No build needed for static website
    });

    // Create IAM role for Amplify to access S3
    const amplifyRole = new iam.Role(this, 'AmplifyS3Role', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
    });

    // Add S3 read permissions to the role
    amplifyRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [
          s3GameBucket.bucketArn,
          `${s3GameBucket.bucketArn}/*`, // Include all files in the bucket
        ],
      })
    );

    // Output the Amplify App URL
    new cdk.CfnOutput(this, 'AmplifyAppURL', {
      value: `https://${mainBranch.attrBranchName}.${amplifyApp.attrDefaultDomain}`,
    });
  }
}
