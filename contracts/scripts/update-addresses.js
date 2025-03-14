// Script to update .env and README.md with contract addresses
const fs = require('fs');
const path = require('path');

// Function to update .env file with contract addresses
function updateEnvFile(addresses) {
  const envPath = path.join(__dirname, '../.env');
  
  // Read current .env file
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.error('Error reading .env file:', error);
    return;
  }
  
  // Create contract addresses section
  const contractAddressesSection = `
# Contract Addresses (Amoy)
REGISTRY_ADDRESS=${addresses.registry}
FACTORY_ADDRESS=${addresses.factory}
SHARE_TOKEN_ADDRESS=${addresses.shareToken}
DIVIDEND_DISTRIBUTOR_ADDRESS=${addresses.dividendDistributor}
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
function updateReadmeFile(addresses) {
  const readmePath = path.join(__dirname, '../README.md');
  
  // Read current README.md file
  let readmeContent = '';
  try {
    readmeContent = fs.readFileSync(readmePath, 'utf8');
  } catch (error) {
    console.error('Error reading README.md file:', error);
    return;
  }
  
  // Create deployment info section
  const deploymentInfoSection = `
## Deployed Contracts (Amoy Testnet)

| Contract | Address |
|----------|---------|
| SolarPanelRegistry | [${addresses.registry}](https://amoy.polygonscan.com/address/${addresses.registry}) |
| SolarPanelFactory | [${addresses.factory}](https://amoy.polygonscan.com/address/${addresses.factory}) |
| ShareToken | [${addresses.shareToken}](https://amoy.polygonscan.com/address/${addresses.shareToken}) |
| DividendDistributor | [${addresses.dividendDistributor}](https://amoy.polygonscan.com/address/${addresses.dividendDistributor}) |
| MockERC20 (USDC) | [${addresses.paymentToken}](https://amoy.polygonscan.com/address/${addresses.paymentToken}) |

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
function updateFiles(addresses) {
  console.log('Updating files with contract addresses...');
  updateEnvFile(addresses);
  updateReadmeFile(addresses);
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
  
  updateFiles(addresses);
} 