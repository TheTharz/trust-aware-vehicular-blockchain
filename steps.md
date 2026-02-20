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
