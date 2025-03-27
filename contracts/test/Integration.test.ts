import { expect } from "chai";
import { ethers } from "hardhat";
import { upgrades } from "hardhat";
import { SolarPanelRegistry, SolarPanelFactory, ShareToken, DividendDistributor, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Solar Energy IoFy Integration Tests", function () {
  let registry: SolarPanelRegistry;
  let factory: SolarPanelFactory;
  let shareToken: ShareToken;
  let shareToken2: ShareToken;
  let dividendDistributor: DividendDistributor;
  let mockERC20: MockERC20;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let panelId1: bigint;
  let panelId2: bigint;
  let shareTokenAddress1: string;
  let shareTokenAddress2: string;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const minimumPanelCapacity = ethers.parseEther("0.1");
  const totalShares = 1000n;
  
  // Roles
  let MINTER_ROLE: string;
  let PANEL_OWNER_ROLE: string;
  let REGISTRAR_ROLE: string;
  
  // Parameters
  let defaultSharesPerPanel: bigint;

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
    
    // Deploy SolarPanelFactory using upgrades.deployProxy
    const SolarPanelFactoryFactory = await ethers.getContractFactory("SolarPanelFactory");
    factory = await upgrades.deployProxy(
      SolarPanelFactoryFactory, 
      [await registry.getAddress(), await mockERC20.getAddress()], 
      { initializer: "initialize", kind: "uups" }
    );
    await factory.waitForDeployment();

    // Grant roles
    await registry.grantRole(FACTORY_ROLE, await factory.getAddress());
    await registry.grantRole(FACTORY_ROLE, owner.address);
    await registry.grantRole(DEFAULT_ADMIN_ROLE, await factory.getAddress());
    await registry.grantRole(REGISTRAR_ROLE, owner.address);
    await factory.grantRole(REGISTRAR_ROLE, owner.address);
    
    // Create panels with shares using factory
    const tx1 = await factory.createPanelWithShares(
      "SN001",
      "Solar Panel Share 1",
      "SPS1",
      minimumPanelCapacity, // capacity
      totalShares, // totalShares
      ethers.parseUnits("1", "ether"), // tokenPrice (non-zero)
      Math.floor(Date.now() / 1000) + 86400, // saleEndTime (future time)
      ethers.ZeroAddress // payment token (use default)
    );
    const receipt1 = await tx1.wait();
    if (!receipt1) throw new Error("Transaction failed");
    
    const event1 = receipt1.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    if (!event1) throw new Error("PanelAndSharesCreated event not found");
    
    const parsedLog1 = factory.interface.parseLog(event1);
    if (!parsedLog1) throw new Error("Failed to parse PanelAndSharesCreated event");
    panelId1 = parsedLog1.args[0]; // Use array index instead of named property
    shareTokenAddress1 = parsedLog1.args[1]; // Use array index instead of named property
    
    const tx2 = await factory.createPanelWithShares(
      "SN002",
      "Solar Panel Share 2",
      "SPS2",
      minimumPanelCapacity, // capacity
      totalShares, // totalShares
      ethers.parseUnits("1", "ether"), // tokenPrice (non-zero)
      Math.floor(Date.now() / 1000) + 86400, // saleEndTime (future time)
      ethers.ZeroAddress // payment token (use default)
    );
    const receipt2 = await tx2.wait();
    if (!receipt2) throw new Error("Transaction failed");
    
    const event2 = receipt2.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    if (!event2) throw new Error("PanelAndSharesCreated event not found");
    
    const parsedLog2 = factory.interface.parseLog(event2);
    if (!parsedLog2) throw new Error("Failed to parse PanelAndSharesCreated event");
    panelId2 = parsedLog2.args[0]; // Use array index instead of named property
    shareTokenAddress2 = parsedLog2.args[1];
    
    // Get contract instances
    shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress1) as ShareToken;
    shareToken2 = await ethers.getContractAt("ShareToken", shareTokenAddress2) as ShareToken;
    
    // Deploy DividendDistributor using upgrades.deployProxy
    const DividendDistributorFactory = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await upgrades.deployProxy(
      DividendDistributorFactory,
      [
        await shareToken.getAddress(),
        await registry.getAddress(),
        await mockERC20.getAddress()
      ],
      { initializer: "initialize", kind: "uups" }
    ) as unknown as DividendDistributor;
    await dividendDistributor.waitForDeployment();
    
    // Grant roles
    await registry.grantRole(ADMIN_ROLE, owner.address);
    await shareToken.grantRole(MINTER_ROLE, owner.address);
    await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, owner.address);
    await dividendDistributor.grantRole(ADMIN_ROLE, owner.address);
    
    // Approve tokens for distributor
    await mockERC20.approve(await dividendDistributor.getAddress(), ethers.parseEther("1000"));
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
      const shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress1);
      const shareToken2 = await ethers.getContractAt("ShareToken", shareTokenAddress2);
      
      const [totalSupply1, isActive1] = await shareToken.getTokenDetails();
      const [totalSupply2, isActive2] = await shareToken2.getTokenDetails();
      
      expect(totalSupply1).to.equal(totalShares);
      expect(totalSupply2).to.equal(totalShares);
      expect(isActive1).to.be.true;
      expect(isActive2).to.be.true;
      
      // Get the sale contract addresses
      const saleAddress1 = await registry.getSaleContractAddress(panelId1);
      const saleAddress2 = await registry.getSaleContractAddress(panelId2);
      const tokenSale1 = await ethers.getContractAt("TokenSale", saleAddress1);
      const tokenSale2 = await ethers.getContractAt("TokenSale", saleAddress2);
      
      // Get the payment token (USDC)
      const paymentToken = await ethers.getContractAt("MockERC20", await mockERC20.getAddress());
      
      // Mint USDC to users for purchasing shares
      await mockERC20.mint(user1.address, ethers.parseEther("10000"));
      await mockERC20.mint(user2.address, ethers.parseEther("10000"));
      
      // Purchase shares from the sale contracts
      const price1 = await tokenSale1.price();
      const price2 = await tokenSale2.price();
      
      // Calculate payment amounts
      const user1PurchaseAmount1 = 300n; // 300 shares for user1
      const user2PurchaseAmount1 = 200n; // 200 shares for user2 from panel 1
      const user2PurchaseAmount2 = 400n; // 400 shares for user2 from panel 2
      
      const user1PaymentAmount1 = user1PurchaseAmount1 * price1;
      const user2PaymentAmount1 = user2PurchaseAmount1 * price1;
      const user2PaymentAmount2 = user2PurchaseAmount2 * price2;
      
      // Approve and purchase shares for users
      // User1 purchases from panel 1
      await mockERC20.connect(user1).approve(saleAddress1, user1PaymentAmount1);
      await tokenSale1.connect(user1).purchaseTokens(user1PurchaseAmount1);
      
      // User2 purchases from both panels
      await mockERC20.connect(user2).approve(saleAddress1, user2PaymentAmount1);
      await mockERC20.connect(user2).approve(saleAddress2, user2PaymentAmount2);
      await tokenSale1.connect(user2).purchaseTokens(user2PurchaseAmount1);
      await tokenSale2.connect(user2).purchaseTokens(user2PurchaseAmount2);
      
      // Verify share balances
      expect(await shareToken.balanceOf(user1.address)).to.equal(user1PurchaseAmount1);
      expect(await shareToken.balanceOf(user2.address)).to.equal(user2PurchaseAmount1);
      expect(await shareToken2.balanceOf(user2.address)).to.equal(user2PurchaseAmount2);
      
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
      const user1Shares = 300n;
      const user2Shares1 = 200n;
      const user2Shares2 = 400n;
      
      const totalShares1BigInt = 1000n;
      const totalShares2BigInt = 1000n;
      
      const user1ExpectedDividend = ((dividend1) * user1Shares) / totalShares1BigInt;
      const user2ExpectedDividend1 = ((dividend1) * user2Shares1) / totalShares1BigInt;
      const user2ExpectedDividend2 = ((dividend2) * user2Shares2) / totalShares2BigInt;
      const user2TotalExpectedDividend = user2ExpectedDividend1 + user2ExpectedDividend2;
      console.log("dividend1", dividend1);
      console.log("dividend2", dividend2);
      console.log("user1Shares", user1Shares);
      console.log("user2Shares1", user2Shares1);
      console.log("user2Shares2", user2Shares2);
      console.log("totalShares1BigInt", totalShares1BigInt);
      console.log("totalShares2BigInt", totalShares2BigInt);
      console.log("user1ExpectedDividend", user1ExpectedDividend);
      console.log("user2TotalExpectedDividend", user2TotalExpectedDividend);
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
          minimumPanelCapacity, // capacity
          totalShares, // totalShares
          ethers.parseUnits("1", "finney"), // tokenPrice
          Math.floor(Date.now() / 1000) + 86400, // saleEndTime
          await mockERC20.getAddress() // payment token
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
        minimumPanelCapacity, // capacity
        totalShares, // totalShares
        ethers.parseUnits("1", "finney"), // tokenPrice
        Math.floor(Date.now() / 1000) + 86400, // saleEndTime
        await mockERC20.getAddress() // payment token
      );
      const receipt3 = await tx3.wait();
      if (!receipt3) throw new Error("Transaction failed");
      
      const event3 = receipt3.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'PanelAndSharesCreated';
        } catch (e) {
          return false;
        }
      });
      if (!event3) throw new Error("PanelAndSharesCreated event not found");
      
      const parsedLog3 = factory.interface.parseLog(event3);
      if (!parsedLog3) throw new Error("Failed to parse PanelAndSharesCreated event");
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
        minimumPanelCapacity, // capacity
        totalShares, // totalShares
        ethers.parseUnits("1", "finney"), // tokenPrice
        Math.floor(Date.now() / 1000) + 86400, // saleEndTime
        await mockERC20.getAddress() // payment token
      );
      const receipt3 = await tx3.wait();
      if (!receipt3) throw new Error("Transaction failed");
      
      const event3 = receipt3.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'PanelAndSharesCreated';
        } catch (e) {
          return false;
        }
      });
      if (!event3) throw new Error("PanelAndSharesCreated event not found");
      
      const parsedLog3 = factory.interface.parseLog(event3);
      if (!parsedLog3) throw new Error("Failed to parse PanelAndSharesCreated event");
      const panelId3 = parsedLog3.args[0];
      const shareTokenAddress3 = parsedLog3.args[1];

      // Get the new ShareToken instance
      const shareToken3 = await ethers.getContractAt("ShareToken", shareTokenAddress3) as ShareToken;

      // Try to create a panel without REGISTRAR_ROLE
      await expect(
        factory.connect(user1).createPanelWithShares(
          "SN004",
          "Solar Panel Share 4",
          "SPS4",
          minimumPanelCapacity, // capacity
          totalShares, // totalShares
          ethers.parseUnits("1", "finney"), // tokenPrice
          Math.floor(Date.now() / 1000) + 86400, // saleEndTime
          await mockERC20.getAddress() // payment token
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
        minimumPanelCapacity, // capacity
        totalShares, // totalShares
        ethers.parseUnits("1", "finney"), // tokenPrice
        Math.floor(Date.now() / 1000) + 86400, // saleEndTime
        await mockERC20.getAddress() // payment token
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
          minimumPanelCapacity, // capacity
          totalShares, // totalShares
          ethers.parseUnits("1", "finney"), // tokenPrice
          Math.floor(Date.now() / 1000) + 86400, // saleEndTime
          await mockERC20.getAddress() // payment token
        )
      ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${REGISTRAR_ROLE}`);
    });
  });
}); 