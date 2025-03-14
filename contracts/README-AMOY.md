# Deploying to Polygon Amoy Testnet

This guide will help you deploy the SolarPanelRegistry smart contract to the Polygon Amoy testnet.

## Prerequisites

1. **Amoy Testnet Account**: You need an account with AMOY test tokens.
2. **MetaMask**: Install the [MetaMask](https://metamask.io/) browser extension.
3. **Amoy Testnet Configuration**: Add Amoy testnet to MetaMask:
   - Network Name: Polygon Amoy Testnet
   - RPC URL: https://rpc-amoy.polygon.technology
   - Chain ID: 80002
   - Currency Symbol: MATIC
   - Block Explorer URL: https://amoy.polygonscan.com/

## Getting Amoy Testnet Tokens

1. Visit the [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Amoy" from the network dropdown
3. Enter your wallet address
4. Request test tokens

## Deployment Steps

### 1. Configure Environment Variables

Create or update the `.env` file in the `contracts` directory:

```
# Blockchain
PRIVATE_KEY=your_private_key_here
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
ETHERSCAN_API_KEY=your_polygonscan_api_key_here

# Contract addresses
SOLAR_PANEL_REGISTRY_ADDRESS=
```

Replace `your_private_key_here` with your private key (without the "0x" prefix).

### 2. Compile the Contract

```bash
npx hardhat compile
```

### 3. Deploy to Amoy Testnet

```bash
npx hardhat run scripts/deploy-amoy.ts --network amoy
```

This will:
- Deploy the SolarPanelRegistry contract to Amoy testnet
- Update the `.env` file with the contract address
- Update the backend `.env` file with the contract address (if it exists)

### 4. Verify the Contract on Polygonscan

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

Replace `<CONTRACT_ADDRESS>` with the address of your deployed contract.

Alternatively, you can use the verification script:

```bash
npx hardhat run scripts/verify-contract.ts --network amoy
```

## Updating Backend Configuration

After deployment, make sure your backend is configured to use the Amoy testnet:

1. Update the `.env` file in the `backend` directory:

```
ETHEREUM_RPC_URL=https://rpc-amoy.polygon.technology
SOLAR_PANEL_REGISTRY_ADDRESS=your_deployed_contract_address
PRIVATE_KEY=your_private_key_here
```

2. Restart your backend server to apply the changes.

## Testing the Contract

You can interact with your contract using:

1. **Hardhat Console**:
   ```bash
   npx hardhat console --network amoy
   ```

2. **Polygonscan**: Visit https://amoy.polygonscan.com/ and search for your contract address.

3. **Frontend**: Use your application's frontend to interact with the contract. 