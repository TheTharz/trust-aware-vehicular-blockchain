<!-- filepath: /home/tharindu/installations/fabric-samples/vehicle-reputation-system/steps.md -->
install go

install hyper ledger fabric
curl -sSL https://bit.ly/2ysbOFE | bash -s

running the test network
cd fabric-samples/test-network
./network.sh up createChannel -ca -c mychannel -s couchdb

test if running
docker ps -a

to stop the running testnet
./network.sh down

deploy the chaincode on test network
./network.sh deployCC -ccn vehiclecc -ccp ../vehicle-reputation-system -ccl javascript

## Set environment variables (run from test-network directory)
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

## Register vehicle
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"registerVehicle","Args":["VEH123"]}'

## Submit report
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"submitReport","Args":["REP001","VEH123","ACCIDENT","Colombo"]}'

## Verify report as valid (increases reputation by 5)
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"verifyReport","Args":["REP001","true"]}'

## Query vehicle to see updated reputation
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getVehicle","Args":["VEH123"]}'

## Submit another report and verify as false (decreases reputation by 10)
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"submitReport","Args":["REP002","VEH123","TRAFFIC_JAM","Kandy"]}'

peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"verifyReport","Args":["REP002","false"]}'

## Query final vehicle state
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getVehicle","Args":["VEH123"]}'
