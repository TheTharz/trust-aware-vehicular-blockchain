# Blockchain-Based Vehicle Reputation System

> A system to mitigate false data injection in connected vehicles by using a blockchain-based vehicle reputation framework.

## Project Overview

Connected and autonomous vehicles rely on sharing traffic information in real time. However, malicious or faulty vehicles can send false reports (e.g., fake accidents, false traffic jams), leading to **inefficient routing, safety risks, and traffic disruption**.  

This project implements a **Digital Trust Book** using blockchain to manage vehicle reputation:

- Honest cars gain **reputation points**.
- Dishonest cars lose points.
- Immutable blockchain ensures the reputation history cannot be tampered with.
- Proof-of-Authority (PoA) consensus allows **fast, energy-efficient, and secure updates** via trusted Road Side Units (RSUs).

# Detailed

This project implements a **permissioned blockchain-based vehicle reputation system** to mitigate **false data injection attacks** in smart transportation networks. The system is designed for environments such as Vehicular Ad Hoc Networks (VANETs) and Internet of Vehicles (IoV), where vehicles frequently exchange traffic-related information.

The core idea of the system is to **assign and maintain a reputation score for each vehicle** based on the accuracy of the data it reports. Vehicles that consistently provide valid traffic information gain higher reputation scores, while vehicles that submit false or misleading data are penalized. This reputation mechanism discourages malicious behavior and improves trust among participating entities.

The system is built on **Hyperledger Fabric**, a permissioned blockchain framework that provides identity-based access control, immutability, and high throughput. Each vehicle and authority in the network is registered with a digital identity issued by a Certificate Authority, ensuring that all data submissions are traceable and authenticated.

Traffic events such as accident reports or congestion alerts are submitted to the blockchain and stored as immutable ledger entries. These events are later verified by trusted entities such as Road Side Units (RSUs) or transportation authorities. Based on the verification outcome, the reporting vehicle’s reputation score is updated using predefined smart contract logic.

By storing reputation data and verification results on the blockchain, the system prevents tampering, eliminates reliance on a single central authority, and provides transparent and auditable trust management. Overall, this approach enhances data reliability and resilience against false data injection in smart transportation systems.
