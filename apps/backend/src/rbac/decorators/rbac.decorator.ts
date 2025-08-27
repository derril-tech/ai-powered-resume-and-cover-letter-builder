import { SetMetadata } from '@nestjs/common';
import { RbacMetadata } from '../guards/rbac.guard';

export const RBAC = (resource: string, action: string, organizationId?: string) => {
    return SetMetadata('rbac', { resource, action, organizationId } as RbacMetadata);
};

// Organization permissions
export const ReadOrganizations = () => RBAC('organizations', 'read');
export const WriteOrganizations = () => RBAC('organizations', 'write');
export const DeleteOrganizations = () => RBAC('organizations', 'delete');

// User permissions
export const ReadUsers = () => RBAC('users', 'read');
export const WriteUsers = () => RBAC('users', 'write');
export const DeleteUsers = () => RBAC('users', 'delete');

// Membership permissions
export const ReadMemberships = () => RBAC('memberships', 'read');
export const WriteMemberships = () => RBAC('memberships', 'write');
export const DeleteMemberships = () => RBAC('memberships', 'delete');

// Project permissions
export const ReadProjects = () => RBAC('projects', 'read');
export const WriteProjects = () => RBAC('projects', 'write');
export const DeleteProjects = () => RBAC('projects', 'delete');

// Job permissions
export const ReadJobs = () => RBAC('jobs', 'read');
export const WriteJobs = () => RBAC('jobs', 'write');
export const DeleteJobs = () => RBAC('jobs', 'delete');

// Resume permissions
export const ReadResumes = () => RBAC('resumes', 'read');
export const WriteResumes = () => RBAC('resumes', 'write');
export const DeleteResumes = () => RBAC('resumes', 'delete');

// Variant permissions
export const ReadVariants = () => RBAC('variants', 'read');
export const WriteVariants = () => RBAC('variants', 'write');
export const DeleteVariants = () => RBAC('variants', 'delete');

// Cover letter permissions
export const ReadCoverLetters = () => RBAC('cover-letters', 'read');
export const WriteCoverLetters = () => RBAC('cover-letters', 'write');
export const DeleteCoverLetters = () => RBAC('cover-letters', 'delete');

// Export permissions
export const ReadExports = () => RBAC('exports', 'read');
export const WriteExports = () => RBAC('exports', 'write');
export const DeleteExports = () => RBAC('exports', 'delete');

// Asset permissions
export const ReadAssets = () => RBAC('assets', 'read');
export const WriteAssets = () => RBAC('assets', 'write');
export const DeleteAssets = () => RBAC('assets', 'delete');

// Comment permissions
export const ReadComments = () => RBAC('comments', 'read');
export const WriteComments = () => RBAC('comments', 'write');
export const DeleteComments = () => RBAC('comments', 'delete');

// Role-specific decorators
export const OwnerOnly = () => RBAC('organizations', 'delete'); // Only owners can delete orgs
export const AdminOnly = () => RBAC('users', 'delete'); // Only admins can delete users
export const EditorAccess = () => RBAC('projects', 'write'); // Editors can write projects
export const ViewerAccess = () => RBAC('projects', 'read'); // Viewers can read projects
