import { expect } from "chai";
import { ethers } from "hardhat";
import { SolarPanelRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SolarPanelRegistry", function () {
  let solarPanelRegistry: SolarPanelRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
  const PANEL_OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PANEL_OWNER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    solarPanelRegistry = await SolarPanelRegistry.deploy();
    await solarPanelRegistry.waitForDeployment();
    
    // Grant FACTORY_ROLE to owner and user1 for testing
    await solarPanelRegistry.grantRole(FACTORY_ROLE, owner.address);
    await solarPanelRegistry.grantRole(FACTORY_ROLE, user1.address);
  });

  describe("Panel Registration", function () {
    it("should register a new panel", async function () {
      const serialNumber = "PANEL001";
      const manufacturer = "SolarCorp";
      const name = "Test Panel";
      const location = "Test Location";
      const capacity = 5000; // 5kW in watts

      await solarPanelRegistry.registerPanelByFactory(
        serialNumber,
        manufacturer,
        name,
        location,
        capacity,
        owner.address
      );

      const panelId = await solarPanelRegistry.serialNumberToId(serialNumber);
      const panel = await solarPanelRegistry.panels(panelId);

      expect(panel.serialNumber).to.equal(serialNumber);
      expect(panel.manufacturer).to.equal(manufacturer);
      expect(panel.name).to.equal(name);
      expect(panel.location).to.equal(location);
      expect(panel.capacity).to.equal(capacity);
      expect(panel.owner).to.equal(owner.address);
      expect(panel.isActive).to.be.true;
    });

    it("should not allow registering a panel with the same serial number", async function () {
      const serialNumber = "PANEL002";
      const manufacturer = "SolarCorp";
      const name = "Test Panel";
      const location = "Test Location";
      const capacity = 3000; // 3kW in watts

      await solarPanelRegistry.registerPanelByFactory(
        serialNumber,
        manufacturer,
        name,
        location,
        capacity,
        owner.address
      );

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          serialNumber,
          "OtherManufacturer",
          "Other Panel",
          "Other Location",
          4000,
          user1.address
        )
      ).to.be.revertedWith("Panel with this serial number already registered");
    });

    it("should emit PanelRegistered event", async function () {
      const serialNumber = "PANEL003";
      const manufacturer = "SolarCorp";
      const name = "Test Panel";
      const location = "Test Location";
      const capacity = 7500; // 7.5kW in watts

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          serialNumber,
          manufacturer,
          name,
          location,
          capacity,
          owner.address
        )
      )
        .to.emit(solarPanelRegistry, "PanelRegistered")
        .withArgs(
          1, // First panel ID
          serialNumber,
          manufacturer,
          name,
          location,
          capacity,
          owner.address
        );
    });

    it("should not allow registration by non-factory role", async function () {
      await expect(
        solarPanelRegistry.connect(user2).registerPanelByFactory(
          "PANEL004",
          "SolarCorp",
          "Test Panel",
          "Test Location",
          5000,
          user2.address
        )
      ).to.be.revertedWith("Caller is not factory or admin");
    });

    it("should not allow registration with empty values", async function () {
      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "",
          "SolarCorp",
          "Test Panel",
          "Test Location",
          5000,
          owner.address
        )
      ).to.be.revertedWith("Serial number cannot be empty");

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "PANEL005",
          "",
          "Test Panel",
          "Test Location",
          5000,
          owner.address
        )
      ).to.be.revertedWith("Manufacturer cannot be empty");

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "PANEL005",
          "SolarCorp",
          "",
          "Test Location",
          5000,
          owner.address
        )
      ).to.be.revertedWith("Name cannot be empty");

      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "PANEL005",
          "SolarCorp",
          "Test Panel",
          "",
          5000,
          owner.address
        )
      ).to.be.revertedWith("Location cannot be empty");
    });

    it("should not allow registration with zero capacity", async function () {
      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "PANEL005",
          "SolarCorp",
          "Test Panel",
          "Test Location",
          0,
          owner.address
        )
      ).to.be.revertedWith("Capacity must be greater than 0");
    });

    it("should not allow registration with zero address owner", async function () {
      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "PANEL005",
          "SolarCorp",
          "Test Panel",
          "Test Location",
          5000,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Owner cannot be zero address");
    });
  });

  describe("Panel Management", function () {
    let panelId: bigint;

    beforeEach(async function () {
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL006",
        "SolarCorp",
        "Test Panel",
        "Test Location",
        5000,
        owner.address
      );
      panelId = await solarPanelRegistry.serialNumberToId("PANEL006");
    });

    it("should update panel metadata", async function () {
      const newName = "Updated Panel";
      const newLocation = "Updated Location";
      const newCapacity = 6000;

      await solarPanelRegistry.updatePanelMetadata(
        panelId,
        newName,
        newLocation,
        newCapacity
      );

      const panel = await solarPanelRegistry.panels(panelId);
      expect(panel.name).to.equal(newName);
      expect(panel.location).to.equal(newLocation);
      expect(panel.capacity).to.equal(newCapacity);
    });

    it("should emit PanelUpdated event", async function () {
      const newName = "Updated Panel";
      const newLocation = "Updated Location";
      const newCapacity = 6000;

      await expect(
        solarPanelRegistry.updatePanelMetadata(
          panelId,
          newName,
          newLocation,
          newCapacity
        )
      )
        .to.emit(solarPanelRegistry, "PanelUpdated")
        .withArgs(panelId, newName, newLocation, newCapacity);
    });

    it("should not allow updating non-existent panel", async function () {
      await expect(
        solarPanelRegistry.updatePanelMetadata(
          99999n,
          "New Name",
          "New Location",
          6000
        )
      ).to.be.revertedWith("Panel does not exist");
    });

    it("should not allow updating by non-owner/non-admin", async function () {
      await expect(
        solarPanelRegistry.connect(user2).updatePanelMetadata(
          panelId,
          "New Name",
          "New Location",
          6000
        )
      ).to.be.revertedWith("Caller is not panel owner or admin");
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
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL007",
        "SolarCorp",
        "Panel 7",
        "Location 7",
        5000,
        owner.address
      );
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL008",
        "SolarCorp",
        "Panel 8",
        "Location 8",
        6000,
        owner.address
      );
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL009",
        "SolarCorp",
        "Panel 9",
        "Location 9",
        7000,
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
      
      await expect(
        solarPanelRegistry.registerPanelByFactory(
          "PANEL010",
          "SolarCorp",
          "Test Panel",
          "Test Location",
          5000,
          owner.address
        )
      ).to.be.revertedWith("Pausable: paused");

      await solarPanelRegistry.unpause();
      
      await solarPanelRegistry.registerPanelByFactory(
        "PANEL010",
        "SolarCorp",
        "Test Panel",
        "Test Location",
        5000,
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