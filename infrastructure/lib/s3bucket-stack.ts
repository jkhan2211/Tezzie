import { Duration, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path'; // Add this import





export class BucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const gamePlayAsset = path.join(__dirname, '../../game');

    const s3Bucket = new s3.Bucket(this, 'prodgames3bucket', {
      bucketName: 'tezz-final',
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: false  // Allow Amplify to access the bucket
      }),
      encryption: s3.BucketEncryption.S3_MANAGED, // Using S3-managed keys instead of KMS
    
    });

    

    new s3deploy.BucketDeployment(this, 'gameComponentAsset', {
      sources: [
        s3deploy.Source.asset(gamePlayAsset)
      ],
      destinationBucket: s3Bucket,
      destinationKeyPrefix: 'game',
      include: ['*'],
      prune: false
    });

 

    new cdk.CfnOutput(this, 'TezzGameS3Arn', {
      value: s3Bucket.bucketArn,
      exportName: 'GameS3BucketArn',
    });

  }
}
