# S3/R2 Storage Setup

This document describes the S3-compatible storage setup for the AI-Powered Resume Builder application.

## Overview

The application uses S3-compatible storage for:
- **Uploads**: User-uploaded resume files (PDF, DOCX)
- **Exports**: Generated resume exports (PDF, DOCX, MD)
- **Assets**: Static assets, templates, and other files

## Development Setup (MinIO)

For development, we use MinIO which provides S3-compatible storage:

### Starting MinIO
```bash
docker-compose up -d minio
```

MinIO will be available at:
- **Console**: http://localhost:9001
- **API**: http://localhost:9000
- **Credentials**: minioadmin / minioadmin

### Initializing Buckets

Run the bucket initialization script:
```bash
pnpm run init:s3
```

This will create the following buckets:
- `resume-builder-uploads` - For user uploads
- `resume-builder-exports` - For generated exports (public read access)
- `resume-builder-assets` - For static assets

## Configuration

Configure S3 settings using environment variables:

```bash
# Development (MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1
S3_UPLOADS_BUCKET=resume-builder-uploads
S3_EXPORTS_BUCKET=resume-builder-exports
S3_ASSETS_BUCKET=resume-builder-assets

# Production (AWS S3 or Cloudflare R2)
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=auto
S3_UPLOADS_BUCKET=your-uploads-bucket
S3_EXPORTS_BUCKET=your-exports-bucket
S3_ASSETS_BUCKET=your-assets-bucket
```

## Usage

### Uploading Files

```typescript
import { s3Service } from '@ai-resume-builder/shared';

// Upload a file
await s3Service.uploadFile(
  s3Service.buckets.uploads,
  'user-123/resume.pdf',
  fileBuffer,
  { contentType: 'application/pdf' }
);

// Generate signed upload URL
const uploadUrl = await s3Service.generateUploadUrl(
  s3Service.buckets.uploads,
  'user-123/resume.pdf',
  { expiresIn: 3600, contentType: 'application/pdf' }
);
```

### Downloading Files

```typescript
// Download a file
const fileBuffer = await s3Service.downloadFile(
  s3Service.buckets.uploads,
  'user-123/resume.pdf'
);

// Generate signed download URL
const downloadUrl = await s3Service.generateDownloadUrl(
  s3Service.buckets.exports,
  'export-456/resume.pdf',
  { expiresIn: 3600 }
);
```

### File Management

```typescript
// Check if file exists
const exists = await s3Service.fileExists(
  s3Service.buckets.uploads,
  'user-123/resume.pdf'
);

// Delete a file
await s3Service.deleteFile(
  s3Service.buckets.uploads,
  'user-123/old-resume.pdf'
);

// List files with prefix
const files = await s3Service.listObjects(
  s3Service.buckets.uploads,
  'user-123/'
);
```

## Security Considerations

### Access Control
- **Uploads bucket**: Private access, signed URLs for upload/download
- **Exports bucket**: Public read access for sharing exported resumes
- **Assets bucket**: Private access, served through CDN in production

### File Validation
- Validate file types and sizes before upload
- Scan uploaded files for malware (consider implementing)
- Use signed URLs with expiration times

### Data Encryption
- Files are encrypted at rest in S3/R2
- Use HTTPS for all S3 communications
- Consider client-side encryption for sensitive documents

## Production Deployment

### AWS S3
1. Create S3 buckets in your AWS account
2. Configure bucket policies for appropriate access
3. Set up CloudFront CDN for assets and exports
4. Use IAM roles with least privilege

### Cloudflare R2
1. Create R2 buckets in Cloudflare dashboard
2. Generate API tokens with appropriate permissions
3. Configure CORS policies
4. Set up Cloudflare Workers for additional processing

### CDN Integration
For production, consider using a CDN:
- Cloudflare CDN for R2
- AWS CloudFront for S3
- Serve exported resumes with appropriate cache headers

## Monitoring

Monitor S3 usage and costs:
- Set up billing alerts for S3 usage
- Monitor bucket sizes and growth
- Track API call patterns
- Set up lifecycle policies for cost optimization

## Backup Strategy

- Enable S3 versioning for critical buckets
- Set up cross-region replication for disaster recovery
- Implement regular backup scripts
- Test restore procedures regularly
