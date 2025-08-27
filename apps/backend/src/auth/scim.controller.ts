import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Headers,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiHeader,
} from '@nestjs/swagger';
import { ScimService, ScimUser, ScimGroup } from './services/scim.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ReadOrganizations } from '../rbac/decorators/rbac.decorator';

@ApiTags('scim')
@Controller('scim/v2')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for SCIM authentication',
    required: true,
})
export class ScimController {
    constructor(private readonly scimService: ScimService) { }

    // User endpoints
    @Post('Users')
    @ReadOrganizations()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create user via SCIM' })
    @ApiResponse({ status: 201, description: 'User created' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async createUser(
        @Body() scimUser: ScimUser,
        @Query('orgId') organizationId: string,
    ): Promise<ScimUser> {
        return this.scimService.createUser(scimUser, organizationId);
    }

    @Get('Users/:userId')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get user via SCIM' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUser(
        @Param('userId') userId: string,
        @Query('orgId') organizationId: string,
    ): Promise<ScimUser> {
        return this.scimService.getUser(userId, organizationId);
    }

    @Put('Users/:userId')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Update user via SCIM' })
    @ApiResponse({ status: 200, description: 'User updated' })
    async updateUser(
        @Param('userId') userId: string,
        @Query('orgId') organizationId: string,
        @Body() scimUser: Partial<ScimUser>,
    ): Promise<ScimUser> {
        return this.scimService.updateUser(userId, organizationId, scimUser);
    }

    @Delete('Users/:userId')
    @ReadOrganizations()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete user via SCIM' })
    @ApiResponse({ status: 204, description: 'User deleted' })
    async deleteUser(
        @Param('userId') userId: string,
        @Query('orgId') organizationId: string,
    ): Promise<void> {
        return this.scimService.deleteUser(userId, organizationId);
    }

    @Get('Users')
    @ReadOrganizations()
    @ApiOperation({ summary: 'List users via SCIM' })
    @ApiResponse({ status: 200, description: 'Users list' })
    async listUsers(
        @Query('orgId') organizationId: string,
        @Query('filter') filter?: string,
        @Query('startIndex') startIndex?: string,
        @Query('count') count?: string,
    ) {
        return this.scimService.listUsers(
            organizationId,
            filter,
            parseInt(startIndex || '1'),
            parseInt(count || '100'),
        );
    }

    // Group endpoints
    @Post('Groups')
    @ReadOrganizations()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create group via SCIM' })
    @ApiResponse({ status: 201, description: 'Group created' })
    async createGroup(
        @Body() scimGroup: ScimGroup,
        @Query('orgId') organizationId: string,
    ): Promise<ScimGroup> {
        return this.scimService.createGroup(scimGroup, organizationId);
    }

    // SCIM Service Provider Configuration
    @Get('ServiceProviderConfig')
    @ApiOperation({ summary: 'Get SCIM service provider configuration' })
    @ApiResponse({ status: 200, description: 'Service provider config' })
    getServiceProviderConfig() {
        return {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
            id: 'scim',
            externalId: 'scim',
            meta: {
                resourceType: 'ServiceProviderConfig',
                location: '/scim/v2/ServiceProviderConfig',
            },
            documentationUri: 'https://tools.ietf.org/html/rfc7643',
            patch: {
                supported: true,
            },
            bulk: {
                supported: false,
                maxOperations: 0,
                maxPayloadSize: 0,
            },
            filter: {
                supported: true,
                maxResults: 1000,
            },
            changePassword: {
                supported: true,
            },
            sort: {
                supported: false,
            },
            etag: {
                supported: false,
            },
            authenticationSchemes: [
                {
                    type: 'oauthbearertoken',
                    name: 'OAuth Bearer Token',
                    description: 'Authentication scheme using the OAuth Bearer Token Standard',
                    specUri: 'http://tools.ietf.org/html/rfc6750',
                    documentationUri: 'http://tools.ietf.org/html/rfc6750',
                    primary: true,
                },
            ],
        };
    }

    // Resource Types
    @Get('ResourceTypes')
    @ApiOperation({ summary: 'Get SCIM resource types' })
    @ApiResponse({ status: 200, description: 'Resource types' })
    getResourceTypes() {
        return {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 2,
            startIndex: 1,
            itemsPerPage: 2,
            Resources: [
                {
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
                    id: 'User',
                    name: 'User',
                    endpoint: '/Users',
                    description: 'User Account',
                    schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
                    schemaExtensions: [],
                    meta: {
                        location: '/scim/v2/ResourceTypes/User',
                        resourceType: 'ResourceType',
                    },
                },
                {
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
                    id: 'Group',
                    name: 'Group',
                    endpoint: '/Groups',
                    description: 'Group',
                    schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
                    schemaExtensions: [],
                    meta: {
                        location: '/scim/v2/ResourceTypes/Group',
                        resourceType: 'ResourceType',
                    },
                },
            ],
        };
    }

    // Schemas
    @Get('Schemas')
    @ApiOperation({ summary: 'Get SCIM schemas' })
    @ApiResponse({ status: 200, description: 'Schemas' })
    getSchemas() {
        return {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 2,
            startIndex: 1,
            itemsPerPage: 2,
            Resources: [
                {
                    id: 'urn:ietf:params:scim:schemas:core:2.0:User',
                    name: 'User',
                    description: 'User Account',
                    attributes: [
                        {
                            name: 'userName',
                            type: 'string',
                            multiValued: false,
                            description: 'Unique identifier for the User',
                            required: true,
                            caseExact: false,
                            mutability: 'readWrite',
                            returned: 'default',
                            uniqueness: 'server',
                        },
                        {
                            name: 'name',
                            type: 'complex',
                            multiValued: false,
                            description: 'The components of the user\'s real name',
                            required: false,
                            mutability: 'readWrite',
                            returned: 'default',
                            subAttributes: [
                                {
                                    name: 'givenName',
                                    type: 'string',
                                    multiValued: false,
                                    description: 'The given name of the User',
                                    required: false,
                                    caseExact: false,
                                    mutability: 'readWrite',
                                    returned: 'default',
                                },
                                {
                                    name: 'familyName',
                                    type: 'string',
                                    multiValued: false,
                                    description: 'The family name of the User',
                                    required: false,
                                    caseExact: false,
                                    mutability: 'readWrite',
                                    returned: 'default',
                                },
                            ],
                        },
                        {
                            name: 'emails',
                            type: 'complex',
                            multiValued: true,
                            description: 'Email addresses for the user',
                            required: true,
                            mutability: 'readWrite',
                            returned: 'default',
                            subAttributes: [
                                {
                                    name: 'value',
                                    type: 'string',
                                    multiValued: false,
                                    description: 'Email addresses for the user',
                                    required: false,
                                    caseExact: false,
                                    mutability: 'readWrite',
                                    returned: 'default',
                                },
                                {
                                    name: 'type',
                                    type: 'string',
                                    multiValued: false,
                                    description: 'A label indicating the attribute\'s function',
                                    required: false,
                                    caseExact: false,
                                    mutability: 'readWrite',
                                    returned: 'default',
                                },
                                {
                                    name: 'primary',
                                    type: 'boolean',
                                    multiValued: false,
                                    description: 'A Boolean value indicating the \'primary\' or preferred attribute value',
                                    required: false,
                                    mutability: 'readWrite',
                                    returned: 'default',
                                },
                            ],
                        },
                    ],
                    meta: {
                        resourceType: 'Schema',
                        location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User',
                    },
                },
                {
                    id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
                    name: 'Group',
                    description: 'Group',
                    attributes: [
                        {
                            name: 'displayName',
                            type: 'string',
                            multiValued: false,
                            description: 'A human-readable name for the Group',
                            required: true,
                            caseExact: false,
                            mutability: 'readWrite',
                            returned: 'default',
                            uniqueness: 'none',
                        },
                        {
                            name: 'members',
                            type: 'complex',
                            multiValued: true,
                            description: 'A list of members of the Group',
                            required: false,
                            mutability: 'readWrite',
                            returned: 'default',
                            subAttributes: [
                                {
                                    name: 'value',
                                    type: 'string',
                                    multiValued: false,
                                    description: 'Identifier of the member of this Group',
                                    required: false,
                                    caseExact: false,
                                    mutability: 'immutable',
                                    returned: 'default',
                                },
                                {
                                    name: 'display',
                                    type: 'string',
                                    multiValued: false,
                                    description: 'A human-readable name for the member',
                                    required: false,
                                    caseExact: false,
                                    mutability: 'readOnly',
                                    returned: 'default',
                                },
                            ],
                        },
                    ],
                    meta: {
                        resourceType: 'Schema',
                        location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group',
                    },
                },
            ],
        };
    }
}
