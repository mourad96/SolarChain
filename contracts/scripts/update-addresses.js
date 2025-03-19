// Script to update .env and README.md with contract addresses
const fs = require('fs');
const path = require('path');
const { ethers, upgrades } = require('hardhat');

// Function to get the latest deployment data
function getLatestDeployment() {
  const deploymentsDir = path.join(__dirname, '../deployments');
  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter(file => file.startsWith('deployment-amoy-'))
    .sort((a, b) => {
      const timeA = new Date(a.split('-').slice(2).join('-').replace('.json', '').replace(/-/g, ':'));
      const timeB = new Date(b.split('-').slice(2).join('-').replace('.json', '').replace(/-/g, ':'));
      return timeB - timeA;
    });

  if (deploymentFiles.length === 0) {
    throw new Error('No deployment files found');
  }

  const latestDeploymentPath = path.join(deploymentsDir, deploymentFiles[0]);
  return JSON.parse(fs.readFileSync(latestDeploymentPath, 'utf8'));
}

// Function to update .env file with contract addresses
async function updateEnvFile(addresses) {
  const envPath = path.join(__dirname, '../.env');
  
  // Read current .env file
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.error('Error reading .env file:', error);
    return;
  }
  
  // Get implementation addresses for upgradeable contracts
  let implementationAddresses = {};
  try {
    implementationAddresses = {
      registryImpl: await upgrades.erc1967.getImplementationAddress(addresses.registry),
      factoryImpl: await upgrades.erc1967.getImplementationAddress(addresses.factory),
      shareTokenImpl: await upgrades.erc1967.getImplementationAddress(addresses.shareToken),
      dividendDistributorImpl: await upgrades.erc1967.getImplementationAddress(addresses.dividendDistributor)
    };
  } catch (error) {
    console.error('Error getting implementation addresses:', error);
    implementationAddresses = {
      registryImpl: 'unknown',
      factoryImpl: 'unknown',
      shareTokenImpl: 'unknown',
      dividendDistributorImpl: 'unknown'
    };
  }
  
  // Create contract addresses section
  const contractAddressesSection = `
# Contract Addresses (Amoy)
REGISTRY_ADDRESS=${addresses.registry}
REGISTRY_IMPLEMENTATION_ADDRESS=${implementationAddresses.registryImpl}
FACTORY_ADDRESS=${addresses.factory}
FACTORY_IMPLEMENTATION_ADDRESS=${implementationAddresses.factoryImpl}
SHARE_TOKEN_ADDRESS=${addresses.shareToken}
SHARE_TOKEN_IMPLEMENTATION_ADDRESS=${implementationAddresses.shareTokenImpl}
DIVIDEND_DISTRIBUTOR_ADDRESS=${addresses.dividendDistributor}
DIVIDEND_DISTRIBUTOR_IMPLEMENTATION_ADDRESS=${implementationAddresses.dividendDistributorImpl}
MOCK_ERC20_ADDRESS=${addresses.paymentToken}
`;
  
  // Check if contract addresses section already exists
  if (envContent.includes('# Contract Addresses (Amoy)')) {
    // Replace existing section
    const regex = /# Contract Addresses \(Amoy\)[\s\S]*?(?=\n\n|$)/;
    envContent = envContent.replace(regex, contractAddressesSection.trim());
  } else {
    // Append to file
    envContent += contractAddressesSection;
  }
  
  // Write updated content back to .env
  try {
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('Updated .env file with contract addresses');
  } catch (error) {
    console.error('Error writing to .env file:', error);
  }
}

// Function to update README.md with contract addresses
async function updateReadmeFile(addresses) {
  const readmePath = path.join(__dirname, '../README.md');
  
  // Read current README.md file
  let readmeContent = '';
  try {
    readmeContent = fs.readFileSync(readmePath, 'utf8');
  } catch (error) {
    console.error('Error reading README.md file:', error);
    return;
  }
  
  // Get implementation addresses for upgradeable contracts
  let implementationAddresses = {};
  try {
    implementationAddresses = {
      registryImpl: await upgrades.erc1967.getImplementationAddress(addresses.registry),
      factoryImpl: await upgrades.erc1967.getImplementationAddress(addresses.factory),
      shareTokenImpl: await upgrades.erc1967.getImplementationAddress(addresses.shareToken),
      dividendDistributorImpl: await upgrades.erc1967.getImplementationAddress(addresses.dividendDistributor)
    };
  } catch (error) {
    console.error('Error getting implementation addresses:', error);
    implementationAddresses = {
      registryImpl: 'unknown',
      factoryImpl: 'unknown',
      shareTokenImpl: 'unknown',
      dividendDistributorImpl: 'unknown'
    };
  }
  
  // Create deployment info section
  const deploymentInfoSection = `
## Deployed Contracts (Amoy Testnet)

| Contract | Address | Implementation |
|----------|---------|----------------|
| SolarPanelRegistry | [${addresses.registry}](https://amoy.polygonscan.com/address/${addresses.registry}) | [View](https://amoy.polygonscan.com/address/${implementationAddresses.registryImpl}) |
| SolarPanelFactory | [${addresses.factory}](https://amoy.polygonscan.com/address/${addresses.factory}) | [View](https://amoy.polygonscan.com/address/${implementationAddresses.factoryImpl}) |
| ShareToken | [${addresses.shareToken}](https://amoy.polygonscan.com/address/${addresses.shareToken}) | [View](https://amoy.polygonscan.com/address/${implementationAddresses.shareTokenImpl}) |
| DividendDistributor | [${addresses.dividendDistributor}](https://amoy.polygonscan.com/address/${addresses.dividendDistributor}) | [View](https://amoy.polygonscan.com/address/${implementationAddresses.dividendDistributorImpl}) |
| MockERC20 (USDC) | [${addresses.paymentToken}](https://amoy.polygonscan.com/address/${addresses.paymentToken}) | N/A |

> Note: These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with, while the implementation address contains the actual logic.

Last deployed: ${addresses.timestamp}
`;
  
  // Check if deployment info section already exists
  const oldSectionRegex = /## Deployed Contracts \(Amoy Testnet\)[\s\S]*?(?=\n## |$)/;
  if (readmeContent.match(oldSectionRegex)) {
    // Replace existing section
    readmeContent = readmeContent.replace(oldSectionRegex, deploymentInfoSection.trim());
  } else {
    // Append to file before the last section (if exists) or at the end
    const lastSectionMatch = readmeContent.match(/\n## [^\n]+[^\n]*$/);
    if (lastSectionMatch) {
      const insertPosition = lastSectionMatch.index;
      readmeContent = readmeContent.slice(0, insertPosition) + '\n' + deploymentInfoSection.trim() + '\n' + readmeContent.slice(insertPosition);
    } else {
      readmeContent += '\n' + deploymentInfoSection;
    }
  }
  
  // Write updated content back to README.md
  try {
    fs.writeFileSync(readmePath, readmeContent.trim() + '\n');
    console.log('Updated README.md file with contract addresses');
  } catch (error) {
    console.error('Error writing to README.md file:', error);
  }
}

// Main function to update files with contract addresses
async function updateFiles(addresses) {
  console.log('Updating files with contract addresses...');
  await updateEnvFile(addresses);
  await updateReadmeFile(addresses);
  console.log('Files updated successfully!');
}

// If script is run directly, use the latest deployment file
if (require.main === module) {
  const deploymentData = getLatestDeployment();
  
  updateFiles(deploymentData)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error updating files:', error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = { updateFiles, getLatestDeployment }; 