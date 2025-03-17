import { expect } from "chai";
import { ethers } from "hardhat";
import { SolarPanelRegistry, ShareToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Import upgrades from hardhat
const { upgrades } = require("hardhat");

describe("ShareToken", function () {
  let solarPanelRegistry: SolarPanelRegistry;
  let shareToken: ShareToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let panelId: bigint;
  
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
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

    // Deploy ShareToken using upgrades.deployProxy
    const ShareTokenFactory = await ethers.getContractFactory("ShareToken");
    shareToken = await upgrades.deployProxy(
      ShareTokenFactory, 
      ["Solar Panel Share", "SPS", await solarPanelRegistry.getAddress(), 1], 
      { initializer: "initialize", kind: "uups" }
    );
    await shareToken.waitForDeployment();
    
    // Grant FACTORY_ROLE to owner
    await solarPanelRegistry.grantRole(FACTORY_ROLE, owner.address);
    
    // Grant ADMIN_ROLE to owner in SolarPanelRegistry
    await solarPanelRegistry.grantRole(ADMIN_ROLE, owner.address);
    
    // Grant MINTER_ROLE to owner
    await shareToken.grantRole(MINTER_ROLE, owner.address);
    
    // Register a test panel
    await solarPanelRegistry.registerPanelByFactory(
      "TEST001",
      minimumPanelCapacity,
      owner.address
    );
    
    // Get the panel ID
    panelId = 1n; // First panel should have ID 1

    // Link the ShareToken to the panel in the registry
    await solarPanelRegistry.linkShareToken(panelId, await shareToken.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shareToken.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the right panel registry", async function () {
      expect(await shareToken.panelRegistry()).to.equal(await solarPanelRegistry.getAddress());
    });
  });

  describe("Minting Shares", function () {
    it("Should mint shares for a panel", async function () {
      const amount = ethers.parseEther("1000"); // 1000 shares
      
      await shareToken.mintShares(amount, owner.address);
      
      const [totalShares, isMinted, externalId] = await shareToken.getTokenDetails();
      
      expect(totalShares).to.equal(amount);
      expect(isMinted).to.be.true;
      expect(await shareToken.balanceOf(owner.address)).to.equal(amount);
      expect(await shareToken.getHolderBalance(owner.address)).to.equal(amount);
    });
    
    it("should not allow minting shares for non-existent panel", async function () {
      // Deploy a new ShareToken with a non-existent panel ID
      const ShareTokenFactory = await ethers.getContractFactory("ShareToken");
      const nonExistentPanelId = 999n;
      const invalidShareToken = await upgrades.deployProxy(
        ShareTokenFactory,
        ["Invalid Panel Share", "IPS", await solarPanelRegistry.getAddress(), nonExistentPanelId],
        { initializer: "initialize", kind: "uups" }
      );
      await invalidShareToken.waitForDeployment();

      // Grant MINTER_ROLE to owner
      await invalidShareToken.grantRole(MINTER_ROLE, owner.address);

      // Try to mint shares for non-existent panel
      await expect(
        invalidShareToken.mintShares(ethers.parseEther("100"), user2.address)
      ).to.be.revertedWith("Panel does not exist");
    });
    
    it("should not allow minting shares for inactive panel", async function () {
      // Register a panel
      await solarPanelRegistry.registerPanelByFactory(
        "TEST002",
        minimumPanelCapacity,
        user2.address
      );
      
      // Get the panel ID
      const panelId2 = 2n;
      
      // Deploy a new ShareToken for the inactive panel
      const ShareTokenFactory = await ethers.getContractFactory("ShareToken");
      const inactiveShareToken = await upgrades.deployProxy(
        ShareTokenFactory,
        ["Inactive Panel Share", "IPS", await solarPanelRegistry.getAddress(), panelId2],
        { initializer: "initialize", kind: "uups" }
      );
      await inactiveShareToken.waitForDeployment();

      // Link the ShareToken to the panel in the registry
      await solarPanelRegistry.linkShareToken(panelId2, await inactiveShareToken.getAddress());

      // Grant MINTER_ROLE to owner
      await inactiveShareToken.grantRole(MINTER_ROLE, owner.address);
      
      // Deactivate the panel
      await solarPanelRegistry.setPanelStatus(panelId2, false);
      
      await expect(
        inactiveShareToken.mintShares(ethers.parseEther("100"), user2.address)
      ).to.be.revertedWith("Panel is not active");
    });
    
    it("should not allow minting shares for already minted panel", async function () {
      // First mint
      await shareToken.mintShares(ethers.parseEther("1000"), owner.address);
      
      // Try to mint again
      await expect(
        shareToken.mintShares(ethers.parseEther("1000"), owner.address)
      ).to.be.revertedWith("Shares already minted for this panel");
    });
    
    it("Should not allow non-minters to mint shares", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        shareToken.connect(user1).mintShares(amount, owner.address)
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + MINTER_ROLE);
    });

    it("should emit SharesMinted event", async function () {
      const amount = ethers.parseEther("1000");
      await expect(shareToken.mintShares(amount, owner.address))
        .to.emit(shareToken, "SharesMinted")
        .withArgs(panelId, amount);
    });
  });

  describe("Transferring Shares", function () {
    beforeEach(async function () {
      // Mint shares for the panel
      const amount = ethers.parseEther("1000");
      await shareToken.mintShares(amount, owner.address);
    });
    
    it("Should transfer shares", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await shareToken.transfer(user1.address, transferAmount);
      
      expect(await shareToken.balanceOf(owner.address)).to.equal(
        ethers.parseEther("700")
      );
      expect(await shareToken.balanceOf(user1.address)).to.equal(transferAmount);
      expect(await shareToken.getHolderBalance(owner.address)).to.equal(
        ethers.parseEther("700")
      );
      expect(await shareToken.getHolderBalance(user1.address)).to.equal(transferAmount);
    });
    
    it("Should add new holder", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await shareToken.transfer(user1.address, transferAmount);
      
      const holders = await shareToken.getTokenHolders();
      expect(holders).to.include(owner.address);
      expect(holders).to.include(user1.address);
    });
    
    it("Should not allow transferring more shares than owned", async function () {
      const transferAmount = ethers.parseEther("1100"); // More than minted
      
      await expect(
        shareToken.transfer(user1.address, transferAmount)
      ).to.be.revertedWithPanic(0x11); // Arithmetic overflow
    });
    
    it("Should not allow transferring shares for non-minted panel", async function () {
      // Register a new panel without minting shares
      await solarPanelRegistry.registerPanelByFactory(
        "TEST003",
        minimumPanelCapacity,
        user2.address
      );
      
      await expect(
        shareToken.connect(user2).transfer(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithPanic(0x11); // Arithmetic overflow
    });
  });

  describe("Pausing", function () {
    it("Should pause and unpause", async function () {
      // Pause the contract
      await shareToken.pause();
      
      // Try to mint shares while paused
      await expect(
        shareToken.mintShares(ethers.parseEther("1000"), owner.address)
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause the contract
      await shareToken.unpause();
      
      // Mint shares after unpausing
      await shareToken.mintShares(ethers.parseEther("1000"), owner.address);
      
      const [totalShares, isMinted, externalId] = await shareToken.getTokenDetails();
      expect(totalShares).to.equal(ethers.parseEther("1000"));
    });
    
    it("Should not allow non-admins to pause", async function () {
      await expect(
        shareToken.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
  });
}); 