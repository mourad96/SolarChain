# Solar Energy IoFy Smart Contracts

This repository contains the smart contracts for the Solar Energy IoFy platform, which enables the registration, tokenization, and dividend distribution for solar panels.

## Contracts

### SolarPanelRegistry.sol
The central registry for all solar panels. It stores panel details and manages ownership. Also maintains the relationships between panels, share tokens, and token sales.

### SolarPanelFactory.sol
Factory contract for batch registration of solar panels. Uses the Factory pattern to efficiently register multiple panels at once.

### ShareToken.sol
ERC20 token representing shares in solar panels. Allows for the tokenization of solar panel ownership.

### TokenSale.sol
Manages the sale of share tokens to investors. Each sale is linked to a specific panel in the registry.

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
| SolarPanelRegistry | [0x8ed1f4a51Da65eeE69C485630C82c612DfF76D64](https://amoy.polygonscan.com/address/0x8ed1f4a51Da65eeE69C485630C82c612DfF76D64) | [View](https://amoy.polygonscan.com/address/unknown) |
| SolarPanelFactory | [0x0226575805F212062812CBeB87B522602261F868](https://amoy.polygonscan.com/address/0x0226575805F212062812CBeB87B522602261F868) | [View](https://amoy.polygonscan.com/address/unknown) |
| ShareToken | [0xA26A20bD47ea07a56Ad8Ab3D35DBd9f1b51c8E4E](https://amoy.polygonscan.com/address/0xA26A20bD47ea07a56Ad8Ab3D35DBd9f1b51c8E4E) | [View](https://amoy.polygonscan.com/address/unknown) |
| DividendDistributor | [0x98B5f53AB2C14d2E1Fa2C6004805058C09EB8189](https://amoy.polygonscan.com/address/0x98B5f53AB2C14d2E1Fa2C6004805058C09EB8189) | [View](https://amoy.polygonscan.com/address/unknown) |
| TokenSale | [undefined](https://amoy.polygonscan.com/address/undefined) | [View](https://amoy.polygonscan.com/address/unknown) |
| MockERC20 (USDC) | [0xe3Ee77DAAa2214fFEE5f9B04DEB9F3126003a9be](https://amoy.polygonscan.com/address/0xe3Ee77DAAa2214fFEE5f9B04DEB9F3126003a9be) | N/A |

> Note: These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with, while the implementation address contains the actual logic.

Last deployed: 2025-03-28T00:23:04.923Z
## Contract Structure

### Core Contracts

- **SolarPanelRegistry**: Maintains the registry of all solar panels and links between panels, tokens, and sales
- **ShareToken**: ERC-20 token representing shares in a specific solar panel
- **SolarPanelFactory**: Factory contract for creating panels and their tokens
- **TokenSale**: Contract for selling shares to investors

## Registry Linkage

The `SolarPanelRegistry` contract maintains bidirectional relationships between:
- Panels and their share tokens
- Panels and their token sales

These linkages enable:
1. Finding a panel by its share token address
2. Finding a panel by its token sale address
3. Finding a token sale by its panel ID
4. Finding a share token by its panel ID

Key functions in the registry:
- `linkShareToken(uint256 panelId, address tokenAddress)`: Links a share token to a panel
- `linkSaleContract(uint256 panelId, address saleAddress)`: Links a token sale to a panel
- `getShareTokenAddress(uint256 panelId)`: Gets the share token address for a panel
- `getSaleContractAddress(uint256 panelId)`: Gets the token sale address for a panel
- `getPanelIdByToken(address tokenAddress)`: Gets the panel ID for a share token
- `getPanelIdBySale(address saleAddress)`: Gets the panel ID for a token sale

## How to Use the Token Sale Feature

The platform supports a token sale mechanism that allows investors to purchase shares in solar panels. There are two ways to set up a token sale:

### 1. Creating a Panel with Integrated Token Sale

The panel owner can create a panel, its share token, and a token sale in a single transaction using the enhanced `createPanelWithShares` function:

```solidity
function createPanelWithShares(
    string memory externalId,
    string memory tokenName,
    string memory tokenSymbol,
    uint256 totalShares,
    uint256 capacity,
    uint256 tokensForSale,
    uint256 tokenPrice,
    uint256 saleEndTime
)
```

A token sale will be automatically created if `tokensForSale` is greater than 0. The function will:
- Register the panel
- Create the share token
- Mint the total shares to the owner
- Create a token sale contract (if tokensForSale > 0)
- Transfer the specified tokens to the sale contract (if tokensForSale > 0)
- Link the token sale to the panel in the registry (if tokensForSale > 0)

Example:
```javascript
// Create panel with integrated token sale
const result = await factory.createPanelWithShares(
  "PANEL123",                          // External ID
  "Solar Share",                       // Token name
  "SOLAR",                             // Token symbol
  1000,                                // Total shares (1000 tokens)
  5000,                                // Capacity (5kW)
  ethers.utils.parseEther("500"),      // Tokens for sale (500 tokens) - Set to 0 to skip sale creation
  ethers.utils.parseEther("0.01"),     // Price (0.01 ETH per token)
  Math.floor(Date.now() / 1000) + 86400 // End time (1 day from now)
);
```

The function returns:
- `panelId`: The ID of the created panel
- `tokenAddress`: The address of the created share token
- `saleAddress`: The address of the created token sale contract (or address(0) if no sale was created)

### 2. Creating a Panel First, Then Setting Up a Sale

Alternatively, you can:

a. Create a panel with shares using the legacy `createPanelWithShares` function:
```solidity
function createPanelWithShares(
    string memory externalId,
    string memory tokenName,
    string memory tokenSymbol,
    uint256 totalShares,
    uint256 capacity
)
```

b. Then create a token sale for the existing share token:
```solidity
function createTokenSale(
    address shareTokenAddress,
    uint256 price,
    uint256 tokensForSale,
    uint256 saleEndTime
)
```

This two-step process also properly links the sale contract to the panel in the registry, allowing you to query the registry to find the sale contract for a specific panel, or to find which panel a sale contract belongs to.

### 3. Using the Convenience Function

For backward compatibility, you can also use this convenience function which internally calls the enhanced `createPanelWithShares`:

```solidity
function createPanelWithSale(
    string memory externalId,
    string memory tokenName,
    string memory tokenSymbol,
    uint256 totalShares,
    uint256 capacity,
    uint256 tokensForSale,
    uint256 price,
    uint256 saleEndTime
)
```

## Purchasing Tokens

Investors can purchase tokens by calling the `purchaseTokens` function on the TokenSale contract:

```solidity
function purchaseTokens(uint256 amount) external payable
```

The investor must send the exact amount of ETH corresponding to the number of tokens they want to purchase:
- Required ETH = token amount × token price

## Managing the Sale

The sale owner can:
- Update the token price: `updatePrice(uint256 _newPrice)`
- Update the sale end time: `updateSaleEndTime(uint256 _newEndTime)`
- Activate/deactivate the sale: `setSaleStatus(bool _isActive)`
- Withdraw collected funds: `withdrawFunds(address payable to)`
- Withdraw unsold tokens after the sale ends: `withdrawRemainingTokens(address to)`

## Example Workflow

1. Admin creates a panel with an integrated token sale:
   ```javascript
   const [panelId, tokenAddress, saleAddress] = await factory.createPanelWithShares(
     "PANEL123",                          // External ID
     "Solar Share",                       // Token name
     "SOLAR",                             // Token symbol
     ethers.utils.parseEther("1000"),     // Total shares (1000 tokens)
     5000,                                // Capacity (5kW)
     ethers.utils.parseEther("500"),      // Tokens for sale (500 tokens)
     ethers.utils.parseEther("0.01"),     // Price (0.01 ETH per token)
     Math.floor(Date.now() / 1000) + 86400 // End time (1 day from now)
   );
   
   // Get the token sale contract instance
   const tokenSale = await ethers.getContractAt("TokenSale", saleAddress);
   ```

2. Investor purchases tokens:
   ```javascript
   await tokenSale.purchaseTokens(
     ethers.utils.parseEther("10"),       // Purchase 10 tokens
     { value: ethers.utils.parseEther("0.1") } // Pay 0.1 ETH (10 * 0.01)
   );
   ```

3. Admin withdraws funds:
   ```javascript
   await tokenSale.withdrawFunds(adminAddress);
   ```

## Security Considerations

- The token sale contract includes pause functionality for emergencies
- Role-based access control restricts administrative functions
- The contract includes checks to prevent common errors (e.g., incorrect payment amounts)
- All contracts are upgradeable using the UUPS proxy pattern


## Deployed Contracts (Hardhat Local)

| Contract | Address | Implementation |
|----------|---------|----------------|
| SolarPanelRegistry | `0x45a835463E69ee9B45EF0af4B834033e981B6CA2` | `unknown` |
| SolarPanelFactory | `0x25093CaCA0d823dB26C1707fed2063062722742B` | `unknown` |
| ShareToken | `0x8f5BB8f4069e1834C26a79eFDba9565DDCB11B44` | `unknown` |
| DividendDistributor | `0xD4914E6E3E9e4A977313d2A0cd4C75D1A4F99D6c` | `unknown` |
| TokenSale | `0x6E60422988997f0103f800fc608D32ee5f2611C4` | `unknown` |
| MockERC20 (USDC) | `0xc963fcEAc3785a2604d0f12832465d87a49df9ae` | N/A |

> Note: These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with, while the implementation address contains the actual logic.

Last deployed: 2025-03-28T00:29:48.763Z
