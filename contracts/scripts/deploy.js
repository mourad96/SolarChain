// SPDX-License-Identifier: MIT
// Main deployment script for Solar Energy IoFy smart contracts
// This script deploys all the necessary contracts for the Solar Energy IoFy platform

const { ethers, network, run, upgrades } = require("hardhat");
const { updateFiles } = require("./update-addresses");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`Deploying contracts to ${network.name}...`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  // Set higher gas price to avoid "replacement transaction underpriced" error
  const overrides = {
    gasPrice: ethers.parseUnits("50", "gwei")
  };

  // Deploy SolarPanelRegistry (upgradeable)
  console.log("Deploying SolarPanelRegistry...");
  const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
  const registry = await upgrades.deployProxy(SolarPanelRegistry, [], {
    initializer: "initialize",
    kind: "uups",
  });
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`SolarPanelRegistry deployed to: ${registryAddress}`);

  // Deploy MockERC20 for dividend payments (needs to be deployed before Factory)
  console.log("Deploying MockERC20 (USDC)...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const paymentToken = await upgrades.deployProxy(
    MockERC20,
    ["USD Coin", "USDC"],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await paymentToken.waitForDeployment();
  const paymentTokenAddress = await paymentToken.getAddress();
  console.log(`MockERC20 (USDC) deployed to: ${paymentTokenAddress}`);

  // Mint some tokens to deployer for testing
  if (network.name !== "mainnet") {
    console.log("Minting test tokens to deployer...");
    const mintAmount = ethers.parseUnits("1000000", 18); // 1 million tokens
    await paymentToken.mint(deployer.address, mintAmount, overrides);
    console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} USDC to deployer`);

    // Mint tokens to investor addresses
    console.log("Minting test tokens to investors...");
    const investor1Address = process.env.INVESTOR1_ADDRESS;
    const investor2Address = process.env.INVESTOR2_ADDRESS;
    
    if (investor1Address) {
      await paymentToken.mint(investor1Address, mintAmount, overrides);
      console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} USDC to investor 1`);
    }
    
    if (investor2Address) {
      await paymentToken.mint(investor2Address, mintAmount, overrides);
      console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} USDC to investor 2`);
    }


    // Send 10 ETH to investor addresses
    const amount = ethers.parseUnits("10", "ether"); // 10 ETH

    const tx = await deployer.sendTransaction({
      to: investor1Address,
      value: amount,
    });

    console.log(`Sent 10 ETH to ${investor1Address}`);
    console.log("Transaction hash:", tx.hash);

    const tx2 = await deployer.sendTransaction({
      to: investor2Address,
      value: amount,
    });

    console.log(`Sent 10 ETH to ${investor2Address}`);
    console.log("Transaction hash:", tx2.hash);
  }

  // Deploy SolarPanelFactory (upgradeable) - now with both required parameters
  console.log("Deploying SolarPanelFactory...");
  const SolarPanelFactory = await ethers.getContractFactory("SolarPanelFactory");
  const factory = await upgrades.deployProxy(
    SolarPanelFactory,
    [registryAddress, paymentTokenAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`SolarPanelFactory deployed to: ${factoryAddress}`);

  // Grant FACTORY_ROLE to the factory address in registry
  console.log("Granting FACTORY_ROLE to factory in registry...");
  const FACTORY_ROLE = await registry.FACTORY_ROLE();
  const grantFactoryRoleTx = await registry.grantRole(FACTORY_ROLE, factoryAddress, overrides);
  await grantFactoryRoleTx.wait();
  console.log("FACTORY_ROLE granted to factory in registry");

  // Register a test panel before deploying ShareToken
  console.log("Registering a test panel...");
  const externalId = "TEST-PANEL-001";
  const capacity = ethers.parseEther("10"); // 10 kW capacity
  
  // Register the panel using the factory (since it now has the FACTORY_ROLE)
  const registerPanelTx = await registry.registerPanelByFactory(
    externalId,
    capacity,
    deployer.address,
    overrides
  );
  await registerPanelTx.wait();
  console.log("Test panel registered with ID: 1");

  // Deploy ShareToken (upgradeable) - using the registered panel ID
  console.log("Deploying ShareToken...");
  const ShareToken = await ethers.getContractFactory("ShareToken");
  const panelId = 1; // The first panel ID is 1
  const shareToken = await upgrades.deployProxy(
    ShareToken,
    ["Solar Panel Share", "SPS", registryAddress, panelId],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await shareToken.waitForDeployment();
  const shareTokenAddress = await shareToken.getAddress();
  console.log(`ShareToken deployed to: ${shareTokenAddress}`);
  
  // Link the share token to the panel in the registry
  console.log("Linking ShareToken to panel...");
  const linkShareTokenTx = await registry.linkShareToken(panelId, shareTokenAddress, overrides);
  await linkShareTokenTx.wait();
  console.log("ShareToken linked to panel");

  // Deploy DividendDistributor (upgradeable)
  console.log("Deploying DividendDistributor...");
  const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
  const dividendDistributor = await upgrades.deployProxy(
    DividendDistributor,
    [shareTokenAddress, registryAddress, paymentTokenAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await dividendDistributor.waitForDeployment();
  const dividendDistributorAddress = await dividendDistributor.getAddress();
  console.log(`DividendDistributor deployed to: ${dividendDistributorAddress}`);

  // Deploy TokenSale contract (upgradeable)
  console.log("Deploying TokenSale...");
  const TokenSale = await ethers.getContractFactory("TokenSale");
  const totalShares = 1000n; // 1000 shares available for sale
  const tokenPrice = ethers.parseUnits("10", 18); // 10 USDC per share
  const saleEndTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
  
  const tokenSale = await upgrades.deployProxy(
    TokenSale,
    [
      shareTokenAddress,
      paymentTokenAddress,
      totalShares,
      tokenPrice,
      saleEndTime
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await tokenSale.waitForDeployment();
  const tokenSaleAddress = await tokenSale.getAddress();
  console.log(`TokenSale deployed to: ${tokenSaleAddress}`);
  
  // Link the sale contract to the panel in the registry
  console.log("Linking TokenSale to panel...");
  const linkSaleContractTx = await registry.linkSaleContract(panelId, tokenSaleAddress, overrides);
  await linkSaleContractTx.wait();
  console.log("TokenSale linked to panel");

  // Setup roles
  console.log("Setting up roles...");
  
  // Grant MINTER_ROLE to the deployer account in ShareToken
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  const grantMinterRoleTx = await shareToken.grantRole(MINTER_ROLE, deployer.address, overrides);
  await grantMinterRoleTx.wait();
  console.log("MINTER_ROLE granted to deployer in ShareToken");

  // Grant DISTRIBUTOR_ROLE to the deployer account in DividendDistributor
  const DISTRIBUTOR_ROLE = await dividendDistributor.DISTRIBUTOR_ROLE();
  const grantDistributorRoleTx = await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, deployer.address, overrides);
  await grantDistributorRoleTx.wait();
  console.log("DISTRIBUTOR_ROLE granted to deployer in DividendDistributor");

  // Grant REGISTRAR_ROLE to the deployer account in SolarPanelFactory
  const REGISTRAR_ROLE = await factory.REGISTRAR_ROLE();
  const grantRegistrarRoleTx = await factory.grantRole(REGISTRAR_ROLE, deployer.address, overrides);
  await grantRegistrarRoleTx.wait();
  console.log("REGISTRAR_ROLE granted to deployer in SolarPanelFactory");

  // Grant PANEL_OWNER_ROLE to the deployer in registry
  const PANEL_OWNER_ROLE = await registry.PANEL_OWNER_ROLE();
  const grantPanelOwnerRoleTx = await registry.grantRole(PANEL_OWNER_ROLE, deployer.address, overrides);
  await grantPanelOwnerRoleTx.wait();
  console.log("PANEL_OWNER_ROLE granted to deployer in registry");

  // Grant EMERGENCY_ROLE to the deployer in registry
  const EMERGENCY_ROLE = await registry.EMERGENCY_ROLE();
  const grantEmergencyRoleTx = await registry.grantRole(EMERGENCY_ROLE, deployer.address, overrides);
  await grantEmergencyRoleTx.wait();
  console.log("EMERGENCY_ROLE granted to deployer in registry");

  // Verify contracts on Etherscan if not on a local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    // Wait for a few block confirmations to ensure the contracts are mined
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2s

    console.log("Verifying contracts on Etherscan...");
    try {
      // For upgradeable contracts, we need to verify the implementation contract
      // The proxy address is different from the implementation address
      const registryImplementationAddress = await upgrades.erc1967.getImplementationAddress(registryAddress);
      await run("verify:verify", {
        address: registryImplementationAddress,
        constructorArguments: [],
      });
      console.log("SolarPanelRegistry implementation verified");
    } catch (error) {
      console.log("Error verifying SolarPanelRegistry implementation:", error.message);
    }

    try {
      const factoryImplementationAddress = await upgrades.erc1967.getImplementationAddress(factoryAddress);
      await run("verify:verify", {
        address: factoryImplementationAddress,
        constructorArguments: [],
      });
      console.log("SolarPanelFactory implementation verified");
    } catch (error) {
      console.log("Error verifying SolarPanelFactory implementation:", error.message);
    }

    try {
      const paymentTokenImplementationAddress = await upgrades.erc1967.getImplementationAddress(paymentTokenAddress);
      await run("verify:verify", {
        address: paymentTokenImplementationAddress,
        constructorArguments: [],
      });
      console.log("MockERC20 implementation verified");
    } catch (error) {
      console.log("Error verifying MockERC20 implementation:", error.message);
    }

    try {
      const shareTokenImplementationAddress = await upgrades.erc1967.getImplementationAddress(shareTokenAddress);
      await run("verify:verify", {
        address: shareTokenImplementationAddress,
        constructorArguments: [],
      });
      console.log("ShareToken implementation verified");
    } catch (error) {
      console.log("Error verifying ShareToken implementation:", error.message);
    }

    try {
      const distributorImplementationAddress = await upgrades.erc1967.getImplementationAddress(dividendDistributorAddress);
      await run("verify:verify", {
        address: distributorImplementationAddress,
        constructorArguments: [],
      });
      console.log("DividendDistributor implementation verified");
    } catch (error) {
      console.log("Error verifying DividendDistributor implementation:", error.message);
    }

    try {
      const tokenSaleImplementationAddress = await upgrades.erc1967.getImplementationAddress(tokenSaleAddress);
      await run("verify:verify", {
        address: tokenSaleImplementationAddress,
        constructorArguments: [],
      });
      console.log("TokenSale implementation verified");
    } catch (error) {
      console.log("Error verifying TokenSale implementation:", error.message);
    }
  }

  // Print deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log({
    network: network.name,
    registry: registryAddress,
    factory: factoryAddress,
    paymentToken: paymentTokenAddress,
    shareToken: shareTokenAddress,
    dividendDistributor: dividendDistributorAddress,
    tokenSale: tokenSaleAddress
  });
  console.log("=========================\n");

  // Update .env and README.md with contract addresses
  const addresses = {
    registry: registryAddress,
    factory: factoryAddress,
    shareToken: shareTokenAddress,
    dividendDistributor: dividendDistributorAddress,
    paymentToken: paymentTokenAddress,
    tokenSale: tokenSaleAddress,
    network: network.name,
    timestamp: new Date().toISOString()
  };
  
  updateFiles(addresses);

  // Save deployment data to file for future upgrades
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentData = {
    ...addresses,
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(
    deploymentsDir,
    `deployment-${network.name}-${new Date().toISOString().replace(/:/g, "-")}.json`
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment data saved to ${deploymentPath}`);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  }); 