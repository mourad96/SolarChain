// Script to update contract addresses from a specific deployment file
const fs = require('fs');
const path = require('path');
const { getDeploymentByFile, updateFiles } = require('./update-addresses');

async function main() {
  const args = process.argv.slice(2);
  let deploymentFileName = null;
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
      deploymentFileName = args[i + 1];
      break;
    }
  }
  
  // If no file specified, use the latest hardhat deployment
  if (!deploymentFileName) {
    const deploymentsDir = path.join(__dirname, '../deployments');
    
    // List all deployment files
    const allFiles = fs.readdirSync(deploymentsDir);
    
    // Filter to only include hardhat deployments
    const hardhatFiles = allFiles.filter(file => file.startsWith('deployment-hardhat-'));
    
    if (hardhatFiles.length === 0) {
      console.error('No hardhat deployment files found.');
      process.exit(1);
    }
    
    // Get the full paths and file stats
    const fileStats = hardhatFiles.map(file => {
      const fullPath = path.join(deploymentsDir, file);
      return {
        file,
        fullPath,
        mtime: fs.statSync(fullPath).mtime // Get the modified time
      };
    });
    
    // Sort by modified time (newest first)
    fileStats.sort((a, b) => b.mtime - a.mtime);
    
    // Use the newest file
    deploymentFileName = fileStats[0].file;
    console.log(`Using latest hardhat deployment file: ${deploymentFileName}`);
  }
  
  try {
    // Load the deployment data from the file
    const deploymentData = getDeploymentByFile(deploymentFileName);
    
    // Update the files with the deployment data
    await updateFiles(deploymentData);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 