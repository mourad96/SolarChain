import { expect } from "chai";
import { ethers } from "hardhat";
import { SolarPanelRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SolarPanelRegistry", function () {
  let solarPanelRegistry: SolarPanelRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    solarPanelRegistry = await SolarPanelRegistry.deploy();
  });

  describe("Panel Registration", function () {
    it("should register a new panel", async function () {
      // Register a panel
      const serialNumber = "PANEL001";
      const manufacturer = "SolarCorp";
      const capacity = 5000; // 5kW in watts

      await solarPanelRegistry.connect(user1).registerPanel(serialNumber, manufacturer, capacity);

      // Get the panel details
      const panel = await solarPanelRegistry.getPanelBySerialNumber(serialNumber);

      // Verify panel details
      expect(panel[0]).to.equal(serialNumber);
      expect(panel[1]).to.equal(manufacturer);
      expect(panel[2]).to.equal(capacity);
      expect(panel[4]).to.equal(user1.address);
      expect(panel[5]).to.be.true; // isRegistered
    });

    it("should not allow registering a panel with the same serial number", async function () {
      // Register a panel
      const serialNumber = "PANEL002";
      const manufacturer = "SolarCorp";
      const capacity = 3000; // 3kW in watts

      await solarPanelRegistry.connect(user1).registerPanel(serialNumber, manufacturer, capacity);

      // Try to register the same panel again
      await expect(
        solarPanelRegistry.connect(user2).registerPanel(serialNumber, "OtherManufacturer", 4000)
      ).to.be.revertedWith("Panel already registered");
    });

    it("should emit PanelRegistered event", async function () {
      // Register a panel
      const serialNumber = "PANEL003";
      const manufacturer = "SolarCorp";
      const capacity = 7500; // 7.5kW in watts

      // Check for event emission
      await expect(solarPanelRegistry.connect(user1).registerPanel(serialNumber, manufacturer, capacity))
        .to.emit(solarPanelRegistry, "PanelRegistered")
        .withArgs(serialNumber, manufacturer, capacity, user1.address);
    });
  });

  describe("Panel Retrieval", function () {
    it("should retrieve a panel by serial number", async function () {
      // Register a panel
      const serialNumber = "PANEL004";
      const manufacturer = "SolarCorp";
      const capacity = 6000; // 6kW in watts

      await solarPanelRegistry.connect(user1).registerPanel(serialNumber, manufacturer, capacity);

      // Get the panel details
      const panel = await solarPanelRegistry.getPanelBySerialNumber(serialNumber);

      // Verify panel details
      expect(panel[0]).to.equal(serialNumber);
      expect(panel[1]).to.equal(manufacturer);
      expect(panel[2]).to.equal(capacity);
      expect(panel[4]).to.equal(user1.address);
      expect(panel[5]).to.be.true; // isRegistered
    });

    it("should revert when trying to get a non-existent panel", async function () {
      // Try to get a panel that doesn't exist
      await expect(
        solarPanelRegistry.getPanelBySerialNumber("NON_EXISTENT_PANEL")
      ).to.be.revertedWith("Panel not found");
    });

    it("should get all panels owned by a user", async function () {
      // Register multiple panels for user1
      await solarPanelRegistry.connect(user1).registerPanel("USER1_PANEL1", "Manufacturer1", 5000);
      await solarPanelRegistry.connect(user1).registerPanel("USER1_PANEL2", "Manufacturer2", 6000);
      
      // Register a panel for user2
      await solarPanelRegistry.connect(user2).registerPanel("USER2_PANEL1", "Manufacturer3", 7000);

      // Get panels for user1
      const user1Panels = await solarPanelRegistry.getOwnerPanels(user1.address);
      
      // Verify user1 has 2 panels
      expect(user1Panels.length).to.equal(2);
      expect(user1Panels).to.include("USER1_PANEL1");
      expect(user1Panels).to.include("USER1_PANEL2");
      
      // Get panels for user2
      const user2Panels = await solarPanelRegistry.getOwnerPanels(user2.address);
      
      // Verify user2 has 1 panel
      expect(user2Panels.length).to.equal(1);
      expect(user2Panels[0]).to.equal("USER2_PANEL1");
    });
  });
}); 