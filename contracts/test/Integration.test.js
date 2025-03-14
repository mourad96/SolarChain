const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Solar Energy IoFy Integration Tests", function () {
  let registry;
  let factory;
  let mockERC20;
  let shareToken;
  let dividendDistributor;
  let owner;
  let user1;
  let user2;
  let user3;
  
  // Roles
  let ADMIN_ROLE;
  let FACTORY_ROLE;
  let MINTER_ROLE;
  let DISTRIBUTOR_ROLE;
  let DEFAULT_ADMIN_ROLE;
  let PANEL_OWNER_ROLE;
  
  // Panel IDs
  let panelId1;
  let panelId2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Define roles
    DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
    MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
    PANEL_OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PANEL_OWNER_ROLE"));

    // Deploy SolarPanelRegistry
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    registry = await SolarPanelRegistry.deploy();
    await registry.waitForDeployment();

    // Deploy SolarPanelFactory
    const SolarPanelFactory = await ethers.getContractFactory("SolarPanelFactory");
    factory = await SolarPanelFactory.deploy(await registry.getAddress());
    await factory.waitForDeployment();

    // Set factory address in registry
    await registry.setFactoryAddress(await factory.getAddress());
    
    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("USD Coin", "USDC");
    await mockERC20.waitForDeployment();
    
    // Mint some tokens to owner for testing
    await mockERC20.mint(owner.address, ethers.parseEther("10000"));
    
    // Deploy ShareToken
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = await ShareToken.deploy(await registry.getAddress());
    await shareToken.waitForDeployment();
    
    // Deploy DividendDistributor
    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await DividendDistributor.deploy(
      await shareToken.getAddress(),
      await registry.getAddress(),
      await mockERC20.getAddress()
    );
    await dividendDistributor.waitForDeployment();
    
    // Grant roles
    // Registry roles - owner already has DEFAULT_ADMIN_ROLE and ADMIN_ROLE
    await registry.grantRole(FACTORY_ROLE, owner.address);
    
    // ShareToken roles - owner already has DEFAULT_ADMIN_ROLE
    await shareToken.grantRole(MINTER_ROLE, owner.address);
    
    // DividendDistributor roles - owner already has DEFAULT_ADMIN_ROLE
    await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, owner.address);
    
    // Register panels using factory
    const serialNumbers = ["SN001", "SN002"];
    const manufacturers = ["SolarCorp", "SunPower"];
    const names = ["Rooftop Panel 1", "Rooftop Panel 2"];
    const locations = ["New York", "Los Angeles"];
    const capacities = [5000, 6000]; // 5kW and 6kW
    
    // First, register a panel directly through the registry to get panelId1
    await registry.registerPanel(serialNumbers[0], manufacturers[0], capacities[0]);
    panelId1 = await registry.serialNumberToId(serialNumbers[0]);
    
    // Then register the second panel
    await registry.registerPanel(serialNumbers[1], manufacturers[1], capacities[1]);
    panelId2 = await registry.serialNumberToId(serialNumbers[1]);
  });

  describe("End-to-End Flow", function () {
    it("Should register panels, mint shares, distribute and claim dividends", async function () {
      // 1. Verify panels were registered correctly
      const panel1 = await registry.getPanelDetails(panelId1);
      const panel2 = await registry.getPanelDetails(panelId2);
      
      expect(panel1.serialNumber).to.equal("SN001");
      expect(panel2.serialNumber).to.equal("SN002");
      expect(panel1.manufacturer).to.equal("SolarCorp");
      expect(panel2.manufacturer).to.equal("SunPower");
      expect(panel1.capacity).to.equal(5000);
      expect(panel2.capacity).to.equal(6000);
      expect(panel1.owner).to.equal(owner.address);
      expect(panel2.owner).to.equal(owner.address);
      
      // 2. Mint shares for the panels
      const shares1 = ethers.parseEther("1000"); // 1000 shares for panel 1
      const shares2 = ethers.parseEther("1500"); // 1500 shares for panel 2
      
      await shareToken.mintShares(panelId1, shares1);
      await shareToken.mintShares(panelId2, shares2);
      
      // Verify shares were minted
      const [totalShares1, isMinted1] = await shareToken.getPanelTokenDetails(panelId1);
      const [totalShares2, isMinted2] = await shareToken.getPanelTokenDetails(panelId2);
      
      expect(totalShares1).to.equal(shares1);
      expect(totalShares2).to.equal(shares2);
      expect(isMinted1).to.be.true;
      expect(isMinted2).to.be.true;
      
      // 3. Transfer some shares to users
      await shareToken.transferPanelShares(panelId1, user1.address, ethers.parseEther("300"));
      await shareToken.transferPanelShares(panelId1, user2.address, ethers.parseEther("200"));
      await shareToken.transferPanelShares(panelId2, user2.address, ethers.parseEther("400"));
      await shareToken.transferPanelShares(panelId2, user3.address, ethers.parseEther("300"));
      
      // Verify share transfers
      expect(await shareToken.getPanelBalance(panelId1, owner.address)).to.equal(ethers.parseEther("500"));
      expect(await shareToken.getPanelBalance(panelId1, user1.address)).to.equal(ethers.parseEther("300"));
      expect(await shareToken.getPanelBalance(panelId1, user2.address)).to.equal(ethers.parseEther("200"));
      expect(await shareToken.getPanelBalance(panelId2, owner.address)).to.equal(ethers.parseEther("800"));
      expect(await shareToken.getPanelBalance(panelId2, user2.address)).to.equal(ethers.parseEther("400"));
      expect(await shareToken.getPanelBalance(panelId2, user3.address)).to.equal(ethers.parseEther("300"));
      
      // 4. Distribute dividends
      const dividend1 = ethers.parseEther("100"); // 100 USDC for panel 1
      const dividend2 = ethers.parseEther("150"); // 150 USDC for panel 2
      
      // Approve dividend distributor to spend tokens
      await mockERC20.approve(await dividendDistributor.getAddress(), ethers.parseEther("250"));
      
      // Distribute dividends
      await dividendDistributor.distributeDividends(panelId1, dividend1);
      await dividendDistributor.distributeDividends(panelId2, dividend2);
      
      // 5. Claim dividends
      // Calculate expected dividends for each user using BigInt arithmetic
      const user1Shares = ethers.parseEther("300");
      const user2Shares1 = ethers.parseEther("200");
      const user2Shares2 = ethers.parseEther("400");
      const user3Shares = ethers.parseEther("300");
      
      const user1ExpectedDividend = (BigInt(dividend1) * BigInt(user1Shares)) / BigInt(shares1);
      const user2ExpectedDividend1 = (BigInt(dividend1) * BigInt(user2Shares1)) / BigInt(shares1);
      const user2ExpectedDividend2 = (BigInt(dividend2) * BigInt(user2Shares2)) / BigInt(shares2);
      const user2TotalExpectedDividend = user2ExpectedDividend1 + user2ExpectedDividend2;
      const user3ExpectedDividend = (BigInt(dividend2) * BigInt(user3Shares)) / BigInt(shares2);
      
      // Get initial balances
      const user1InitialBalance = await mockERC20.balanceOf(user1.address);
      const user2InitialBalance = await mockERC20.balanceOf(user2.address);
      const user3InitialBalance = await mockERC20.balanceOf(user3.address);
      
      // Claim dividends
      await dividendDistributor.connect(user1).claimDividends(panelId1);
      await dividendDistributor.connect(user2).claimDividends(panelId1);
      await dividendDistributor.connect(user2).claimDividends(panelId2);
      await dividendDistributor.connect(user3).claimDividends(panelId2);
      
      // Verify dividend claims
      const user1FinalBalance = await mockERC20.balanceOf(user1.address);
      const user2FinalBalance = await mockERC20.balanceOf(user2.address);
      const user3FinalBalance = await mockERC20.balanceOf(user3.address);
      
      expect(BigInt(user1FinalBalance) - BigInt(user1InitialBalance)).to.equal(user1ExpectedDividend);
      expect(BigInt(user2FinalBalance) - BigInt(user2InitialBalance)).to.equal(user2TotalExpectedDividend);
      expect(BigInt(user3FinalBalance) - BigInt(user3InitialBalance)).to.equal(user3ExpectedDividend);
      
      // 6. Verify unclaimed dividends are now 0
      expect(await dividendDistributor.getUnclaimedDividends(panelId1, user1.address)).to.equal(0);
      expect(await dividendDistributor.getUnclaimedDividends(panelId1, user2.address)).to.equal(0);
      expect(await dividendDistributor.getUnclaimedDividends(panelId2, user2.address)).to.equal(0);
      expect(await dividendDistributor.getUnclaimedDividends(panelId2, user3.address)).to.equal(0);
    });
  });
  
  describe("System Pause and Unpause", function () {
    it("Should pause and unpause the entire system", async function () {
      // Pause all contracts
      await registry.pause();
      await factory.pause();
      await shareToken.pause();
      await dividendDistributor.pause();
      
      // Try operations while paused
      await expect(
        factory.registerPanelsBatchSimple(
          ["SN003"],
          ["SolarCorp"],
          [5000]
        )
      ).to.be.revertedWith("Pausable: paused");
      
      await expect(
        shareToken.mintShares(panelId1, ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
      
      await expect(
        dividendDistributor.distributeDividends(panelId1, ethers.parseEther("10"))
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause all contracts
      await registry.unpause();
      await factory.unpause();
      await shareToken.unpause();
      await dividendDistributor.unpause();
      
      // Verify operations work after unpausing
      await registry.registerPanel("SN003", "SolarCorp", 5000);
      
      // Verify the panel was registered
      const panelId3 = await registry.serialNumberToId("SN003");
      const panel3 = await registry.getPanelDetails(panelId3);
      expect(panel3.serialNumber).to.equal("SN003");
    });
  });
  
  describe("Access Control", function () {
    it("Should enforce proper access control across the system", async function () {
      // Try to mint shares without MINTER_ROLE
      await expect(
        shareToken.connect(user1).mintShares(panelId1, ethers.parseEther("100"))
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + MINTER_ROLE);
      
      // Try to distribute dividends without DISTRIBUTOR_ROLE
      await expect(
        dividendDistributor.connect(user1).distributeDividends(panelId1, ethers.parseEther("10"))
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + DISTRIBUTOR_ROLE);
      
      // Try to pause contracts without ADMIN_ROLE
      await expect(
        registry.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
      
      // Grant roles to user1
      await shareToken.grantRole(MINTER_ROLE, user1.address);
      await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, user1.address);
      await registry.grantRole(ADMIN_ROLE, user1.address);
      
      // Verify operations work after granting roles
      await shareToken.connect(user1).mintShares(panelId1, ethers.parseEther("100"));
      
      // Approve tokens for dividend distribution
      await mockERC20.transfer(user1.address, ethers.parseEther("10"));
      await mockERC20.connect(user1).approve(await dividendDistributor.getAddress(), ethers.parseEther("10"));
      
      await dividendDistributor.connect(user1).distributeDividends(panelId1, ethers.parseEther("10"));
      await registry.connect(user1).pause();
      
      // Revoke roles from user1
      await shareToken.revokeRole(MINTER_ROLE, user1.address);
      await dividendDistributor.revokeRole(DISTRIBUTOR_ROLE, user1.address);
      await registry.revokeRole(ADMIN_ROLE, user1.address);
      
      // Unpause for further tests
      await registry.unpause();
      
      // Verify operations fail after revoking roles
      await expect(
        shareToken.connect(user1).mintShares(panelId1, ethers.parseEther("100"))
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + MINTER_ROLE);
    });
  });
}); 