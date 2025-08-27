-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE job_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE resume_status AS ENUM ('draft', 'optimized', 'approved', 'rejected');
CREATE TYPE export_format AS ENUM ('pdf', 'docx', 'md', 'txt');
CREATE TYPE asset_type AS ENUM ('resume', 'cover_letter', 'export');

-- Create organizations table
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

-- Create users table
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

-- Create memberships table (junction table for users and organizations)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table (job descriptions)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    location VARCHAR(255),
    salary_range VARCHAR(100),
    job_type VARCHAR(50),
    status job_status DEFAULT 'draft',
    parsed_data JSONB,
    embedding VECTOR(1536),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_content JSONB NOT NULL,
    parsed_content JSONB,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create resume_variants table
CREATE TABLE resume_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
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

-- Create cover_letters table
CREATE TABLE cover_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_variant_id UUID NOT NULL REFERENCES resume_variants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'professional',
    word_count INTEGER,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assets table (for file storage)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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

-- Create exports table
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_variant_id UUID REFERENCES resume_variants(id) ON DELETE SET NULL,
    cover_letter_id UUID REFERENCES cover_letters(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    format export_format NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    resume_variant_id UUID REFERENCES resume_variants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create skills_taxonomy table
CREATE TABLE skills_taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    aliases TEXT[],
    category VARCHAR(100),
    description TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_organization_id ON resumes(organization_id);
CREATE INDEX idx_resume_variants_resume_id ON resume_variants(resume_id);
CREATE INDEX idx_resume_variants_job_id ON resume_variants(job_id);
CREATE INDEX idx_resume_variants_status ON resume_variants(status);
CREATE INDEX idx_cover_letters_resume_variant_id ON cover_letters(resume_variant_id);
CREATE INDEX idx_cover_letters_job_id ON cover_letters(job_id);
CREATE INDEX idx_assets_organization_id ON assets(organization_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_exports_resume_variant_id ON exports(resume_variant_id);
CREATE INDEX idx_exports_cover_letter_id ON exports(cover_letter_id);
CREATE INDEX idx_comments_resume_variant_id ON comments(resume_variant_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_skills_taxonomy_name ON skills_taxonomy(name);
CREATE INDEX idx_skills_taxonomy_embedding ON skills_taxonomy USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_audit_log_organization_id ON audit_log(organization_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - will be expanded based on business logic)
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (id = current_user_id());

CREATE POLICY "Organizations are visible to members" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.organization_id = organizations.id
            AND memberships.user_id = current_user_id()
        )
    );

CREATE POLICY "Members can view membership data" ON memberships
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Project access based on organization membership" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.organization_id = projects.organization_id
            AND memberships.user_id = current_user_id()
        )
    );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resume_variants_updated_at BEFORE UPDATE ON resume_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cover_letters_updated_at BEFORE UPDATE ON cover_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exports_updated_at BEFORE UPDATE ON exports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_taxonomy_updated_at BEFORE UPDATE ON skills_taxonomy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for development
INSERT INTO organizations (name, slug, description) VALUES
('Demo Company', 'demo-company', 'Demo organization for testing');

INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES
('admin@demo.com', '$2b$10$dummy.hash.for.development', 'Admin', 'User', true);

-- Get the IDs for the inserted records
DO $$
DECLARE
    org_id UUID;
    user_id UUID;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = 'demo-company';
    SELECT id INTO user_id FROM users WHERE email = 'admin@demo.com';

    INSERT INTO memberships (user_id, organization_id, role, joined_at) VALUES
    (user_id, org_id, 'owner', NOW());
END $$;
