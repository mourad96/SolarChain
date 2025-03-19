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

| Contract | Address | Implementation |
|----------|---------|----------------|
| SolarPanelRegistry | [0x8ed1f4a51Da65eeE69C485630C82c612DfF76D64](https://amoy.polygonscan.com/address/0x8ed1f4a51Da65eeE69C485630C82c612DfF76D64) | [View](https://amoy.polygonscan.com/address/0xF8AFf87CEEA1025359752931B55134CEc793a5d5) |
| SolarPanelFactory | [0x0226575805F212062812CBeB87B522602261F868](https://amoy.polygonscan.com/address/0x0226575805F212062812CBeB87B522602261F868) | [View](https://amoy.polygonscan.com/address/0x7B04b56E92F79076EDB336fE73CE5D0A7A26EbdC) |
| ShareToken | [0xA26A20bD47ea07a56Ad8Ab3D35DBd9f1b51c8E4E](https://amoy.polygonscan.com/address/0xA26A20bD47ea07a56Ad8Ab3D35DBd9f1b51c8E4E) | [View](https://amoy.polygonscan.com/address/0x8805756688A997AC8eD3439394fb17B989f229B5) |
| DividendDistributor | [0x98B5f53AB2C14d2E1Fa2C6004805058C09EB8189](https://amoy.polygonscan.com/address/0x98B5f53AB2C14d2E1Fa2C6004805058C09EB8189) | [View](https://amoy.polygonscan.com/address/0xC6538A1175Ae559475F8ECeA9225BF14E0e49774) |
| MockERC20 (USDC) | [0xe3Ee77DAAa2214fFEE5f9B04DEB9F3126003a9be](https://amoy.polygonscan.com/address/0xe3Ee77DAAa2214fFEE5f9B04DEB9F3126003a9be) | N/A |

> Note: These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with, while the implementation address contains the actual logic.

Last deployed: 2025-03-17T14:52:12.698Z
