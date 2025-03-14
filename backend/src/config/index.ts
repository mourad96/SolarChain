import dotenv from 'dotenv';

dotenv.config();

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
    rpcUrl: process.env.AMOY_URL || 'https://rpc-amoy.polygon.technology',
    privateKey: process.env.PRIVATE_KEY || '',
    contracts: {
      assetRegistry: process.env.ASSET_REGISTRY_ADDRESS || '',
      shareToken: process.env.SHARE_TOKEN_ADDRESS || '',
      dividendDistributor: process.env.DIVIDEND_DISTRIBUTOR_ADDRESS || '',
    },
  },
} as const; 