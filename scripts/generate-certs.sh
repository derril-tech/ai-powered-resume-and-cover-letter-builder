#!/bin/bash

# Generate self-signed TLS certificates for development
# This script creates certificates for Redis and NATS TLS connections

set -e

CERT_DIR="docker/certs"
DAYS=365
SUBJECT="/C=US/ST=Development/L=Dev/O=AI Resume Builder/CN=localhost"

echo "🔐 Generating TLS certificates for development..."

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate CA private key and certificate
echo "📝 Generating CA certificate..."
openssl genpkey -algorithm RSA -out "$CERT_DIR/ca.key" -pkcs8
openssl req -new -x509 -key "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" -days $DAYS -subj "$SUBJECT"

# Generate server private key and certificate signing request
echo "📝 Generating server certificate..."
openssl genpkey -algorithm RSA -out "$CERT_DIR/server.key" -pkcs8
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -subj "$SUBJECT"

# Create server certificate extensions file
cat > "$CERT_DIR/server.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = redis
DNS.3 = nats
IP.1 = 127.0.0.1
EOF

# Sign server certificate with CA
openssl x509 -req -in "$CERT_DIR/server.csr" -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial -out "$CERT_DIR/server.crt" -days $DAYS -extfile "$CERT_DIR/server.ext"

# Generate client certificate (for applications connecting to Redis/NATS)
echo "📝 Generating client certificate..."
openssl genpkey -algorithm RSA -out "$CERT_DIR/client.key" -pkcs8
openssl req -new -key "$CERT_DIR/client.key" -out "$CERT_DIR/client.csr" -subj "/C=US/ST=Development/L=Dev/O=AI Resume Builder Client/CN=client"

# Create client certificate extensions file
cat > "$CERT_DIR/client.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# Sign client certificate with CA
openssl x509 -req -in "$CERT_DIR/client.csr" -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial -out "$CERT_DIR/client.crt" -days $DAYS -extfile "$CERT_DIR/client.ext"

# Create DH parameters for Redis
echo "📝 Generating DH parameters for Redis..."
openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048

# Create Redis ACL users file
cat > "$CERT_DIR/redis.acl" << EOF
user default off
user app on #password ~* allcommands allkeys
user worker on #workerpassword ~* allcommands allkeys
EOF

# Set appropriate permissions
chmod 600 "$CERT_DIR"/*.key
chmod 644 "$CERT_DIR"/*.crt
chmod 644 "$CERT_DIR"/*.pem

# Clean up temporary files
rm "$CERT_DIR/server.csr" "$CERT_DIR/client.csr" "$CERT_DIR/server.ext" "$CERT_DIR/client.ext"

echo "✅ TLS certificates generated successfully!"
echo ""
echo "Generated files:"
echo "  • $CERT_DIR/ca.crt - CA certificate"
echo "  • $CERT_DIR/ca.key - CA private key"
echo "  • $CERT_DIR/server.crt - Server certificate"
echo "  • $CERT_DIR/server.key - Server private key"
echo "  • $CERT_DIR/client.crt - Client certificate"
echo "  • $CERT_DIR/client.key - Client private key"
echo "  • $CERT_DIR/dhparam.pem - DH parameters for Redis"
echo "  • $CERT_DIR/redis.acl - Redis ACL configuration"
echo ""
echo "⚠️  These certificates are for development only!"
echo "   For production, use certificates from a trusted CA."
