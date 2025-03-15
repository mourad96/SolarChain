import { expect } from "chai";
import { ethers } from "hardhat";
import { SolarPanelRegistry, ShareToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ShareToken", function () {
  let solarPanelRegistry: SolarPanelRegistry;
  let shareToken: ShareToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let panelId: bigint;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy SolarPanelRegistry
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    solarPanelRegistry = await SolarPanelRegistry.deploy();
    await solarPanelRegistry.waitForDeployment();

    // Deploy ShareToken
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = await ShareToken.deploy(await solarPanelRegistry.getAddress());
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
      "TestManufacturer",
      "Test Panel",
      "Test Location",
      5000,
      owner.address
    );
    
    panelId = await solarPanelRegistry.serialNumberToId("TEST001");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shareToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the right panel registry", async function () {
      expect(await shareToken.panelRegistry()).to.equal(await solarPanelRegistry.getAddress());
    });
  });

  describe("Minting Shares", function () {
    it("Should mint shares for a panel", async function () {
      const amount = ethers.parseEther("1000"); // 1000 shares
      
      await shareToken.mintShares(panelId, amount);
      
      const [totalShares, isMinted] = await shareToken.getPanelTokenDetails(panelId);
      
      expect(totalShares).to.equal(amount);
      expect(isMinted).to.be.true;
      expect(await shareToken.balanceOf(owner.address)).to.equal(amount);
      expect(await shareToken.getPanelBalance(panelId, owner.address)).to.equal(amount);
    });
    
    it("should not allow minting shares for non-existent panel", async function () {
      const nonExistentPanelId = 999n;
      await expect(
        shareToken.mintShares(nonExistentPanelId, ethers.parseEther("100"))
      ).to.be.revertedWith("Panel does not exist");
    });
    
    it("should not allow minting shares for inactive panel", async function () {
      // Register a panel
      await solarPanelRegistry.registerPanelByFactory(
        "TEST002",
        "TestManufacturer",
        "Test Panel",
        "Test Location",
        5000,
        owner.address
      );
      
      const inactivePanelId = await solarPanelRegistry.serialNumberToId("TEST002");
      
      // Deactivate the panel
      await solarPanelRegistry.setPanelStatus(inactivePanelId, false);
      
      await expect(
        shareToken.mintShares(inactivePanelId, ethers.parseEther("100"))
      ).to.be.revertedWith("Panel is not active");
    });
    
    it("should not allow minting shares for already minted panel", async function () {
      // First mint
      await shareToken.mintShares(panelId, ethers.parseEther("1000"));
      
      // Try to mint again
      await expect(
        shareToken.mintShares(panelId, ethers.parseEther("1000"))
      ).to.be.revertedWith("Shares already minted for this panel");
    });
    
    it("Should not allow non-minters to mint shares", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        shareToken.connect(user1).mintShares(panelId, amount)
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + MINTER_ROLE);
    });

    it("should emit SharesMinted event", async function () {
      const amount = ethers.parseEther("1000");
      await expect(shareToken.mintShares(panelId, amount))
        .to.emit(shareToken, "SharesMinted")
        .withArgs(panelId, amount);
    });
  });

  describe("Transferring Shares", function () {
    beforeEach(async function () {
      // Mint shares for the panel
      const amount = ethers.parseEther("1000");
      await shareToken.mintShares(panelId, amount);
    });
    
    it("Should transfer panel shares", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await shareToken.transferPanelShares(panelId, user1.address, transferAmount);
      
      expect(await shareToken.getPanelBalance(panelId, owner.address)).to.equal(
        ethers.parseEther("700")
      );
      expect(await shareToken.getPanelBalance(panelId, user1.address)).to.equal(transferAmount);
      expect(await shareToken.balanceOf(owner.address)).to.equal(
        ethers.parseEther("700")
      );
      expect(await shareToken.balanceOf(user1.address)).to.equal(transferAmount);
    });
    
    it("Should add new holder to panel holders", async function () {
      const transferAmount = ethers.parseEther("300");
      
      await shareToken.transferPanelShares(panelId, user1.address, transferAmount);
      
      const holders = await shareToken.getPanelHolders(panelId);
      expect(holders).to.include(owner.address);
      expect(holders).to.include(user1.address);
    });
    
    it("Should not allow transferring more shares than owned", async function () {
      const transferAmount = ethers.parseEther("1100"); // More than minted
      
      await expect(
        shareToken.transferPanelShares(panelId, user1.address, transferAmount)
      ).to.be.revertedWith("Insufficient panel shares");
    });
    
    it("Should not allow transferring shares for non-minted panel", async function () {
      // Register a new panel without minting shares
      await solarPanelRegistry.registerPanelByFactory(
        "TEST003",
        "TestManufacturer",
        "Test Panel",
        "Test Location",
        5000,
        owner.address
      );
      
      const nonMintedPanelId = await solarPanelRegistry.serialNumberToId("TEST003");
      
      await expect(
        shareToken.transferPanelShares(nonMintedPanelId, user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Shares not minted for this panel");
    });
  });

  describe("Pausing", function () {
    it("Should pause and unpause", async function () {
      // Pause the contract
      await shareToken.pause();
      
      // Try to mint shares while paused
      await expect(
        shareToken.mintShares(panelId, ethers.parseEther("1000"))
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause the contract
      await shareToken.unpause();
      
      // Mint shares after unpausing
      await shareToken.mintShares(panelId, ethers.parseEther("1000"));
      
      const [totalShares, isMinted] = await shareToken.getPanelTokenDetails(panelId);
      expect(totalShares).to.equal(ethers.parseEther("1000"));
    });
    
    it("Should not allow non-admins to pause", async function () {
      await expect(
        shareToken.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + DEFAULT_ADMIN_ROLE);
    });
  });
}); 