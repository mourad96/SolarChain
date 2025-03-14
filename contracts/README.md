# IOFY Smart Contracts

This directory contains the smart contracts for the IOFY solar panel tokenization platform. The contracts are written in Solidity and use the Hardhat development environment.

## Contracts Overview

1. **AssetRegistry.sol**: Manages the registration and tracking of solar panels.
2. **ShareToken.sol**: ERC20 token implementation for solar panel shares.
3. **DividendDistributor.sol**: Handles the distribution of dividends to token holders.
4. **MockERC20.sol**: A mock ERC20 token for testing purposes (represents USDC in development).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the environment file and fill in your values:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
- `MUMBAI_URL`: Your Mumbai testnet RPC URL
- `PRIVATE_KEY`: Your deployment wallet's private key
- `POLYGONSCAN_API_KEY`: Your PolygonScan API key for contract verification
- `COINMARKETCAP_API_KEY`: (Optional) For gas reporting

## Development

1. Compile contracts:
```bash
npm run compile
```

2. Run tests:
```bash
npm test
```

3. Generate coverage report:
```bash
npm run coverage
```

## Deployment

### Local Deployment
To deploy on the local Hardhat network:
```bash
npm run deploy:local
```

### Mumbai Testnet Deployment
1. Ensure your `.env` file is configured correctly
2. Deploy to Mumbai:
```bash
npm run deploy:mumbai
```

3. Verify contracts on PolygonScan:
```bash
npm run verify:mumbai
```

## Contract Addresses

After deployment, the script will output the addresses of all deployed contracts. Save these addresses as they will be needed for the frontend and backend integration.

## Security

The contracts use OpenZeppelin's battle-tested implementations for:
- Access Control
- ERC20 tokens
- Pausable functionality
- Safe math operations

## Testing

The contracts include a comprehensive test suite. Run the tests with:
```bash
npm test
```

## Gas Optimization

The contracts are optimized for gas efficiency with:
- Efficient storage patterns
- Minimal state changes
- Batched operations where possible

## License

MIT 