// Script to update .env and README.md with contract addresses
const fs = require('fs');
const path = require('path');
const { ethers, upgrades, network } = require('hardhat');

// Function to get the latest deployment data for a specific network or any network
function getLatestDeployment(specificNetwork = null) {
  const deploymentsDir = path.join(__dirname, '../deployments');
  
  // If directory doesn't exist, create it
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
    throw new Error('No deployments directory found, created one');
  }
  
  // Get all deployment files
  let deploymentFiles = fs.readdirSync(deploymentsDir);
  
  // Filter by network if specified
  if (specificNetwork) {
    deploymentFiles = deploymentFiles.filter(file => file.startsWith(`deployment-${specificNetwork.toLowerCase()}-`));
  }
  
  // Sort deployments by date (most recent first)
  deploymentFiles = deploymentFiles.sort((a, b) => {
    const timeA = new Date(a.split('-').slice(2).join('-').replace('.json', '').replace(/-/g, ':'));
    const timeB = new Date(b.split('-').slice(2).join('-').replace('.json', '').replace(/-/g, ':'));
    return timeB - timeA;
  });

  if (deploymentFiles.length === 0) {
    throw new Error(`No deployment files found${specificNetwork ? ` for network ${specificNetwork}` : ''}`);
  }

  const latestDeploymentPath = path.join(deploymentsDir, deploymentFiles[0]);
  const deploymentData = JSON.parse(fs.readFileSync(latestDeploymentPath, 'utf8'));
  console.log(`Using deployment data from: ${latestDeploymentPath}`);
  
  // Ensure network is properly set in the deployment data
  if (!deploymentData.network && specificNetwork) {
    deploymentData.network = specificNetwork;
  }
  
  return deploymentData;
}

// Function to update .env file with contract addresses
async function updateEnvFile(addresses, networkName) {
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
      dividendDistributorImpl: await upgrades.erc1967.getImplementationAddress(addresses.dividendDistributor),
      tokenSaleImpl: await upgrades.erc1967.getImplementationAddress(addresses.tokenSale)
    };
  } catch (error) {
    console.error('Error getting implementation addresses:', error);
    implementationAddresses = {
      registryImpl: 'unknown',
      factoryImpl: 'unknown',
      shareTokenImpl: 'unknown',
      dividendDistributorImpl: 'unknown',
      tokenSaleImpl: 'unknown'
    };
  }
  
  // Capitalize network name for section header
  const networkDisplayName = networkName.charAt(0).toUpperCase() + networkName.slice(1);
  
  // Create contract addresses section
  const contractAddressesSection = `
# Contract Addresses (${networkDisplayName})
${networkName.toUpperCase()}_REGISTRY_ADDRESS=${addresses.registry}
${networkName.toUpperCase()}_REGISTRY_IMPLEMENTATION_ADDRESS=${implementationAddresses.registryImpl}
${networkName.toUpperCase()}_FACTORY_ADDRESS=${addresses.factory}
${networkName.toUpperCase()}_FACTORY_IMPLEMENTATION_ADDRESS=${implementationAddresses.factoryImpl}
${networkName.toUpperCase()}_SHARE_TOKEN_ADDRESS=${addresses.shareToken}
${networkName.toUpperCase()}_SHARE_TOKEN_IMPLEMENTATION_ADDRESS=${implementationAddresses.shareTokenImpl}
${networkName.toUpperCase()}_DIVIDEND_DISTRIBUTOR_ADDRESS=${addresses.dividendDistributor}
${networkName.toUpperCase()}_DIVIDEND_DISTRIBUTOR_IMPLEMENTATION_ADDRESS=${implementationAddresses.dividendDistributorImpl}
${networkName.toUpperCase()}_TOKEN_SALE_ADDRESS=${addresses.tokenSale}
${networkName.toUpperCase()}_TOKEN_SALE_IMPLEMENTATION_ADDRESS=${implementationAddresses.tokenSaleImpl}
${networkName.toUpperCase()}_MOCK_ERC20_ADDRESS=${addresses.paymentToken}
`;
  
  // Check if contract addresses section for this network already exists
  const regex = new RegExp(`# Contract Addresses \\(${networkDisplayName}\\)[\\s\\S]*?(?=\\n\\n|$)`, 'i');
  
  if (envContent.match(regex)) {
    // Replace existing section
    envContent = envContent.replace(regex, contractAddressesSection.trim());
  } else {
    // Append to file
    envContent += contractAddressesSection;
  }
  
  // Write updated content back to .env
  try {
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`Updated .env file with ${networkName} contract addresses`);
  } catch (error) {
    console.error('Error writing to .env file:', error);
  }
}

// Function to update README.md with contract addresses
async function updateReadmeFile(addresses, networkName) {
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
      dividendDistributorImpl: await upgrades.erc1967.getImplementationAddress(addresses.dividendDistributor),
      tokenSaleImpl: await upgrades.erc1967.getImplementationAddress(addresses.tokenSale)
    };
  } catch (error) {
    console.error('Error getting implementation addresses:', error);
    implementationAddresses = {
      registryImpl: 'unknown',
      factoryImpl: 'unknown',
      shareTokenImpl: 'unknown',
      dividendDistributorImpl: 'unknown',
      tokenSaleImpl: 'unknown'
    };
  }
  
  // Determine blockchain explorer URL based on network
  let explorerBaseUrl = '#';
  let networkDisplayName = networkName.charAt(0).toUpperCase() + networkName.slice(1);
  
  switch(networkName.toLowerCase()) {
    case 'amoy':
      explorerBaseUrl = 'https://amoy.polygonscan.com/address';
      networkDisplayName = 'Amoy Testnet';
      break;
    case 'mumbai':
      explorerBaseUrl = 'https://mumbai.polygonscan.com/address';
      networkDisplayName = 'Mumbai Testnet';
      break;
    case 'polygon':
      explorerBaseUrl = 'https://polygonscan.com/address';
      networkDisplayName = 'Polygon Mainnet';
      break;
    case 'hardhat':
    case 'localhost':
      explorerBaseUrl = '#';
      networkDisplayName = networkName === 'hardhat' ? 'Hardhat Local' : 'Localhost';
      break;
    default:
      explorerBaseUrl = '#';
  }
  
  // Format addresses for README based on network type
  const formatAddress = (address, implAddress) => {
    if (networkName === 'hardhat' || networkName === 'localhost') {
      return `\`${address}\``;
    } else {
      return `[${address}](${explorerBaseUrl}/${address})`;
    }
  };
  
  const formatImpl = (implAddress) => {
    if (networkName === 'hardhat' || networkName === 'localhost') {
      return `\`${implAddress}\``;
    } else {
      return `[View](${explorerBaseUrl}/${implAddress})`;
    }
  };
  
  // Create deployment info section
  const deploymentInfoSection = `
## Deployed Contracts (${networkDisplayName})

| Contract | Address | Implementation |
|----------|---------|----------------|
| SolarPanelRegistry | ${formatAddress(addresses.registry)} | ${formatImpl(implementationAddresses.registryImpl)} |
| SolarPanelFactory | ${formatAddress(addresses.factory)} | ${formatImpl(implementationAddresses.factoryImpl)} |
| ShareToken | ${formatAddress(addresses.shareToken)} | ${formatImpl(implementationAddresses.shareTokenImpl)} |
| DividendDistributor | ${formatAddress(addresses.dividendDistributor)} | ${formatImpl(implementationAddresses.dividendDistributorImpl)} |
| TokenSale | ${formatAddress(addresses.tokenSale)} | ${formatImpl(implementationAddresses.tokenSaleImpl)} |
| MockERC20 (USDC) | ${formatAddress(addresses.paymentToken)} | N/A |

> Note: These contracts are upgradeable using the UUPS proxy pattern. The proxy address is the address you interact with, while the implementation address contains the actual logic.

Last deployed: ${addresses.timestamp || new Date().toISOString()}
`;
  
  // Check if deployment info section for this network already exists
  const oldSectionRegex = new RegExp(`## Deployed Contracts \\(${networkDisplayName}\\)[\\s\\S]*?(?=\\n## |$)`, 'i');
  
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
    console.log(`Updated README.md file with ${networkName} contract addresses`);
  } catch (error) {
    console.error('Error writing to README.md file:', error);
  }
}

// Function to get a specific deployment file
function getDeploymentByFile(deploymentFileName) {
  const deploymentsDir = path.join(__dirname, '../deployments');
  const deploymentPath = path.join(deploymentsDir, deploymentFileName);
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file ${deploymentFileName} not found`);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log(`Using specified deployment file: ${deploymentPath}`);
  return deploymentData;
}

// Main function to update files with contract addresses
async function updateFiles(addresses) {
  // If network wasn't explicitly provided in addresses, use the current network
  const networkName = addresses.network || network.name;
  console.log(`Updating files with contract addresses for network: ${networkName}...`);
  await updateEnvFile(addresses, networkName);
  await updateReadmeFile(addresses, networkName);
  console.log('Files updated successfully!');
}

// If script is run directly, use the latest deployment file
if (require.main === module) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  let targetNetwork = null;
  let deploymentFile = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && i + 1 < args.length) {
      targetNetwork = args[i + 1];
    }
    if (args[i] === '--file' && i + 1 < args.length) {
      deploymentFile = args[i + 1];
    }
  }
  
  try {
    let deploymentData;
    
    // If a specific file was provided, use it
    if (deploymentFile) {
      deploymentData = getDeploymentByFile(deploymentFile);
    } else {
      // Otherwise, get the latest deployment for the specified network or current network
      deploymentData = getLatestDeployment(targetNetwork || network.name);
    }
    
    // Ensure network is set in deployment data
    if (!deploymentData.network) {
      deploymentData.network = targetNetwork || network.name;
    }
    
    updateFiles(deploymentData)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error updating files:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

// Export functions for use in other scripts
module.exports = { updateFiles, getLatestDeployment, getDeploymentByFile }; 