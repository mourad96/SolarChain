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
      [], 
      { initializer: "initialize", kind: "uups" }
    );
    await solarPanelRegistry.waitForDeployment();

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
    
    // Register a panel directly through the registry
    await solarPanelRegistry.grantRole(FACTORY_ROLE, owner.address);
    
    const panelExternalId = "SN001";
    await solarPanelRegistry.registerPanelByFactory(
      panelExternalId,
      minimumPanelCapacity,
      owner.address
    );
    
    // Get the panel ID using getPanelIdByExternalId
    panelId = await solarPanelRegistry.getPanelIdByExternalId(panelExternalId);
    
    // Deploy a share token manually
    const ShareTokenFactory = await ethers.getContractFactory("ShareToken");
    const shareTokenImpl = await ShareTokenFactory.deploy();
    await shareTokenImpl.waitForDeployment();
    
    // Create a proxy for the share token
    const ShareTokenProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const initData = ShareTokenFactory.interface.encodeFunctionData(
      "initialize",
      [
        "Solar Panel Share 1",
        "SPS1",
        await solarPanelRegistry.getAddress(),
        panelId
      ]
    );
    
    const shareTokenProxy = await ShareTokenProxyFactory.deploy(
      await shareTokenImpl.getAddress(),
      initData
    );
    await shareTokenProxy.waitForDeployment();
    
    // Get the share token instance
    shareToken = await ethers.getContractAt("ShareToken", await shareTokenProxy.getAddress());
    
    // Link the share token to the panel
    await solarPanelRegistry.linkShareToken(panelId, await shareToken.getAddress());
    
    // Grant MINTER_ROLE to owner
    await shareToken.grantRole(MINTER_ROLE, owner.address);
    
    // Mint tokens directly to owner
    await shareToken.mintShares(totalShares, owner.address);
    
    // Transfer some shares to users
    await shareToken.transfer(user1.address, user1Shares);
    await shareToken.transfer(user2.address, user2Shares);
    
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
      const nonExistentPanelId = 9999n;
      
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

  describe("getUnclaimedDividends", function () {
    it("Should return correct unclaimed dividends for users with shares", async function () {
      // Distribute dividends
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      // Calculate expected dividends
      const user1ExpectedDividends = dividendAmount * user1Shares / totalShares;
      const user2ExpectedDividends = dividendAmount * user2Shares / totalShares;
      
      // Check unclaimed dividends
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address)).to.equal(user1ExpectedDividends);
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user2.address)).to.equal(user2ExpectedDividends);
    });

    it("Should return 0 for users with no shares", async function () {
      // Distribute dividends
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      // Get a user with no shares
      const noSharesUser = await ethers.getSigners().then(signers => signers[5]);
      
      // Check unclaimed dividends
      expect(await dividendDistributor.getUnclaimedDividends(panelId, noSharesUser.address)).to.equal(0);
    });

    it("Should return 0 for non-existent panel", async function () {
      const nonExistentPanelId = 9999n;
      expect(await dividendDistributor.getUnclaimedDividends(nonExistentPanelId, user1.address)).to.equal(0);
    });

    it("Should update unclaimed amount after partial claim", async function () {
      // Distribute dividends twice
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      // Calculate total expected dividends
      const totalExpectedDividends = (dividendAmount * 2n * user1Shares) / totalShares;
      
      // Verify initial unclaimed amount
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address)).to.equal(totalExpectedDividends);
      
      // Claim dividends
      await dividendDistributor.connect(user1).claimDividends(panelId);
      
      // Verify unclaimed amount is now 0
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address)).to.equal(0);
    });

    it("Should handle multiple users claiming at different times", async function () {
      // Distribute dividends
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      // Calculate expected dividends
      const user1ExpectedDividends = dividendAmount * user1Shares / totalShares;
      const user2ExpectedDividends = dividendAmount * user2Shares / totalShares;
      
      // User1 claims their dividends
      await dividendDistributor.connect(user1).claimDividends(panelId);
      
      // Check that user1's unclaimed is 0 but user2's is unchanged
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address)).to.equal(0);
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user2.address)).to.equal(user2ExpectedDividends);
      
      // Distribute more dividends
      await dividendDistributor.distributeDividends(panelId, dividendAmount);
      
      // Check that user1 has new unclaimed dividends while user2 has accumulated unclaimed dividends
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address)).to.equal(user1ExpectedDividends);
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user2.address)).to.equal(user2ExpectedDividends * 2n);
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