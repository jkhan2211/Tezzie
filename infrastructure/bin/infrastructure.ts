#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BucketStack } from '../lib/s3bucket-stack';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();
new BucketStack(app, 'BucketStack');
new AmplifyStack(app, 'AmplifyStack')
