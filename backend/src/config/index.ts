import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Validate contract addresses
const validateAddress = (address: string | undefined): string => {
  if (!address || address.trim() === '') {
    return '';
  }
  
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    logger.warn(`Invalid Ethereum address format: ${address}`);
    return '';
  }
  
  return address;
};

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'iofy',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
  },
  blockchain: {
    rpcUrl: process.env.AMOY_URL || process.env.ETHEREUM_RPC_URL || 'https://rpc-amoy.polygon.technology',
    privateKey: process.env.PRIVATE_KEY || '',
    contracts: {
      assetRegistry: validateAddress(process.env.SOLAR_PANEL_REGISTRY_ADDRESS),
      shareToken: validateAddress(process.env.SHARE_TOKEN_ADDRESS),
      dividendDistributor: validateAddress(process.env.DIVIDEND_DISTRIBUTOR_ADDRESS),
      solarPanelRegistry: validateAddress(process.env.SOLAR_PANEL_REGISTRY_ADDRESS),
      solarPanelFactory: validateAddress(process.env.SOLAR_PANEL_FACTORY_ADDRESS),
    },
  },
} as const; 