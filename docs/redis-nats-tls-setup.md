# Redis and NATS TLS Setup

This document describes the TLS-enabled setup for Redis and NATS in the AI-Powered Resume Builder application.

## Overview

Both Redis and NATS are configured with TLS encryption for secure communication between services. This is essential for production deployments and recommended for development.

## Certificate Generation

### Development Certificates

For development, self-signed certificates are generated using the provided script:

```bash
# Generate TLS certificates
./scripts/generate-certs.sh

# Or on Windows PowerShell
# bash scripts/generate-certs.sh
```

This creates the following files in `docker/certs/`:
- `ca.crt` - Certificate Authority certificate
- `ca.key` - Certificate Authority private key
- `server.crt` - Server certificate
- `server.key` - Server private key
- `client.crt` - Client certificate (for applications)
- `client.key` - Client private key
- `dhparam.pem` - DH parameters for Redis
- `redis.acl` - Redis ACL configuration

### Production Certificates

For production, use certificates from a trusted Certificate Authority:
- Obtain TLS certificates for your domain
- Place them in the `docker/certs/` directory
- Update the service configurations as needed

## Redis TLS Configuration

### Service Configuration

Redis is configured with TLS in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"    # Non-TLS port (development)
    - "6380:6380"    # TLS port
  volumes:
    - ./docker/certs:/etc/ssl/certs:ro
    - ./docker/redis/redis.conf:/etc/redis/redis.conf:ro
  command: ["redis-server", "/etc/redis/redis.conf"]
```

### Redis Configuration (`docker/redis/redis.conf`)

Key TLS settings:
- `tls-port 6380` - TLS port
- `tls-cert-file` - Server certificate
- `tls-key-file` - Server private key
- `tls-ca-cert-file` - CA certificate
- `tls-dh-params-file` - DH parameters
- `requirepass` - Password protection

### Connecting to Redis

#### From Application Code

```typescript
import { redisService } from '@ai-resume-builder/shared';

// The service automatically handles TLS configuration
await redisService.connect();
await redisService.set('key', 'value');
const value = await redisService.get('key');
```

#### Manual Connection

```typescript
import { createClient } from 'redis';

const client = createClient({
  host: 'localhost',
  port: 6380,
  password: 'redis_password_for_development',
  tls: {
    ca: fs.readFileSync('docker/certs/ca.crt'),
    rejectUnauthorized: false, // For development only
  },
});

await client.connect();
```

## NATS TLS Configuration

### Service Configuration

NATS is configured with TLS in `docker-compose.yml`:

```yaml
nats:
  image: nats:2.10-alpine
  ports:
    - "4222:4222"    # Non-TLS port
    - "4443:4443"    # TLS port
  volumes:
    - ./docker/certs:/etc/ssl/certs:ro
  command: [
    "nats-server",
    "--jetstream",
    "--store_dir", "/data",
    "--tls",
    "--tlscert", "/etc/ssl/certs/server.crt",
    "--tlskey", "/etc/ssl/certs/server.key",
    "--tls-ca", "/etc/ssl/certs/ca.crt"
  ]
```

### Connecting to NATS

#### From Application Code

```typescript
import { connect } from 'nats';
import { getNatsConfig } from '@ai-resume-builder/config';

const config = getNatsConfig();

const nc = await connect({
  servers: config.servers,
  tls: config.tls.enabled ? {
    ca: config.tls.ca,
    rejectUnauthorized: config.tls.rejectUnauthorized,
  } : undefined,
  user: config.user,
  pass: config.password,
});
```

## Environment Variables

Configure TLS settings using environment variables:

### Redis
```bash
REDIS_TLS_ENABLED=true
REDIS_TLS_CA=/path/to/ca.crt
REDIS_TLS_CERT=/path/to/client.crt
REDIS_TLS_KEY=/path/to/client.key
REDIS_PASSWORD=your-secure-password
```

### NATS
```bash
NATS_TLS_ENABLED=true
NATS_TLS_CA=/path/to/ca.crt
NATS_TLS_CERT=/path/to/client.crt
NATS_TLS_KEY=/path/to/client.key
NATS_USER=your-user
NATS_PASSWORD=your-password
```

## Security Considerations

### Development
- Self-signed certificates are acceptable
- `rejectUnauthorized: false` can be used for testing
- Use strong passwords even in development

### Production
- Always use certificates from trusted CA
- Set `rejectUnauthorized: true`
- Use strong, unique passwords
- Rotate certificates regularly
- Implement certificate pinning if appropriate

### Network Security
- Restrict access to Redis/NATS ports
- Use firewall rules
- Implement rate limiting
- Monitor connection attempts

## Testing TLS Connections

### Redis
```bash
# Test non-TLS connection
redis-cli -h localhost -p 6379 ping

# Test TLS connection
redis-cli --tls --cacert docker/certs/ca.crt -h localhost -p 6380 -a redis_password_for_development ping
```

### NATS
```bash
# Test non-TLS connection
nats pub test "Hello World"

# Test TLS connection
nats --server tls://localhost:4443 --tlsca docker/certs/ca.crt pub test "Hello World"
```

## Troubleshooting

### Common Issues

1. **Certificate Verification Errors**
   - Ensure CA certificate is correct
   - Check certificate validity dates
   - Verify certificate chain

2. **Connection Refused**
   - Check if services are running
   - Verify port configurations
   - Check firewall settings

3. **Authentication Errors**
   - Verify passwords match
   - Check Redis ACL configuration
   - Ensure user credentials are correct

### Logs

Check service logs for TLS-related errors:

```bash
# Redis logs
docker-compose logs redis

# NATS logs
docker-compose logs nats
```

## Performance Impact

TLS adds some overhead:
- Initial handshake latency
- Encryption/decryption CPU usage
- Memory usage for TLS session data

For high-throughput scenarios, consider:
- Connection pooling
- Session resumption
- Hardware acceleration for encryption

## Migration from Non-TLS

To migrate existing deployments:

1. Generate certificates
2. Update configurations
3. Restart services with TLS enabled
4. Update application configurations
5. Test thoroughly before going to production
