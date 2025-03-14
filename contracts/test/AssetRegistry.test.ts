import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AssetRegistry } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("AssetRegistry", function () {
  let assetRegistry: AssetRegistry;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const PANEL_OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PANEL_OWNER_ROLE"));

  const testPanel = {
    name: "Test Panel",
    location: "Test Location",
    capacity: 1000, // 1kW
  };

  beforeEach(async function () {
    [owner, admin, user1, user2] = await ethers.getSigners();

    const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Grant admin role to admin account
    await assetRegistry.grantRole(ADMIN_ROLE, admin.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await assetRegistry.hasRole(ethers.ZeroHash, owner.address)).to.be.true;
    });

    it("Should set the admin role correctly", async function () {
      expect(await assetRegistry.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Panel Registration", function () {
    it("Should register a new panel", async function () {
      await expect(assetRegistry.connect(user1).registerPanel(
        testPanel.name,
        testPanel.location,
        testPanel.capacity
      ))
        .to.emit(assetRegistry, "PanelRegistered")
        .withArgs(1, testPanel.name, testPanel.location, testPanel.capacity, user1.address);

      const panel = await assetRegistry.panels(1);
      expect(panel.name).to.equal(testPanel.name);
      expect(panel.location).to.equal(testPanel.location);
      expect(panel.capacity).to.equal(testPanel.capacity);
      expect(panel.owner).to.equal(user1.address);
      expect(panel.isActive).to.be.true;
    });

    it("Should assign PANEL_OWNER_ROLE to new panel owner", async function () {
      await assetRegistry.connect(user1).registerPanel(
        testPanel.name,
        testPanel.location,
        testPanel.capacity
      );

      expect(await assetRegistry.hasRole(PANEL_OWNER_ROLE, user1.address)).to.be.true;
    });

    it("Should not register panel with empty name", async function () {
      await expect(
        assetRegistry.connect(user1).registerPanel(
          "",
          testPanel.location,
          testPanel.capacity
        )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should not register panel with zero capacity", async function () {
      await expect(
        assetRegistry.connect(user1).registerPanel(
          testPanel.name,
          testPanel.location,
          0
        )
      ).to.be.revertedWith("Capacity must be greater than 0");
    });
  });

  describe("Panel Updates", function () {
    beforeEach(async function () {
      await assetRegistry.connect(user1).registerPanel(
        testPanel.name,
        testPanel.location,
        testPanel.capacity
      );
    });

    it("Should allow owner to update panel metadata", async function () {
      const newName = "Updated Panel";
      const newLocation = "New Location";
      const newCapacity = 2000;

      await expect(assetRegistry.connect(user1).updatePanelMetadata(
        1,
        newName,
        newLocation,
        newCapacity
      ))
        .to.emit(assetRegistry, "PanelUpdated")
        .withArgs(1, newName, newLocation, newCapacity);

      const panel = await assetRegistry.panels(1);
      expect(panel.name).to.equal(newName);
      expect(panel.location).to.equal(newLocation);
      expect(panel.capacity).to.equal(newCapacity);
    });

    it("Should allow admin to update panel metadata", async function () {
      const newName = "Admin Updated";
      await expect(assetRegistry.connect(admin).updatePanelMetadata(
        1,
        newName,
        testPanel.location,
        testPanel.capacity
      )).to.not.be.reverted;
    });

    it("Should not allow non-owner/non-admin to update panel", async function () {
      await expect(
        assetRegistry.connect(user2).updatePanelMetadata(
          1,
          "Hacked Panel",
          testPanel.location,
          testPanel.capacity
        )
      ).to.be.revertedWith("Caller is not panel owner or admin");
    });
  });

  describe("Panel Status Management", function () {
    beforeEach(async function () {
      await assetRegistry.connect(user1).registerPanel(
        testPanel.name,
        testPanel.location,
        testPanel.capacity
      );
    });

    it("Should allow owner to change panel status", async function () {
      await expect(assetRegistry.connect(user1).setPanelStatus(1, false))
        .to.emit(assetRegistry, "PanelStatusChanged")
        .withArgs(1, false);

      const panel = await assetRegistry.panels(1);
      expect(panel.isActive).to.be.false;
    });

    it("Should allow admin to change panel status", async function () {
      await expect(assetRegistry.connect(admin).setPanelStatus(1, false))
        .to.not.be.reverted;
    });

    it("Should not allow non-owner/non-admin to change status", async function () {
      await expect(
        assetRegistry.connect(user2).setPanelStatus(1, false)
      ).to.be.revertedWith("Caller is not panel owner or admin");
    });
  });

  describe("Panel Queries", function () {
    beforeEach(async function () {
      await assetRegistry.connect(user1).registerPanel(
        testPanel.name,
        testPanel.location,
        testPanel.capacity
      );
    });

    it("Should return correct panel details", async function () {
      const [name, location, capacity, owner, isActive, registrationDate] = 
        await assetRegistry.getPanelDetails(1);

      expect(name).to.equal(testPanel.name);
      expect(location).to.equal(testPanel.location);
      expect(capacity).to.equal(testPanel.capacity);
      expect(owner).to.equal(user1.address);
      expect(isActive).to.be.true;
      expect(registrationDate).to.be.gt(0);
    });

    it("Should return correct owner panels", async function () {
      const panels = await assetRegistry.getOwnerPanels(user1.address);
      expect(panels.length).to.equal(1);
      expect(panels[0]).to.equal(1);
    });

    it("Should revert when querying non-existent panel", async function () {
      await expect(
        assetRegistry.getPanelDetails(999)
      ).to.be.revertedWith("Panel does not exist");
    });
  });

  describe("Pausable", function () {
    it("Should allow admin to pause and unpause", async function () {
      await assetRegistry.connect(admin).pause();
      
      await expect(
        assetRegistry.connect(user1).registerPanel(
          testPanel.name,
          testPanel.location,
          testPanel.capacity
        )
      ).to.be.revertedWith("Pausable: paused");

      await assetRegistry.connect(admin).unpause();
      
      await expect(
        assetRegistry.connect(user1).registerPanel(
          testPanel.name,
          testPanel.location,
          testPanel.capacity
        )
      ).to.not.be.reverted;
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(
        assetRegistry.connect(user1).pause()
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${ADMIN_ROLE}`
      );
    });
  });
}); 