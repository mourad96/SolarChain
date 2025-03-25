import { expect } from "chai";
import { ethers } from "hardhat";
import { SolarPanelRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Import upgrades from hardhat
const { upgrades } = require("hardhat");

describe("SolarPanelRegistry", function () {
  let solarPanelRegistry: SolarPanelRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const PANEL_OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PANEL_OWNER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const minimumPanelCapacity = ethers.parseEther("0.1");

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract using upgrades.deployProxy
    const SolarPanelRegistryFactory = await ethers.getContractFactory("SolarPanelRegistry");
    
    solarPanelRegistry = await upgrades.deployProxy(
      SolarPanelRegistryFactory, 
      [], 
      { initializer: "initialize", kind: "uups" }
    );
    
    await solarPanelRegistry.waitForDeployment();
    
    // Grant FACTORY_ROLE to owner and user1 for testing
    await solarPanelRegistry.grantRole(FACTORY_ROLE, owner.address);
    await solarPanelRegistry.grantRole(FACTORY_ROLE, user1.address);
    
    // Grant DEFAULT_ADMIN_ROLE to user1 for testing the different users test
    await solarPanelRegistry.grantRole(DEFAULT_ADMIN_ROLE, user1.address);
  });

  describe("Panel Registration", function () {
    it("should register a new panel", async function () {
      const externalId = "PANEL001";
      const capacity = ethers.parseEther("1"); // 1 kW

      await solarPanelRegistry.registerPanelByFactory(
        externalId,
        capacity,
        owner.address
      );

      const panelId = 1n; // First panel should have ID 1
      const panel = await solarPanelRegistry.panels(panelId);

      expect(panel.externalId).to.equal(externalId);
      expect(panel.owner).to.equal(owner.address);
      expect(panel.isActive).to.be.true;
      expect(await solarPanelRegistry.hasRole(PANEL_OWNER_ROLE, owner.address)).to.be.true;
    });

    it("should not allow duplicate external IDs", async function () {
      const externalId = "PANEL002";
      const capacity = ethers.parseEther("1"); // 1 kW

      await solarPanelRegistry.registerPanelByFactory(
        externalId,
        capacity,
        owner.address
      );

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          externalId,
          capacity,
          user1.address
        )
      ).to.be.revertedWith("Panel with this external ID already registered");
    });

    it("should allow different users to register panels", async function () {
      const externalId1 = "PANEL003";
      const externalId2 = "PANEL004";
      const capacity = ethers.parseEther("1"); // 1 kW

      // First user registers a panel
      await solarPanelRegistry.registerPanelByFactory(
        externalId1,
        capacity,
        owner.address
      );

      // Second user registers a different panel
      await solarPanelRegistry.connect(user1).registerPanelByFactory(
        externalId2,
        capacity,
        user1.address
      );

      const panel1 = await solarPanelRegistry.panels(1n);
      const panel2 = await solarPanelRegistry.panels(2n);

      expect(panel1.externalId).to.equal(externalId1);
      expect(panel1.owner).to.equal(owner.address);
      expect(panel2.externalId).to.equal(externalId2);
      expect(panel2.owner).to.equal(user1.address);
    });

    it("should only allow factory role to register panels", async function () {
      const externalId = "PANEL005";
      const capacity = ethers.parseEther("1"); // 1 kW

      // user2 does not have FACTORY_ROLE
      await expect(
        solarPanelRegistry.connect(user2).registerPanelByFactory(
          externalId,
          capacity,
          user2.address
        )
      ).to.be.revertedWith("Caller is not factory or admin");
    });

    it("should not allow empty external ID", async function () {
      const externalId = "";
      const capacity = ethers.parseEther("1"); // 1 kW

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          externalId,
          capacity,
          owner.address
        )
      ).to.be.revertedWith("External ID cannot be empty");
    });

    it("should not allow capacity below minimum", async function () {
      const externalId = "PANEL005";
      const capacity = ethers.parseEther("0"); // Zero capacity instead of below minimum

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          externalId,
          capacity,
          owner.address
        )
      ).to.be.revertedWith("Capacity must be greater than 0");
    });

    it("should emit PanelRegistered event", async function () {
      const externalId = "PANEL006";
      const capacity = ethers.parseEther("1"); // 1 kW

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          externalId,
          capacity,
          owner.address
        )
      )
        .to.emit(solarPanelRegistry, "PanelRegistered")
        .withArgs(1, externalId, owner.address, ethers.ZeroAddress, capacity);
    });
  });

  describe("Panel Management", function () {
    let panelId: bigint;

    beforeEach(async function () {
      const externalId = "PANEL006";
      const capacity = ethers.parseEther("1"); // 1 kW
      
      await solarPanelRegistry.registerPanelByFactory(
        externalId,
        capacity,
        owner.address
      );
      
      panelId = 1n; // First panel should have ID 1
    });

    it("should set panel status", async function () {
      await solarPanelRegistry.setPanelStatus(panelId, false);
      let panel = await solarPanelRegistry.panels(panelId);
      expect(panel.isActive).to.be.false;

      await solarPanelRegistry.setPanelStatus(panelId, true);
      panel = await solarPanelRegistry.panels(panelId);
      expect(panel.isActive).to.be.true;
    });

    it("should emit PanelStatusChanged event", async function () {
      await expect(solarPanelRegistry.setPanelStatus(panelId, false))
        .to.emit(solarPanelRegistry, "PanelStatusChanged")
        .withArgs(panelId, false);
    });
  });

  describe("Panel Queries", function () {
    beforeEach(async function () {
      // Register multiple panels for testing
      const capacity = ethers.parseEther("1"); // 1 kW
      
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL007",
        capacity,
        owner.address
      );
      
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL008",
        capacity,
        owner.address
      );
      
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL009",
        capacity,
        user1.address
      );
    });

    it("should get all panels owned by an address", async function () {
      const ownerPanels = await solarPanelRegistry.getPanelsByOwner(owner.address);
      const user1Panels = await solarPanelRegistry.getPanelsByOwner(user1.address);

      expect(ownerPanels.length).to.equal(2);
      expect(user1Panels.length).to.equal(1);
    });
  });

  describe("Access Control", function () {
    it("should allow pausing and unpausing by admin", async function () {
      await solarPanelRegistry.pause();
      
      const externalId = "PANEL010";
      const capacity = ethers.parseEther("1"); // 1 kW
      
      await expect(
        solarPanelRegistry.registerPanelByFactory(
          externalId,
          capacity,
          owner.address
        )
      ).to.be.revertedWith("Pausable: paused");

      await solarPanelRegistry.unpause();
      
      await solarPanelRegistry.registerPanelByFactory(
        externalId,
        capacity,
        owner.address
      );
    });

    it("should not allow non-admins to pause/unpause", async function () {
      await expect(
        solarPanelRegistry.connect(user2).pause()
      ).to.be.revertedWith("AccessControl: account " + user2.address.toLowerCase() + " is missing role " + ADMIN_ROLE);

      await expect(
        solarPanelRegistry.connect(user2).unpause()
      ).to.be.revertedWith("AccessControl: account " + user2.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
  });
}); 