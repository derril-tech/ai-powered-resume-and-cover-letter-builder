#!/usr/bin/env node

/**
 * Initialize S3 buckets for the AI-Powered Resume Builder
 * This script creates the required buckets and sets up basic configuration
 */

const { S3Client, CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getS3Config } = require('../packages/config/src/s3.ts');

async function initS3Buckets() {
    console.log('🚀 Initializing S3 buckets...');

    let config;
    try {
        // Import the config (this might need adjustment based on your setup)
        config = {
            endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
            accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
            region: process.env.S3_REGION || 'us-east-1',
            buckets: {
                uploads: process.env.S3_UPLOADS_BUCKET || 'resume-builder-uploads',
                exports: process.env.S3_EXPORTS_BUCKET || 'resume-builder-exports',
                assets: process.env.S3_ASSETS_BUCKET || 'resume-builder-assets',
            },
        };
    } catch (error) {
        console.error('❌ Failed to load S3 configuration:', error.message);
        process.exit(1);
    }

    const client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: {
            accessKeyId: config.accessKey,
            secretAccessKey: config.secretKey,
        },
        forcePathStyle: true, // Required for MinIO
    });

    const buckets = Object.values(config.buckets);

    for (const bucketName of buckets) {
        try {
            // Check if bucket already exists
            await client.send(new HeadBucketCommand({ Bucket: bucketName }));
            console.log(`✅ Bucket '${bucketName}' already exists`);
        } catch (error) {
            if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
                // Create the bucket
                await client.send(new CreateBucketCommand({
                    Bucket: bucketName,
                    CreateBucketConfiguration: {
                        LocationConstraint: config.region,
                    },
                }));
                console.log(`✅ Created bucket '${bucketName}'`);

                // Set bucket policy for public read access on exports bucket
                if (bucketName === config.buckets.exports) {
                    const policy = {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Sid: 'PublicReadGetObject',
                                Effect: 'Allow',
                                Principal: '*',
                                Action: 's3:GetObject',
                                Resource: `arn:aws:s3:::${bucketName}/*`,
                            },
                        ],
                    };

                    try {
                        await client.send(new PutBucketPolicyCommand({
                            Bucket: bucketName,
                            Policy: JSON.stringify(policy),
                        }));
                        console.log(`✅ Set public read policy for '${bucketName}'`);
                    } catch (policyError) {
                        console.warn(`⚠️  Failed to set policy for '${bucketName}':`, policyError.message);
                    }
                }
            } else {
                console.error(`❌ Error checking bucket '${bucketName}':`, error.message);
            }
        }
    }

    console.log('🎉 S3 bucket initialization complete!');
    console.log('');
    console.log('Buckets created:');
    buckets.forEach(bucket => {
        console.log(`  • ${bucket}`);
    });
}

// Run the initialization
if (require.main === module) {
    initS3Buckets().catch(error => {
        console.error('❌ Failed to initialize S3 buckets:', error);
        process.exit(1);
    });
}

module.exports = { initS3Buckets };
