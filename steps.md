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

## Register vehicles
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"registerVehicle","Args":["VEH001"]}'

peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"registerVehicle","Args":["VEH002"]}'

peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"registerVehicle","Args":["VEH003"]}'

## Location-Based Auto-Validation Demo

## Scenario 1: Valid Report (Multiple vehicles report same incident)

# Vehicle 1 reports accident at specific coordinates
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"submitReport","Args":["REP001","VEH001","ACCIDENT","Highway A1 KM 45","6.9271","79.8612"]}'

# Vehicle 2 reports same accident at nearby location (within 500m)
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"submitReport","Args":["REP002","VEH002","ACCIDENT","Highway A1 KM 45","6.9275","79.8615"]}'

# Vehicle 3 also reports the accident - AUTO-VALIDATES all reports!
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"submitReport","Args":["REP003","VEH003","ACCIDENT","Highway A1 KM 45","6.9273","79.8610"]}'

## Check auto-validated reports
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getReport","Args":["REP001"]}'

## Check vehicles - all should have +5 reputation
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getVehicle","Args":["VEH001"]}'

## Scenario 2: Isolated Report (No corroborating vehicles - Needs Review)

# Vehicle reports incident but no other vehicles nearby report it
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"submitReport","Args":["REP004","VEH001","TRAFFIC_JAM","Remote Area","7.2906","80.6337"]}'

## Check report status - should be NEEDS_REVIEW
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getReport","Args":["REP004"]}'

## Get all reports needing review
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getReportsNeedingReview","Args":[]}'

## Manual review - Mark as false if determined to be fake
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $ORDERER_CA \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"reviewPendingReport","Args":["REP004","false"]}'

## Check vehicle - reputation should decrease by 10
peer chaincode query \
  -C mychannel \
  -n vehiclecc \
  -c '{"function":"getVehicle","Args":["VEH001"]}'

## How It Works:
# - Reports with 2+ similar reports within 500m radius = AUTO-VALIDATED (VALID)
# - Reports with 0 similar reports = NEEDS_REVIEW (manual verification required)
# - Reports with 1 similar report = PENDING (waiting for more corroboration)
# - Time window: Reports within 30 minutes are considered
# - Distance threshold: 500 meters (0.5 km)

## How It Works:
# - Reports with 2+ similar reports within 500m radius = AUTO-VALIDATED (VALID)
# - Reports with 0 similar reports = NEEDS_REVIEW (manual verification required)
# - Reports with 1 similar report = PENDING (waiting for more corroboration)
# - Time window: Reports within 30 minutes are considered
# - Distance threshold: 500 meters (0.5 km)
