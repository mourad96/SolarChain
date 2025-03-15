# Solar Energy IoFy Smart Contracts

This repository contains the smart contracts for the Solar Energy IoFy platform, which enables the registration, tokenization, and dividend distribution for solar panels.

## Contracts

### SolarPanelRegistry.sol
The central registry for all solar panels. It stores panel details and manages ownership.

### SolarPanelFactory.sol
Factory contract for batch registration of solar panels. Uses the Factory pattern to efficiently register multiple panels at once.

### ShareToken.sol
ERC20 token representing shares in solar panels. Allows for the tokenization of solar panel ownership.

### DividendDistributor.sol
Handles the distribution of dividends to solar panel share holders.

### MockERC20.sol
A simple ERC20 token implementation for testing purposes. Used to simulate dividend payments.

## Deployment

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Hardhat

### Setup
1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deploy Contracts
To deploy all contracts to a network:
```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

Available networks are defined in `hardhat.config.js`.

### Verify Contracts
If you need to manually verify a contract:
```bash
npx hardhat run scripts/verify-contract.ts --network <network-name> --address <contract-address> --args '<constructor-args-as-json-array>'
```

Example:
```bash
npx hardhat run scripts/verify-contract.ts --network polygon --address 0x123... --args '["0x456...", "USD Coin", "USDC"]'
```

## Contract Interactions

### Register a Solar Panel
```javascript
// Using the registry directly
await registry.registerPanel("SN001", "SolarCorp", 300);

// Using the factory for batch registration
await factory.registerPanelsBatch(
  ["SN001", "SN002", "SN003"],
  ["SolarCorp", "SunPower", "EcoSolar"],
  ["Panel 1", "Panel 2", "Panel 3"],
  ["Location 1", "Location 2", "Location 3"],
  [300, 400, 500]
);
```

### Mint Shares for a Panel
```javascript
await shareToken.mintShares(panelId, 1000); // 1000 shares
```

### Distribute Dividends
```javascript
// Approve the dividend distributor to spend your payment tokens
await paymentToken.approve(dividendDistributor.address, 100);

// Distribute dividends
await dividendDistributor.distributeDividends(panelId, 100);
```

### Claim Dividends
```javascript
await dividendDistributor.claimDividends(panelId);
```

## License
MIT 



## Deployed Contracts (Amoy Testnet)

| Contract | Address |
|----------|---------|
| SolarPanelRegistry | [0x9d830BDfF945791134bc62F69e2ad6111Fb9856A](https://amoy.polygonscan.com/address/0x9d830BDfF945791134bc62F69e2ad6111Fb9856A) |
| SolarPanelFactory | [0x3E2A78154867Cd41D24319c507e6E11014C7Cbe2](https://amoy.polygonscan.com/address/0x3E2A78154867Cd41D24319c507e6E11014C7Cbe2) |
| ShareToken | [0x974624CEC8a9AB793baDB767d32025C39C6Acd78](https://amoy.polygonscan.com/address/0x974624CEC8a9AB793baDB767d32025C39C6Acd78) |
| DividendDistributor | [0x626088F5255A9cF99C0b00a88E2D06AD3911f4D7](https://amoy.polygonscan.com/address/0x626088F5255A9cF99C0b00a88E2D06AD3911f4D7) |
| MockERC20 (USDC) | [0x35c18a8F5Abb163aee1b2cB8087aaC5C7069b3a5](https://amoy.polygonscan.com/address/0x35c18a8F5Abb163aee1b2cB8087aaC5C7069b3a5) |

Last deployed: 2025-03-15T02:14:22.901Z
