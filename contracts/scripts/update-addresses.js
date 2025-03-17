// Script to update .env and README.md with contract addresses
const fs = require('fs');
const path = require('path');
const { ethers, upgrades } = require('hardhat');

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
    fs.writeFileSync(envPath, envContent);
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

| Contract | Proxy Address | Implementation Address |
|----------|---------------|------------------------|
| SolarPanelRegistry | [${addresses.registry}](https://amoy.polygonscan.com/address/${addresses.registry}) | [${implementationAddresses.registryImpl}](https://amoy.polygonscan.com/address/${implementationAddresses.registryImpl}) |
| SolarPanelFactory | [${addresses.factory}](https://amoy.polygonscan.com/address/${addresses.factory}) | [${implementationAddresses.factoryImpl}](https://amoy.polygonscan.com/address/${implementationAddresses.factoryImpl}) |
| ShareToken | [${addresses.shareToken}](https://amoy.polygonscan.com/address/${addresses.shareToken}) | [${implementationAddresses.shareTokenImpl}](https://amoy.polygonscan.com/address/${implementationAddresses.shareTokenImpl}) |
| DividendDistributor | [${addresses.dividendDistributor}](https://amoy.polygonscan.com/address/${addresses.dividendDistributor}) | [${implementationAddresses.dividendDistributorImpl}](https://amoy.polygonscan.com/address/${implementationAddresses.dividendDistributorImpl}) |
| MockERC20 (USDC) | [${addresses.paymentToken}](https://amoy.polygonscan.com/address/${addresses.paymentToken}) | N/A (not upgradeable) |

> Note: These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with, while the implementation address contains the actual logic.

Last deployed: ${new Date().toISOString()}
`;
  
  // Check if deployment info section already exists
  if (readmeContent.includes('## Deployed Contracts (Amoy Testnet)')) {
    // Replace existing section
    const regex = /## Deployed Contracts \(Amoy Testnet\)[\s\S]*?(?=\n## |$)/;
    readmeContent = readmeContent.replace(regex, deploymentInfoSection);
  } else {
    // Append to file
    readmeContent += deploymentInfoSection;
  }
  
  // Write updated content back to README.md
  try {
    fs.writeFileSync(readmePath, readmeContent);
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

// Export the function for use in other scripts
module.exports = { updateFiles };

// If script is run directly, read addresses from command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Check if addresses are provided as command line arguments
  if (args.length < 5) {
    console.error('Usage: node update-addresses.js <registry> <factory> <shareToken> <dividendDistributor> <paymentToken>');
    process.exit(1);
  }
  
  const addresses = {
    registry: args[0],
    factory: args[1],
    shareToken: args[2],
    dividendDistributor: args[3],
    paymentToken: args[4]
  };
  
  updateFiles(addresses)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error updating files:', error);
      process.exit(1);
    });
} 