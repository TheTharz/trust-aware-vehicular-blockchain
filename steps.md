install go

install hyper ledger fabric
curl -sSL https://bit.ly/2ysbOFE | bash -s

running the test network
cd fabric-samples/test-network
./network.sh up createChannel -ca -c mychannel -s couchdb

test if running
docker ps -a

to stop the running testnet

tharindu@thetharz:~/installations/fabric-samples/test-network$ ./network.sh down

