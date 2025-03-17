// Script to upgrade contracts using OpenZeppelin's upgrades plugin
const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { updateFiles } = require("./update-addresses");

async function main() {
  console.log("Starting contract upgrade process...");

  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log(`Upgrading contracts with the account: ${deployer.address}`);

  // Load deployment addresses
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir).filter(file => file.startsWith("deployment-"));
  
  if (deploymentFiles.length === 0) {
    console.error("No deployment files found. Please deploy contracts first.");
    process.exit(1);
  }

  // Use the most recent deployment file
  const latestDeployment = deploymentFiles.sort().pop();
  const deploymentPath = path.join(deploymentsDir, latestDeployment);
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log(`Using deployment data from: ${deploymentPath}`);

  // Set higher gas price to avoid "replacement transaction underpriced" error
  const overrides = {
    gasPrice: ethers.parseUnits("50", "gwei")
  };

  // Track if any contracts were upgraded
  let upgraded = false;
  const upgradedAddresses = { ...deploymentData };

  // Upgrade SolarPanelRegistry
  if (process.env.UPGRADE_REGISTRY === "true") {
    console.log("Upgrading SolarPanelRegistry...");
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    const upgradedRegistry = await upgrades.upgradeProxy(deploymentData.registry, SolarPanelRegistry);
    await upgradedRegistry.waitForDeployment();
    const registryAddress = await upgradedRegistry.getAddress();
    console.log(`SolarPanelRegistry upgraded at: ${registryAddress}`);
    upgraded = true;
  }

  // Upgrade SolarPanelFactory
  if (process.env.UPGRADE_FACTORY === "true") {
    console.log("Upgrading SolarPanelFactory...");
    const SolarPanelFactory = await ethers.getContractFactory("SolarPanelFactory");
    const upgradedFactory = await upgrades.upgradeProxy(deploymentData.factory, SolarPanelFactory);
    await upgradedFactory.waitForDeployment();
    const factoryAddress = await upgradedFactory.getAddress();
    console.log(`SolarPanelFactory upgraded at: ${factoryAddress}`);
    upgraded = true;
  }

  // Upgrade ShareToken
  if (process.env.UPGRADE_SHARETOKEN === "true" && deploymentData.shareToken) {
    console.log("Upgrading ShareToken...");
    const ShareToken = await ethers.getContractFactory("ShareToken");
    const upgradedShareToken = await upgrades.upgradeProxy(deploymentData.shareToken, ShareToken);
    await upgradedShareToken.waitForDeployment();
    const shareTokenAddress = await upgradedShareToken.getAddress();
    console.log(`ShareToken upgraded at: ${shareTokenAddress}`);
    upgraded = true;
  }

  // Upgrade DividendDistributor
  if (process.env.UPGRADE_DISTRIBUTOR === "true") {
    console.log("Upgrading DividendDistributor...");
    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    const upgradedDistributor = await upgrades.upgradeProxy(deploymentData.dividendDistributor, DividendDistributor);
    await upgradedDistributor.waitForDeployment();
    const distributorAddress = await upgradedDistributor.getAddress();
    console.log(`DividendDistributor upgraded at: ${distributorAddress}`);
    upgraded = true;
  }

  // Verify implementation contracts on Etherscan if not on a local network
  if (upgraded && network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    // Wait for a few block confirmations to ensure the contracts are mined
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2s

    console.log("Verifying implementation contracts on Etherscan...");
    
    if (process.env.UPGRADE_REGISTRY === "true") {
      try {
        const registryImplementationAddress = await upgrades.erc1967.getImplementationAddress(deploymentData.registry);
        await run("verify:verify", {
          address: registryImplementationAddress,
          constructorArguments: [],
        });
        console.log("SolarPanelRegistry implementation verified");
      } catch (error) {
        console.log("Error verifying SolarPanelRegistry implementation:", error.message);
      }
    }

    if (process.env.UPGRADE_FACTORY === "true") {
      try {
        const factoryImplementationAddress = await upgrades.erc1967.getImplementationAddress(deploymentData.factory);
        await run("verify:verify", {
          address: factoryImplementationAddress,
          constructorArguments: [],
        });
        console.log("SolarPanelFactory implementation verified");
      } catch (error) {
        console.log("Error verifying SolarPanelFactory implementation:", error.message);
      }
    }

    if (process.env.UPGRADE_SHARETOKEN === "true" && deploymentData.shareToken) {
      try {
        const shareTokenImplementationAddress = await upgrades.erc1967.getImplementationAddress(deploymentData.shareToken);
        await run("verify:verify", {
          address: shareTokenImplementationAddress,
          constructorArguments: [],
        });
        console.log("ShareToken implementation verified");
      } catch (error) {
        console.log("Error verifying ShareToken implementation:", error.message);
      }
    }

    if (process.env.UPGRADE_DISTRIBUTOR === "true") {
      try {
        const distributorImplementationAddress = await upgrades.erc1967.getImplementationAddress(deploymentData.dividendDistributor);
        await run("verify:verify", {
          address: distributorImplementationAddress,
          constructorArguments: [],
        });
        console.log("DividendDistributor implementation verified");
      } catch (error) {
        console.log("Error verifying DividendDistributor implementation:", error.message);
      }
    }
  }

  // Update .env and README.md with contract addresses if any contracts were upgraded
  if (upgraded) {
    console.log("Updating contract addresses in files...");
    await updateFiles(upgradedAddresses);
    
    // Save updated deployment data
    const newDeploymentPath = path.join(
      deploymentsDir,
      `deployment-${network.name}-${new Date().toISOString().replace(/:/g, "-")}-upgraded.json`
    );
    fs.writeFileSync(newDeploymentPath, JSON.stringify({
      ...upgradedAddresses,
      network: network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      upgradedFrom: deploymentPath
    }, null, 2));
    console.log(`Updated deployment data saved to ${newDeploymentPath}`);
  } else {
    console.log("No contracts were upgraded. Set environment variables to specify which contracts to upgrade:");
    console.log("  UPGRADE_REGISTRY=true");
    console.log("  UPGRADE_FACTORY=true");
    console.log("  UPGRADE_SHARETOKEN=true");
    console.log("  UPGRADE_DISTRIBUTOR=true");
  }

  console.log("Upgrade process completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during upgrade:", error);
    process.exit(1);
  }); 