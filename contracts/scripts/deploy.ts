import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying SolarPanelRegistry contract...");

  // Get the contract factory
  const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
  
  // Deploy the contract
  const solarPanelRegistry = await SolarPanelRegistry.deploy();
  
  // Wait for deployment to complete
  await solarPanelRegistry.waitForDeployment();
  
  // Get the contract address
  const contractAddress = await solarPanelRegistry.getAddress();
  
  console.log(`SolarPanelRegistry deployed to: ${contractAddress}`);

  // Update the .env file with the contract address
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  try {
    envContent = fs.readFileSync(envPath, "utf8");
  } catch (error) {
    console.log("No .env file found, creating a new one");
  }

  // Update or add the contract address
  if (envContent.includes("SOLAR_PANEL_REGISTRY_ADDRESS=")) {
    envContent = envContent.replace(
      /SOLAR_PANEL_REGISTRY_ADDRESS=.*/,
      `SOLAR_PANEL_REGISTRY_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nSOLAR_PANEL_REGISTRY_ADDRESS=${contractAddress}`;
  }

  // Write the updated content back to the .env file
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env file with contract address`);

  // Also update the backend .env file if it exists
  const backendEnvPath = path.join(__dirname, "../../backend/.env");
  
  try {
    let backendEnvContent = fs.readFileSync(backendEnvPath, "utf8");
    
    if (backendEnvContent.includes("SOLAR_PANEL_REGISTRY_ADDRESS=")) {
      backendEnvContent = backendEnvContent.replace(
        /SOLAR_PANEL_REGISTRY_ADDRESS=.*/,
        `SOLAR_PANEL_REGISTRY_ADDRESS=${contractAddress}`
      );
    } else {
      backendEnvContent += `\nSOLAR_PANEL_REGISTRY_ADDRESS=${contractAddress}`;
    }
    
    fs.writeFileSync(backendEnvPath, backendEnvContent);
    console.log(`Updated backend .env file with contract address`);
  } catch (error) {
    console.log("Backend .env file not found, skipping update");
  }

  console.log("Deployment completed successfully!");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 