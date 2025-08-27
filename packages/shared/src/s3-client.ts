import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Config, validateS3Config } from '@ai-resume-builder/config';
import { Readable } from 'stream';

export interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: 'private' | 'public-read';
}

export interface SignedUrlOptions {
    expiresIn?: number; // seconds
    contentType?: string;
}

export class S3Service {
    private client: S3Client;
    private config: ReturnType<typeof getS3Config>;

    constructor() {
        this.config = getS3Config();
        validateS3Config(this.config);

        this.client = new S3Client({
            endpoint: this.config.endpoint,
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKey,
                secretAccessKey: this.config.secretKey,
            },
            forcePathStyle: true, // Required for MinIO compatibility
        });
    }

    /**
     * Upload a file to S3
     */
    async uploadFile(
        bucket: string,
        key: string,
        body: Buffer | Uint8Array | string | Readable,
        options: UploadOptions = {}
    ): Promise<void> {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: options.contentType,
            Metadata: options.metadata,
            ACL: options.acl,
        });

        await this.client.send(command);
    }

    /**
     * Download a file from S3
     */
    async downloadFile(bucket: string, key: string): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        const response = await this.client.send(command);
        if (!response.Body) {
            throw new Error(`No body found for object ${key} in bucket ${bucket}`);
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const reader = response.Body as Readable;

        return new Promise((resolve, reject) => {
            reader.on('data', (chunk) => chunks.push(chunk));
            reader.on('error', reject);
            reader.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Delete a file from S3
     */
    async deleteFile(bucket: string, key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        await this.client.send(command);
    }

    /**
     * Check if a file exists in S3
     */
    async fileExists(bucket: string, key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: bucket,
                Key: key,
            });

            await this.client.send(command);
            return true;
        } catch (error: any) {
            if (error.name === 'NotFound') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Generate a signed URL for uploading a file
     */
    async generateUploadUrl(
        bucket: string,
        key: string,
        options: SignedUrlOptions = {}
    ): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: options.contentType,
        });

        const signedUrl = await getSignedUrl(this.client, command, {
            expiresIn: options.expiresIn || 3600, // 1 hour default
        });

        return signedUrl;
    }

    /**
     * Generate a signed URL for downloading a file
     */
    async generateDownloadUrl(
        bucket: string,
        key: string,
        options: SignedUrlOptions = {}
    ): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        const signedUrl = await getSignedUrl(this.client, command, {
            expiresIn: options.expiresIn || 3600, // 1 hour default
        });

        return signedUrl;
    }

    /**
     * List objects in a bucket with optional prefix
     */
    async listObjects(bucket: string, prefix?: string): Promise<string[]> {
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
        });

        const response = await this.client.send(command);
        return response.Contents?.map(obj => obj.Key || '').filter(Boolean) || [];
    }

    /**
     * Get the public URL for a file (if bucket is public)
     */
    getPublicUrl(bucket: string, key: string): string {
        return `${this.config.publicUrl}/${bucket}/${key}`;
    }

    /**
     * Get the configured buckets
     */
    get buckets() {
        return this.config.buckets;
    }
}

// Export singleton instance
export const s3Service = new S3Service();
