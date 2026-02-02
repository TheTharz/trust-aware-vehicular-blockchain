#!/bin/bash
# Find the private key file
echo "Searching for Admin private key..."
KEYSTORE_PATH="../../test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore"

if [ ! -d "$KEYSTORE_PATH" ]; then
    echo "Error: Keystore directory not found at $KEYSTORE_PATH"
    echo "Please make sure the test-network is running."
    exit 1
fi

PRIV_KEY=$(ls $KEYSTORE_PATH | grep _sk | head -1)

if [ -z "$PRIV_KEY" ]; then
    echo "Error: Private key not found in $KEYSTORE_PATH"
    exit 1
fi

echo "Found key: $PRIV_KEY"

# Generate config.json from template
echo "Generating config.json..."
sed "s/ADMIN_PRIVATE_KEY/${PRIV_KEY}/g" config_template.json > config.json

# Start Docker Compose
echo "Starting Hyperledger Explorer..."
docker compose up -d

echo "Hyperledger Explorer started!"
echo "Access it at http://localhost:8080"
