import { expect } from "chai";
import { ethers } from "hardhat";
import { upgrades } from "hardhat";

describe("Solar Energy IoFy Integration Tests", function () {
  let registry;
  let factory;
  let shareToken;
  let shareToken2;
  let dividendDistributor;
  let mockERC20;
  let owner;
  let user1;
  let user2;
  let panelId1;
  let panelId2;
  let shareTokenAddress1;
  let shareTokenAddress2;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const minimumPanelCapacity = ethers.parseEther("0.1");
  const totalShares = ethers.parseEther("1000");
  
  // Roles
  let MINTER_ROLE;
  let PANEL_OWNER_ROLE;
  let REGISTRAR_ROLE;
  
  // Parameters
  let defaultSharesPerPanel;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Define roles
    MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    PANEL_OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PANEL_OWNER_ROLE"));
    REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
    
    // Set parameters
    defaultSharesPerPanel = ethers.parseEther("1000");

    // Deploy SolarPanelRegistry using upgrades.deployProxy
    const SolarPanelRegistryFactory = await ethers.getContractFactory("SolarPanelRegistry");
    registry = await upgrades.deployProxy(
      SolarPanelRegistryFactory, 
      [], 
      { initializer: "initialize", kind: "uups" }
    );
    await registry.waitForDeployment();

    // Deploy SolarPanelFactory using upgrades.deployProxy
    const SolarPanelFactoryFactory = await ethers.getContractFactory("SolarPanelFactory");
    factory = await upgrades.deployProxy(
      SolarPanelFactoryFactory, 
      [await registry.getAddress()], 
      { initializer: "initialize", kind: "uups" }
    );
    await factory.waitForDeployment();

    // Grant roles
    await registry.grantRole(FACTORY_ROLE, await factory.getAddress());
    await registry.grantRole(FACTORY_ROLE, owner.address);
    await registry.grantRole(DEFAULT_ADMIN_ROLE, await factory.getAddress());
    await registry.grantRole(REGISTRAR_ROLE, owner.address);
    await factory.grantRole(REGISTRAR_ROLE, owner.address);
    
    // Deploy MockERC20 using upgrades.deployProxy
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await upgrades.deployProxy(
      MockERC20Factory,
      ["USD Coin", "USDC"],
      { initializer: "initialize", kind: "uups" }
    );
    await mockERC20.waitForDeployment();
    
    // Mint some tokens to owner for testing
    await mockERC20.mint(owner.address, ethers.parseEther("10000"));
    
    // Create panels with shares using factory
    const tx1 = await factory.createPanelWithShares(
      "SN001",
      "Solar Panel Share 1",
      "SPS1",
      ethers.parseEther("1000"),
      minimumPanelCapacity,
      0,
      0,
      0
    );
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    if (!event1) {
      throw new Error("PanelAndSharesCreated event not found");
    }
    const parsedLog1 = factory.interface.parseLog(event1);
    panelId1 = parsedLog1.args[0]; // Use array index instead of named property
    shareTokenAddress1 = parsedLog1.args[1]; // Use array index instead of named property
    
    const tx2 = await factory.createPanelWithShares(
      "SN002",
      "Solar Panel Share 2",
      "SPS2",
      ethers.parseEther("1000"),
      minimumPanelCapacity,
      0,
      0,
      0
    );
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    if (!event2) {
      throw new Error("PanelAndSharesCreated event not found");
    }
    const parsedLog2 = factory.interface.parseLog(event2);
    panelId2 = parsedLog2.args[0]; // Use array index instead of named property
    shareTokenAddress2 = parsedLog2.args[1]; // Use array index instead of named property
    
    // Get ShareToken instances
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = ShareToken.attach(shareTokenAddress1);
    shareToken2 = ShareToken.attach(shareTokenAddress2);
    
    // Deploy DividendDistributor using upgrades.deployProxy
    const DividendDistributorFactory = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await upgrades.deployProxy(
      DividendDistributorFactory,
      [
        shareTokenAddress1,
        await registry.getAddress(),
        await mockERC20.getAddress()
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await dividendDistributor.waitForDeployment();

    // Grant DISTRIBUTOR_ROLE to owner and DividendDistributor
    await registry.grantRole(DISTRIBUTOR_ROLE, owner.address);
    await registry.grantRole(DISTRIBUTOR_ROLE, await dividendDistributor.getAddress());
    await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, owner.address);
    await dividendDistributor.grantRole(ADMIN_ROLE, owner.address);
    
    // Grant MINTER_ROLE to owner
    await shareToken.grantRole(MINTER_ROLE, owner.address);
    await shareToken2.grantRole(MINTER_ROLE, owner.address);
  });

  describe("End-to-End Flow", function () {
    it("Should register panels, mint shares, distribute and claim dividends", async function () {
      // 1. Verify panels were registered correctly
      const panel1 = await registry.panels(panelId1);
      const panel2 = await registry.panels(panelId2);
      
      expect(panel1.externalId).to.equal("SN001");
      expect(panel2.externalId).to.equal("SN002");
      expect(panel1.isActive).to.be.true;
      expect(panel2.isActive).to.be.true;
      expect(panel1.owner).to.equal(owner.address);
      expect(panel2.owner).to.equal(owner.address);
      
      // 2. Verify shares were minted correctly
      const [totalSupply1, isActive1] = await shareToken.getTokenDetails();
      const [totalSupply2, isActive2] = await shareToken2.getTokenDetails();
      
      expect(totalSupply1).to.equal(ethers.parseEther("1000"));
      expect(totalSupply2).to.equal(ethers.parseEther("1500"));
      expect(isActive1).to.be.true;
      expect(isActive2).to.be.true;
      
      // 3. Transfer some shares to users
      await shareToken.transfer(user1.address, ethers.parseEther("300"));
      await shareToken.transfer(user2.address, ethers.parseEther("200"));
      await shareToken2.transfer(user2.address, ethers.parseEther("400"));
      
      // Verify share transfers
      expect(await shareToken.balanceOf(owner.address)).to.equal(ethers.parseEther("500"));
      expect(await shareToken.balanceOf(user1.address)).to.equal(ethers.parseEther("300"));
      expect(await shareToken.balanceOf(user2.address)).to.equal(ethers.parseEther("200"));
      expect(await shareToken2.balanceOf(owner.address)).to.equal(ethers.parseEther("1100"));
      expect(await shareToken2.balanceOf(user2.address)).to.equal(ethers.parseEther("400"));
      
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
      
      const totalShares1BigInt = ethers.parseEther("1000");
      const totalShares2BigInt = ethers.parseEther("1500");
      
      const user1ExpectedDividend = (BigInt(dividend1) * BigInt(user1Shares)) / totalShares1BigInt;
      const user2ExpectedDividend1 = (BigInt(dividend1) * BigInt(user2Shares1)) / totalShares1BigInt;
      const user2ExpectedDividend2 = (BigInt(dividend2) * BigInt(user2Shares2)) / totalShares2BigInt;
      const user2TotalExpectedDividend = user2ExpectedDividend1 + user2ExpectedDividend2;
      
      // Get initial balances
      const user1InitialBalance = await mockERC20.balanceOf(user1.address);
      const user2InitialBalance = await mockERC20.balanceOf(user2.address);
      
      // Claim dividends
      await dividendDistributor.connect(user1).claimDividends(panelId1);
      await dividendDistributor.connect(user2).claimDividends(panelId1);
      await dividendDistributor.connect(user2).claimDividends(panelId2);
      
      // Verify dividend claims
      const user1FinalBalance = await mockERC20.balanceOf(user1.address);
      const user2FinalBalance = await mockERC20.balanceOf(user2.address);
      
      expect(BigInt(user1FinalBalance) - BigInt(user1InitialBalance)).to.equal(user1ExpectedDividend);
      expect(BigInt(user2FinalBalance) - BigInt(user2InitialBalance)).to.equal(user2TotalExpectedDividend);
      
      // 6. Verify unclaimed dividends are now 0
      expect(await dividendDistributor.getUnclaimedDividends(panelId1, user1.address)).to.equal(0);
      expect(await dividendDistributor.getUnclaimedDividends(panelId1, user2.address)).to.equal(0);
      expect(await dividendDistributor.getUnclaimedDividends(panelId2, user2.address)).to.equal(0);
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
        factory.createPanelWithShares(
          "SN003",
          "Solar Panel Share 3",
          "SPS3",
          ethers.parseEther("1000")
        )
      ).to.be.revertedWith("Pausable: paused");
      
      await expect(
        shareToken.mintShares(ethers.parseEther("100"), owner.address)
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
      const tx3 = await factory.createPanelWithShares(
        "SN003",
        "Solar Panel Share 3",
        "SPS3",
        ethers.parseEther("1000")
      );
      const receipt3 = await tx3.wait();
      const event3 = receipt3.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'PanelAndSharesCreated';
        } catch (e) {
          return false;
        }
      });
      if (!event3) {
        throw new Error("PanelAndSharesCreated event not found");
      }
      const parsedLog3 = factory.interface.parseLog(event3);
      const panelId3 = parsedLog3.args[0]; // Use array index instead of named property
      
      // Verify the panel was registered
      const panel3 = await registry.panels(panelId3);
      expect(panel3.externalId).to.equal("SN003");
    });
  });
  
  describe("Access Control", function () {
    it("Should enforce proper access control across the system", async function () {
      // Create a new panel with shares for testing
      const tx3 = await factory.createPanelWithShares(
        "SN003",
        "Solar Panel Share 3",
        "SPS3",
        ethers.parseEther("1000")
      );
      const receipt3 = await tx3.wait();
      const event3 = receipt3.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'PanelAndSharesCreated';
        } catch (e) {
          return false;
        }
      });
      if (!event3) {
        throw new Error("PanelAndSharesCreated event not found");
      }
      const parsedLog3 = factory.interface.parseLog(event3);
      const panelId3 = parsedLog3.args[0];
      const shareTokenAddress3 = parsedLog3.args[1];

      // Get the new ShareToken instance
      const ShareToken = await ethers.getContractFactory("ShareToken");
      const shareToken3 = ShareToken.attach(shareTokenAddress3);

      // Try to create a panel without REGISTRAR_ROLE
      await expect(
        factory.connect(user1).createPanelWithShares(
          "SN004",
          "Solar Panel Share 4",
          "SPS4",
          ethers.parseEther("1000")
        )
      ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${REGISTRAR_ROLE}`);
      
      // Try to distribute dividends without DISTRIBUTOR_ROLE
      await expect(
        dividendDistributor.connect(user1).distributeDividends(panelId3, ethers.parseEther("10"))
      ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${DISTRIBUTOR_ROLE}`);
      
      // Try to pause contracts without ADMIN_ROLE
      await expect(
        registry.connect(user1).pause()
      ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${ADMIN_ROLE}`);
      
      // Grant roles to user1
      await factory.grantRole(REGISTRAR_ROLE, user1.address);
      await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, user1.address);
      await registry.grantRole(ADMIN_ROLE, user1.address);
      
      // Verify operations work after granting roles
      const tx4 = await factory.connect(user1).createPanelWithShares(
        "SN004",
        "Solar Panel Share 4",
        "SPS4",
        ethers.parseEther("1000")
      );
      await tx4.wait();
      
      // Approve tokens for dividend distribution
      await mockERC20.transfer(user1.address, ethers.parseEther("10"));
      await mockERC20.connect(user1).approve(await dividendDistributor.getAddress(), ethers.parseEther("10"));
      
      await dividendDistributor.connect(user1).distributeDividends(panelId3, ethers.parseEther("10"));
      await registry.connect(user1).pause();
      
      // Revoke roles from user1
      await factory.revokeRole(REGISTRAR_ROLE, user1.address);
      await dividendDistributor.revokeRole(DISTRIBUTOR_ROLE, user1.address);
      await registry.revokeRole(ADMIN_ROLE, user1.address);
      
      // Unpause for further tests
      await registry.unpause();
      
      // Verify operations fail after revoking roles
      await expect(
        factory.connect(user1).createPanelWithShares(
          "SN005",
          "Solar Panel Share 5",
          "SPS5",
          ethers.parseEther("1000")
        )
      ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${REGISTRAR_ROLE}`);
    });
  });
}); 