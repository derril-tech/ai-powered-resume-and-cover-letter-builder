# Database Schema Documentation

This document describes the database schema for the AI-Powered Resume Builder application.

## Overview

The application uses PostgreSQL 16 with the following key features:
- **pgvector**: For semantic search and embeddings
- **Row Level Security (RLS)**: For multi-tenant data isolation
- **UUIDs**: For all primary keys
- **JSONB**: For flexible data storage
- **Enums**: For controlled vocabularies

## Core Tables

### Organizations
Multi-tenant architecture with organization-based data isolation.

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Users & Memberships
Users belong to organizations with different roles.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role user_role NOT NULL DEFAULT 'viewer',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Projects & Jobs
Projects contain job descriptions that users want to target.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    location VARCHAR(255),
    salary_range VARCHAR(100),
    job_type VARCHAR(50),
    status job_status DEFAULT 'draft',
    parsed_data JSONB,           -- Parsed job requirements
    embedding VECTOR(1536),      -- Semantic search vector
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Resumes & Variants
Users upload resumes and create optimized variants for specific jobs.

```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    original_content JSONB NOT NULL,
    parsed_content JSONB,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resume_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id),
    job_id UUID REFERENCES jobs(id),
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    status resume_status DEFAULT 'draft',
    ats_score DECIMAL(5,2),
    readability_score DECIMAL(5,2),
    gap_analysis JSONB,
    optimization_metadata JSONB,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cover Letters
AI-generated cover letters linked to resume variants.

```sql
CREATE TABLE cover_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_variant_id UUID NOT NULL REFERENCES resume_variants(id),
    job_id UUID REFERENCES jobs(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'professional',
    word_count INTEGER,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Assets & Exports
File storage and export management.

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    type asset_type NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_variant_id UUID REFERENCES resume_variants(id),
    cover_letter_id UUID REFERENCES cover_letters(id),
    asset_id UUID REFERENCES assets(id),
    format export_format NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Skills Taxonomy
Normalized skills database with embeddings for semantic matching.

```sql
CREATE TABLE skills_taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    aliases TEXT[],              -- Alternative names for the skill
    category VARCHAR(100),
    description TEXT,
    embedding VECTOR(1536),      -- Semantic search vector
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Comments & Audit Log
Collaboration features and audit trail.

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES comments(id),  -- Threaded comments
    resume_variant_id UUID REFERENCES resume_variants(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Indexes & Performance

The schema includes optimized indexes for common query patterns:

- Vector indexes for semantic search (jobs, skills_taxonomy)
- Foreign key indexes for joins
- Status and timestamp indexes for filtering
- Organization-scoped indexes for multi-tenant queries

## Row Level Security (RLS)

All tables have RLS enabled to ensure data isolation between organizations:

- Users can only access data within their organizations
- Membership roles control access levels
- Audit log tracks all data access and modifications

## Development Setup

To set up the database for development:

1. Start the services: `docker-compose up -d`
2. The init script will automatically create all tables and sample data
3. Connect using: `postgresql://postgres:postgres@localhost:5432/resume_builder`

## Migration Strategy

For production deployments, consider using:
- Flyway or Liquibase for schema migrations
- Database migration scripts in CI/CD pipeline
- Blue-green deployment strategy for schema changes
