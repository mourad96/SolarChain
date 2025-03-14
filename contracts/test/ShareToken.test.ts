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
  let panelId: number;
  
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
    
    // Register a panel
    const tx = await solarPanelRegistry.registerPanelAsset(
      "Test Panel",
      "Test Location",
      5000 // 5kW
    );
    
    const receipt = await tx.wait();
    
    if (receipt) {
      // Find the PanelRegistered event to get the panelId
      const logs = receipt.logs;
      const parsedLogs = logs.map(log => {
        try {
          return solarPanelRegistry.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      }).filter(log => log !== null && log.name === 'PanelRegistered');
      
      if (parsedLogs.length > 0 && parsedLogs[0]?.args) {
        panelId = parsedLogs[0].args.panelId;
      }
    }
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
    
    it("Should not allow minting shares for a non-existent panel", async function () {
      const nonExistentPanelId = 9999;
      const amount = ethers.parseEther("1000");
      
      await expect(
        shareToken.mintShares(nonExistentPanelId, amount)
      ).to.be.revertedWith("Panel does not exist");
    });
    
    it("Should not allow minting shares for an inactive panel", async function () {
      // Set panel to inactive
      await solarPanelRegistry.setPanelStatus(panelId, false);
      
      const amount = ethers.parseEther("1000");
      
      await expect(
        shareToken.mintShares(panelId, amount)
      ).to.be.revertedWith("Panel is not active");
    });
    
    it("Should not allow minting shares twice for the same panel", async function () {
      const amount = ethers.parseEther("1000");
      
      await shareToken.mintShares(panelId, amount);
      
      await expect(
        shareToken.mintShares(panelId, amount)
      ).to.be.revertedWith("Shares already minted for this panel");
    });
    
    it("Should not allow non-minters to mint shares", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(
        shareToken.connect(user1).mintShares(panelId, amount)
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + MINTER_ROLE);
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
      // Register a new panel
      const tx = await solarPanelRegistry.registerPanelAsset(
        "Another Panel",
        "Another Location",
        6000
      );
      
      const receipt = await tx.wait();
      if (receipt) {
        // Find the PanelRegistered event to get the panelId
        const logs = receipt.logs;
        const parsedLogs = logs.map(log => {
          try {
            return solarPanelRegistry.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        }).filter(log => log !== null && log.name === 'PanelRegistered');
        
        if (parsedLogs.length > 0 && parsedLogs[0]?.args) {
          const newPanelId = parsedLogs[0].args.panelId;
          
          // Try to transfer shares for this panel
          await expect(
            shareToken.transferPanelShares(newPanelId, user1.address, ethers.parseEther("100"))
          ).to.be.revertedWith("Shares not minted for this panel");
        }
      }
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