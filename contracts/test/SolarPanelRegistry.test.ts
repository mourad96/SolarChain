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
    
    // Grant ADMIN_ROLE to user1 for testing
    await solarPanelRegistry.grantRole(ADMIN_ROLE, user1.address);
    
    // Grant PANEL_OWNER_ROLE to owner, user1, and user2 for testing
    await solarPanelRegistry.grantRole(PANEL_OWNER_ROLE, owner.address);
    await solarPanelRegistry.grantRole(PANEL_OWNER_ROLE, user1.address);
    await solarPanelRegistry.grantRole(PANEL_OWNER_ROLE, user2.address);
  });

  describe("Panel Registration", function () {
    it("should register a new panel", async function () {
      // Register a panel
      const serialNumber = "PANEL001";
      const manufacturer = "SolarCorp";
      const capacity = 5000; // 5kW in watts

      await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);

      // Get the panel details
      const panel = await solarPanelRegistry.getPanelBySerialNumber(serialNumber);

      // Verify panel details
      expect(panel[0]).to.equal(serialNumber);
      expect(panel[1]).to.equal(manufacturer);
      expect(panel[2]).to.equal(capacity);
      expect(panel[4]).to.equal(owner.address);
      expect(panel[5]).to.be.true; // isActive
    });

    it("should not allow registering a panel with the same serial number", async function () {
      // Register a panel
      const serialNumber = "PANEL002";
      const manufacturer = "SolarCorp";
      const capacity = 3000; // 3kW in watts

      await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);

      // Try to register the same panel again
      await expect(
        solarPanelRegistry.registerPanel(serialNumber, "OtherManufacturer", 4000)
      ).to.be.revertedWith("Panel with this serial number already registered");
    });

    it("should emit PanelRegistered event", async function () {
      // Register a panel
      const serialNumber = "PANEL003";
      const manufacturer = "SolarCorp";
      const capacity = 7500; // 7.5kW in watts

      // Check for event emission
      const tx = await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);
      const receipt = await tx.wait();
      
      if (receipt) {
        // Find the PanelRegistered event
        const logs = receipt.logs;
        const parsedLogs = logs.map(log => {
          try {
            return solarPanelRegistry.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        }).filter(log => log !== null && log.name === 'PanelRegistered');
        
        expect(parsedLogs.length).to.be.greaterThan(0);
        
        // Check event arguments
        const args = parsedLogs[0]?.args;
        if (args) {
          expect(args.serialNumber).to.equal(serialNumber);
          expect(args.manufacturer).to.equal(manufacturer);
          expect(args.capacity).to.equal(capacity);
          expect(args.owner).to.equal(owner.address);
        }
      }
    });
    
    it("should register a panel with full details", async function () {
      // Register a panel with full details
      const serialNumber = "PANEL005";
      const manufacturer = "SolarCorp";
      const name = "My Solar Panel";
      const location = "Rooftop";
      const capacity = 6000; // 6kW in watts
      
      await solarPanelRegistry.registerPanelByFactory(
        serialNumber,
        manufacturer,
        name,
        location,
        capacity,
        user2.address
      );
      
      // Get the panel details
      const panelId = await solarPanelRegistry.serialNumberToId(serialNumber);
      const panel = await solarPanelRegistry.getPanelDetails(panelId);
      
      // Verify panel details
      expect(panel.serialNumber).to.equal(serialNumber);
      expect(panel.manufacturer).to.equal(manufacturer);
      expect(panel.name).to.equal(name);
      expect(panel.location).to.equal(location);
      expect(panel.capacity).to.equal(capacity);
      expect(panel.owner).to.equal(user2.address);
      expect(panel.isActive).to.be.true;
    });
    
    it("should register a panel using registerPanelAsset", async function () {
      // Register a panel using registerPanelAsset
      const name = "Asset Panel";
      const location = "Backyard";
      const capacity = 4000; // 4kW in watts
      
      const tx = await solarPanelRegistry.registerPanelAsset(name, location, capacity);
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
          const panelId = parsedLogs[0].args.panelId;
          
          // Get the panel details
          const panel = await solarPanelRegistry.getPanelDetails(panelId);
          
          // Verify panel details
          expect(panel.name).to.equal(name);
          expect(panel.location).to.equal(location);
          expect(panel.capacity).to.equal(capacity);
          expect(panel.owner).to.equal(owner.address);
          expect(panel.isActive).to.be.true;
        }
      }
    });
  });

  describe("Panel Retrieval", function () {
    it("should retrieve a panel by serial number", async function () {
      // Register a panel
      const serialNumber = "PANEL004";
      const manufacturer = "SolarCorp";
      const capacity = 6000; // 6kW in watts

      await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);

      // Get the panel details
      const panel = await solarPanelRegistry.getPanelBySerialNumber(serialNumber);

      // Verify panel details
      expect(panel[0]).to.equal(serialNumber);
      expect(panel[1]).to.equal(manufacturer);
      expect(panel[2]).to.equal(capacity);
      expect(panel[4]).to.equal(owner.address);
      expect(panel[5]).to.be.true; // isActive
    });

    it("should revert when trying to get a non-existent panel", async function () {
      // Try to get a panel that doesn't exist
      await expect(
        solarPanelRegistry.getPanelBySerialNumber("NON_EXISTENT_PANEL")
      ).to.be.revertedWith("Panel not found");
    });

    it("should get all panels owned by a user", async function () {
      // Clear any existing panels first to ensure clean test state
      // This is just for the test - in a real scenario, you wouldn't do this
      
      // Register multiple panels for owner
      await solarPanelRegistry.registerPanel("USER1_PANEL1", "Manufacturer1", 5000);
      await solarPanelRegistry.registerPanel("USER1_PANEL2", "Manufacturer2", 6000);
      
      // Register a panel for user2
      await solarPanelRegistry.grantRole(FACTORY_ROLE, user2.address);
      await solarPanelRegistry.connect(user2).registerPanel("USER2_PANEL1", "Manufacturer3", 7000);

      // Get panels for owner
      const ownerPanels = await solarPanelRegistry.getOwnerPanels(owner.address);
      
      // Verify owner has at least 2 panels (might have more from other tests)
      expect(ownerPanels.length).to.be.at.least(2);
      
      // Get panels for user2
      const user2Panels = await solarPanelRegistry.getOwnerPanels(user2.address);
      
      // Verify user2 has at least 1 panel
      expect(user2Panels.length).to.be.at.least(1);
    });
  });
  
  describe("Panel Management", function () {
    it("should update panel metadata", async function () {
      // Register a panel
      const serialNumber = "PANEL006";
      const manufacturer = "SolarCorp";
      const name = "Original Name";
      const location = "Original Location";
      const capacity = 5000; // 5kW in watts
      
      await solarPanelRegistry.registerPanelByFactory(
        serialNumber,
        manufacturer,
        name,
        location,
        capacity,
        owner.address
      );
      
      // Get the panel ID
      const panelId = await solarPanelRegistry.serialNumberToId(serialNumber);
      
      // Update panel metadata
      const newName = "Updated Name";
      const newLocation = "Updated Location";
      const newCapacity = 6000; // 6kW in watts
      
      await solarPanelRegistry.updatePanelMetadata(
        panelId,
        newName,
        newLocation,
        newCapacity
      );
      
      // Get the updated panel details
      const panel = await solarPanelRegistry.getPanelDetails(panelId);
      
      // Verify updated details
      expect(panel.name).to.equal(newName);
      expect(panel.location).to.equal(newLocation);
      expect(panel.capacity).to.equal(newCapacity);
    });
    
    it("should set panel status", async function () {
      // Register a panel
      const serialNumber = "PANEL007";
      const manufacturer = "SolarCorp";
      const capacity = 5000; // 5kW in watts
      
      await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);
      
      // Get the panel ID
      const panelId = await solarPanelRegistry.serialNumberToId(serialNumber);
      
      // Set panel to inactive
      await solarPanelRegistry.setPanelStatus(panelId, false);
      
      // Get the panel details
      const panel = await solarPanelRegistry.getPanelDetails(panelId);
      
      // Verify panel is inactive
      expect(panel.isActive).to.be.false;
      
      // Set panel back to active
      await solarPanelRegistry.setPanelStatus(panelId, true);
      
      // Get the panel details again
      const updatedPanel = await solarPanelRegistry.getPanelDetails(panelId);
      
      // Verify panel is active again
      expect(updatedPanel.isActive).to.be.true;
    });
    
    it("should not allow non-owners to update panel metadata", async function () {
      // Register a panel
      const serialNumber = "PANEL008";
      const manufacturer = "SolarCorp";
      const capacity = 5000; // 5kW in watts
      
      await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);
      
      // Get the panel ID
      const panelId = await solarPanelRegistry.serialNumberToId(serialNumber);
      
      // Try to update panel metadata as non-owner
      await expect(
        solarPanelRegistry.connect(user2).updatePanelMetadata(
          panelId,
          "Hacked Name",
          "Hacked Location",
          9999
        )
      ).to.be.revertedWith("Caller is not panel owner or admin");
    });
    
    it("should not allow non-owners to set panel status", async function () {
      // Register a panel
      const serialNumber = "PANEL009";
      const manufacturer = "SolarCorp";
      const capacity = 5000; // 5kW in watts
      
      await solarPanelRegistry.registerPanel(serialNumber, manufacturer, capacity);
      
      // Get the panel ID
      const panelId = await solarPanelRegistry.serialNumberToId(serialNumber);
      
      // Try to set panel status as non-owner
      await expect(
        solarPanelRegistry.connect(user2).setPanelStatus(panelId, false)
      ).to.be.revertedWith("Caller is not panel owner or admin");
    });
  });
  
  describe("Access Control", function () {
    it("should not allow non-factory users to register panels via factory method", async function () {
      // Revoke FACTORY_ROLE from user2
      await expect(
        solarPanelRegistry.connect(user2).registerPanelByFactory(
          "PANEL010",
          "SolarCorp",
          "Test Panel",
          "Test Location",
          5000,
          user2.address
        )
      ).to.be.revertedWith("Caller is not factory or admin");
    });
    
    it("should allow admin to register panels via factory method", async function () {
      // Register panel as admin (user1)
      await solarPanelRegistry.connect(user1).registerPanelByFactory(
        "PANEL011",
        "SolarCorp",
        "Admin Panel",
        "Admin Location",
        5000,
        user1.address
      );
      
      // Get the panel details
      const panel = await solarPanelRegistry.getPanelBySerialNumber("PANEL011");
      
      // Verify panel details
      expect(panel[0]).to.equal("PANEL011");
      expect(panel[4]).to.equal(user1.address);
    });
    
    it("should not allow non-admin to set factory address", async function () {
      await expect(
        solarPanelRegistry.connect(user2).setFactoryAddress(user2.address)
      ).to.be.revertedWith("AccessControl: account " + user2.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
    
    it("should allow admin to pause and unpause the contract", async function () {
      // Pause the contract as admin
      await solarPanelRegistry.connect(user1).pause();
      
      // Try to register a panel while paused
      await expect(
        solarPanelRegistry.registerPanel("PANEL012", "SolarCorp", 5000)
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause the contract
      await solarPanelRegistry.connect(user1).unpause();
      
      // Register a panel after unpausing
      await solarPanelRegistry.registerPanel("PANEL012", "SolarCorp", 5000);
      
      // Verify panel was registered
      const panel = await solarPanelRegistry.getPanelBySerialNumber("PANEL012");
      expect(panel[0]).to.equal("PANEL012");
    });
  });
}); 