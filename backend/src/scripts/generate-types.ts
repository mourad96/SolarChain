import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Script to generate TypeChain types from contract ABIs
 * This script copies the contract ABIs from the contracts project and generates TypeScript types
 */
async function generateTypes() {
  try {
    logger.info('Starting TypeChain types generation');

    // Create directories if they don't exist
    const abiDir = path.resolve(__dirname, '../../src/abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    // Path to contracts project
    const contractsDir = path.resolve(__dirname, '../../../contracts');
    
    // Check if contracts directory exists
    if (!fs.existsSync(contractsDir)) {
      throw new Error(`Contracts directory not found at ${contractsDir}`);
    }

    // Copy ABIs from contracts project
    const artifactsDir = path.join(contractsDir, 'artifacts/contracts');
    if (!fs.existsSync(artifactsDir)) {
      throw new Error(`Artifacts directory not found at ${artifactsDir}. Make sure contracts are compiled.`);
    }

    // List of contracts to generate types for
    const contracts = [
      'AssetRegistry',
      'ShareToken',
      'DividendDistributor',
      'SolarPanelRegistry',
      'SolarPanelFactory'
    ];

    // Copy ABIs
    for (const contract of contracts) {
      const abiPath = path.join(artifactsDir, `${contract}.sol/${contract}.json`);
      
      if (fs.existsSync(abiPath)) {
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        fs.writeFileSync(
          path.join(abiDir, `${contract}.json`),
          JSON.stringify(abi.abi, null, 2)
        );
        logger.info(`Copied ABI for ${contract}`);
      } else {
        logger.warn(`ABI not found for ${contract} at ${abiPath}`);
      }
    }

    // Generate TypeChain types
    logger.info('Generating TypeChain types...');
    execSync('npx typechain --target=ethers-v6 --out-dir=src/typechain-types "src/abis/*.json"', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit'
    });

    logger.info('TypeChain types generated successfully');
  } catch (error) {
    logger.error('Error generating TypeChain types:', error);
    process.exit(1);
  }
}

// Run the script
generateTypes().catch(error => {
  logger.error('Unhandled error in generate-types script:', error);
  process.exit(1);
}); 