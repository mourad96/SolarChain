import { expect } from "chai";
import { ethers } from "hardhat";
import { SolarPanelRegistry, ShareToken, DividendDistributor, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Import upgrades from hardhat
const { upgrades } = require("hardhat");

describe("DividendDistributor", function () {
  let solarPanelRegistry: SolarPanelRegistry;
  let shareToken: ShareToken;
  let dividendDistributor: DividendDistributor;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let panelId: bigint;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  
  const totalShares = ethers.parseEther("1000");
  const user1Shares = ethers.parseEther("300");
  const user2Shares = ethers.parseEther("200");
  const ownerShares = totalShares - user1Shares - user2Shares;
  
  const dividendAmount = ethers.parseEther("100");
  const minimumPanelCapacity = ethers.parseEther("0.1");

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy SolarPanelRegistry using upgrades.deployProxy
    const SolarPanelRegistryFactory = await ethers.getContractFactory("SolarPanelRegistry");
    solarPanelRegistry = await upgrades.deployProxy(
      SolarPanelRegistryFactory, 
      [minimumPanelCapacity], 
      { initializer: "initialize", kind: "uups" }
    );
    await solarPanelRegistry.waitForDeployment();

    // Deploy SolarPanelFactory using upgrades.deployProxy
    const SolarPanelFactoryFactory = await ethers.getContractFactory("SolarPanelFactory");
    const factory = await upgrades.deployProxy(
      SolarPanelFactoryFactory,
      [await solarPanelRegistry.getAddress()],
      { initializer: "initialize", kind: "uups" }
    );
    await factory.waitForDeployment();

    // Grant roles
    await solarPanelRegistry.grantRole(FACTORY_ROLE, await factory.getAddress());
    await solarPanelRegistry.grantRole(DEFAULT_ADMIN_ROLE, await factory.getAddress());
    await factory.grantRole(REGISTRAR_ROLE, owner.address);
    
    // Create panel with shares
    const tx = await factory.createPanelWithShares(
      "SN001",
      "Solar Panel Share 1",
      "SPS1",
      totalShares
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    
    if (!event) {
      throw new Error("PanelAndSharesCreated event not found");
    }
    
    const parsedLog = factory.interface.parseLog(event);
    panelId = parsedLog.args.panelId;
    const shareTokenAddress = parsedLog.args.shareToken;
    
    shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress);
    
    // Transfer some shares to users
    await shareToken.transfer(user1.address, user1Shares);
    await shareToken.transfer(user2.address, user2Shares);
    
    // Deploy MockERC20 using upgrades.deployProxy
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await upgrades.deployProxy(
      MockERC20Factory,
      ["USD Coin", "USDC"],
      { initializer: "initialize", kind: "uups" }
    );
    await mockToken.waitForDeployment();
    
    // Mint tokens to owner for distribution
    await mockToken.mint(owner.address, ethers.parseEther("1000"));
    
    // Deploy DividendDistributor using upgrades.deployProxy
    const DividendDistributorFactory = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await upgrades.deployProxy(
      DividendDistributorFactory,
      [
        await shareToken.getAddress(),
        await solarPanelRegistry.getAddress(),
        await mockToken.getAddress()
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await dividendDistributor.waitForDeployment();
    
    // Grant roles
    await solarPanelRegistry.grantRole(FACTORY_ROLE, owner.address);
    await solarPanelRegistry.grantRole(ADMIN_ROLE, owner.address);
    await shareToken.grantRole(MINTER_ROLE, owner.address);
    await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, owner.address);
    await dividendDistributor.grantRole(ADMIN_ROLE, owner.address);
    
    // Approve tokens for distributor
    await mockToken.approve(await dividendDistributor.getAddress(), ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dividendDistributor.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the right roles", async function () {
      expect(await dividendDistributor.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await dividendDistributor.hasRole(DISTRIBUTOR_ROLE, owner.address)).to.be.true;
    });

    it("Should set the right token addresses", async function () {
      expect(await dividendDistributor.shareToken()).to.equal(await shareToken.getAddress());
      expect(await dividendDistributor.panelRegistry()).to.equal(await solarPanelRegistry.getAddress());
      expect(await dividendDistributor.paymentToken()).to.equal(await mockToken.getAddress());
    });
  });

  describe("Dividend Distribution", function () {
    it("Should distribute dividends for a panel", async function () {
      // Get the current block timestamp
      const latestBlock = await ethers.provider.getBlock('latest');
      const timestamp = latestBlock ? latestBlock.timestamp : Math.floor(Date.now() / 1000);
      
      // Distribute dividends and check for event emission
      const tx = await dividendDistributor.distributeDividends(panelId, dividendAmount);
      const receipt = await tx.wait();
      
      // Verify event was emitted
      if (receipt) {
        const events = receipt.logs.filter(log => {
          try {
            return dividendDistributor.interface.parseLog(log)?.name === 'DividendDistributed';
          } catch (e) {
            return false;
          }
        });
        
        expect(events.length).to.be.greaterThan(0);
        
        const parsedLog = dividendDistributor.interface.parseLog(events[0]);
        if (parsedLog && parsedLog.args) {
          expect(parsedLog.args.panelId).to.equal(panelId);
          expect(parsedLog.args.amount).to.equal(dividendAmount);
          // Don't check the exact timestamp as it can vary
        }
      }
      
      // Check dividend history
      const history = await dividendDistributor.getDividendHistory(panelId);
      expect(history[0].amount).to.equal(dividendAmount);
      expect(history[0].distributed).to.be.true;
    });
    
    it("Should not allow distribution for non-existent panel", async function () {
      const nonExistentPanelId = 9999;
      
      await expect(
        dividendDistributor.distributeDividends(nonExistentPanelId, dividendAmount)
      ).to.be.revertedWith("Panel does not exist");
    });
    
    it("Should not allow non-distributors to distribute dividends", async function () {
      await expect(
        dividendDistributor.connect(user1).distributeDividends(panelId, dividendAmount)
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + DISTRIBUTOR_ROLE);
    });
  });

  describe("Dividend Claiming", function () {
    beforeEach(async function () {
      // Distribute dividends
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
    });
    
    it("Should allow users to claim their dividends", async function () {
      // Calculate expected dividends
      const user1ExpectedDividends = dividendAmount * user1Shares / totalShares;
      
      // Check initial balance
      const initialBalance = await mockToken.balanceOf(user1.address);
      
      // Claim dividends
      await expect(
        dividendDistributor.connect(user1).claimDividends(panelId)
      ).to.emit(dividendDistributor, "DividendClaimed")
        .withArgs(panelId, user1.address, user1ExpectedDividends);
      
      // Check final balance
      const finalBalance = await mockToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(user1ExpectedDividends);
      
      // Check unclaimed dividends are now 0
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address)).to.equal(0);
    });
    
    it("Should not allow claiming twice", async function () {
      // Claim first time
      await dividendDistributor.connect(user1).claimDividends(panelId);
      
      // Try to claim again
      await expect(
        dividendDistributor.connect(user1).claimDividends(panelId)
      ).to.be.revertedWith("No unclaimed dividends");
    });
    
    it("Should not allow claiming if user has no shares", async function () {
      const noSharesUser = await ethers.getSigners().then(signers => signers[5]); // Random signer with no shares
      
      await expect(
        dividendDistributor.connect(noSharesUser).claimDividends(panelId)
      ).to.be.revertedWith("No shares owned");
    });
  });

  describe("Multiple Distributions", function () {
    it("Should handle multiple distributions correctly", async function () {
      // First distribution
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      // Second distribution
      const secondDividendAmount = ethers.parseEther("50");
      await dividendDistributor.distributeDividends(panelId, secondDividendAmount);
      
      // Check dividend history
      const history = await dividendDistributor.getDividendHistory(panelId);
      expect(history.length).to.equal(2);
      expect(history[0].amount).to.equal(dividendAmount);
      expect(history[1].amount).to.equal(secondDividendAmount);
      
      // Check total dividends
      expect(await dividendDistributor.totalDividends(panelId)).to.equal(dividendAmount + secondDividendAmount);
      
      // Claim all dividends
      const user1ExpectedDividends = (dividendAmount + secondDividendAmount) * user1Shares / totalShares;
      
      const initialBalance = await mockToken.balanceOf(user1.address);
      await dividendDistributor.connect(user1).claimDividends(panelId);
      const finalBalance = await mockToken.balanceOf(user1.address);
      
      expect(finalBalance - initialBalance).to.equal(user1ExpectedDividends);
    });
  });

  describe("Pausing", function () {
    it("Should pause and unpause", async function () {
      // Pause the contract
      await dividendDistributor.pause();
      
      // Try to distribute dividends while paused
      await expect(
        dividendDistributor.distributeDividends(panelId, dividendAmount)
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause the contract
      await dividendDistributor.unpause();
      
      // Distribute dividends after unpausing
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      const history = await dividendDistributor.getDividendHistory(panelId);
      expect(history[0].amount).to.equal(dividendAmount);
    });
    
    it("Should not allow non-admins to pause", async function () {
      await expect(
        dividendDistributor.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
  });
}); 