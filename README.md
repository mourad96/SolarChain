# Solar Energy IoFy Platform

A full-stack platform for solar panel tokenization, enabling registration, tokenization, and dividend distribution for solar energy assets.

## Project Overview

Solar Energy IoFy is a blockchain-based platform that enables the tokenization of solar panels, allowing for fractional ownership and investment in renewable energy infrastructure. The platform consists of three main components:

1. **Smart Contracts (Blockchain)**: Handles panel registration, share tokenization, and dividend distribution
2. **Backend API**: Manages user authentication, panel data, and interfaces with the blockchain
3. **Frontend Application**: Provides a user-friendly interface for investors and panel owners

## Project Structure

```
solar_energy_iofy/
├── backend/         # Node.js Express server with TypeScript
├── contracts/       # Solidity smart contracts with Hardhat
├── frontend/        # Next.js React frontend application
```

## Technology Stack

### Frontend
- Next.js (React framework)
- TypeScript
- Tailwind CSS
- Chart.js for data visualization
- React Query for data fetching
- Ethers.js for blockchain interaction

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM for database interactions
- JWT for authentication
- Winston for logging
- Ethers.js for blockchain integration

### Smart Contracts
- Solidity
- Hardhat development environment
- OpenZeppelin contracts
- Polygon blockchain (Amoy testnet)
- ERC20 tokens for share representation

## Smart Contracts

The core smart contracts include:

- **SolarPanelRegistry**: Central registry for all solar panels
- **SolarPanelFactory**: Factory contract for efficient panel registration
- **ShareToken**: ERC20 token representing shares in solar panels
- **TokenSale**: Manages the sale of share tokens to investors
- **DividendDistributor**: Handles distribution of dividends to shareholders

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/solar_energy_iofy.git
cd solar_energy_iofy
```

2. Set up each component:

#### Smart Contracts
```bash
cd contracts
npm install
```

Create a `.env` file with:
```
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### Backend
```bash
cd ../backend
npm install
```

Create a `.env` file with:
```
DATABASE_URL="postgresql://username:password@localhost:5432/iofy_db"
JWT_SECRET="your-secret-key"
PORT=3001
```

#### Frontend
```bash
cd ../frontend
npm install
```

Create a `.env.local` file with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running the Project

#### Smart Contracts (Local Development)
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### Backend
```bash
cd backend
npm run dev
```

#### Frontend
```bash
cd frontend
npm run dev
```

Access the application at: http://localhost:3000

## Deployed Contracts (Amoy Testnet)

| Contract | Address |
|----------|---------|
| SolarPanelRegistry | [0x8ed1f4a51Da65eeE69C485630C82c612DfF76D64](https://amoy.polygonscan.com/address/0x8ed1f4a51Da65eeE69C485630C82c612DfF76D64) |
| SolarPanelFactory | [0x0226575805F212062812CBeB87B522602261F868](https://amoy.polygonscan.com/address/0x0226575805F212062812CBeB87B522602261F868) |
| ShareToken | [0xA26A20bD47ea07a56Ad8Ab3D35DBd9f1b51c8E4E](https://amoy.polygonscan.com/address/0xA26A20bD47ea07a56Ad8Ab3D35DBd9f1b51c8E4E) |
| DividendDistributor | [0x98B5f53AB2C14d2E1Fa2C6004805058C09EB8189](https://amoy.polygonscan.com/address/0x98B5f53AB2C14d2E1Fa2C6004805058C09EB8189) |
| MockERC20 (USDC) | [0xe3Ee77DAAa2214fFEE5f9B04DEB9F3126003a9be](https://amoy.polygonscan.com/address/0xe3Ee77DAAa2214fFEE5f9B04DEB9F3126003a9be) |

> These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with.

## Core Features

### For Panel Owners
- Register solar panels with detailed specifications
- Tokenize panel ownership into tradable ERC20 shares
- Set up token sales to attract investors
- Distribute dividends based on energy production

### For Investors
- Browse available solar panel investments
- Purchase shares in solar panels
- View real-time performance data
- Receive dividends from energy production

## Development Commands

### Smart Contracts
```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Mumbai testnet
npm run deploy:mumbai

# Verify contracts on Mumbai
npm run verify:mumbai
```

### Backend
```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run tests
npm run test
```

### Frontend
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## License
MIT 