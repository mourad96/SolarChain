const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SolarPanelFactory", function () {
  let SolarPanelRegistry;
  let SolarPanelFactory;
  let registry;
  let factory;
  let owner;
  let addr1;
  let addr2;
  let ADMIN_ROLE;
  let FACTORY_ROLE;
  let REGISTRAR_ROLE;
  let DEFAULT_ADMIN_ROLE;
  let PANEL_OWNER_ROLE;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Define roles
    DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    FACTORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FACTORY_ROLE"));
    REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
    PANEL_OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PANEL_OWNER_ROLE"));

    // Deploy SolarPanelRegistry
    SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    registry = await SolarPanelRegistry.deploy();
    await registry.waitForDeployment();

    // Deploy SolarPanelFactory
    SolarPanelFactory = await ethers.getContractFactory("SolarPanelFactory");
    factory = await SolarPanelFactory.deploy(await registry.getAddress());
    await factory.waitForDeployment();

    // Set factory address in registry
    await registry.setFactoryAddress(await factory.getAddress());
    
    // Grant FACTORY_ROLE to owner for direct registration
    await registry.grantRole(FACTORY_ROLE, owner.address);
    
    // Grant PANEL_OWNER_ROLE to owner, addr1, addr2, and factory for testing
    await registry.grantRole(PANEL_OWNER_ROLE, owner.address);
    await registry.grantRole(PANEL_OWNER_ROLE, addr1.address);
    await registry.grantRole(PANEL_OWNER_ROLE, addr2.address);
    await registry.grantRole(PANEL_OWNER_ROLE, await factory.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await registry.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await factory.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await factory.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await factory.hasRole(REGISTRAR_ROLE, owner.address)).to.be.true;
      expect(await registry.hasRole(FACTORY_ROLE, await factory.getAddress())).to.be.true;
    });

    it("Should set the right registry address in factory", async function () {
      expect(await factory.registry()).to.equal(await registry.getAddress());
    });

    it("Should set the right factory address in registry", async function () {
      expect(await registry.factoryAddress()).to.equal(await factory.getAddress());
    });
  });

  describe("Single Panel Registration", function () {
    it("Should allow direct registration through registry", async function () {
      await registry.registerPanel("SN001", "SolarCorp", 300);
      
      const panel = await registry.getPanelBySerialNumber("SN001");
      expect(panel[0]).to.equal("SN001");
      expect(panel[1]).to.equal("SolarCorp");
      expect(panel[2]).to.equal(300);
      expect(panel[4]).to.equal(owner.address);
      expect(panel[5]).to.be.true; // isActive
    });
  });

  describe("Batch Panel Registration", function () {
    it("Should register multiple panels for the caller", async function () {
      const serialNumbers = ["SN001", "SN002", "SN003"];
      const manufacturers = ["SolarCorp", "SunPower", "EcoSolar"];
      const names = ["Panel 1", "Panel 2", "Panel 3"];
      const locations = ["Location 1", "Location 2", "Location 3"];
      const capacities = [300, 400, 500];

      await factory.registerPanelsBatch(
        serialNumbers,
        manufacturers,
        names,
        locations,
        capacities
      );

      // Check if all panels are registered correctly
      for (let i = 0; i < serialNumbers.length; i++) {
        const panel = await registry.getPanelBySerialNumber(serialNumbers[i]);
        expect(panel[0]).to.equal(serialNumbers[i]);
        expect(panel[1]).to.equal(manufacturers[i]);
        expect(panel[2]).to.equal(capacities[i]);
        expect(panel[4]).to.equal(owner.address);
        expect(panel[5]).to.be.true; // isActive
      }

      // Check owner's panels
      const ownerPanels = await registry.getOwnerPanels(owner.address);
      expect(ownerPanels.length).to.equal(serialNumbers.length);
    });

    it("Should register multiple panels using simple batch method", async function () {
      const serialNumbers = ["SN101", "SN102", "SN103"];
      const manufacturers = ["SolarCorp", "SunPower", "EcoSolar"];
      const capacities = [300, 400, 500];

      await factory.registerPanelsBatchSimple(
        serialNumbers,
        manufacturers,
        capacities
      );

      // Check if all panels are registered correctly
      for (let i = 0; i < serialNumbers.length; i++) {
        const panel = await registry.getPanelBySerialNumber(serialNumbers[i]);
        expect(panel[0]).to.equal(serialNumbers[i]);
        expect(panel[1]).to.equal(manufacturers[i]);
        expect(panel[2]).to.equal(capacities[i]);
        expect(panel[4]).to.equal(owner.address);
        expect(panel[5]).to.be.true; // isActive
      }
    });

    it("Should register multiple panels for different owners", async function () {
      const serialNumbers = ["SN004", "SN005", "SN006"];
      const manufacturers = ["SolarCorp", "SunPower", "EcoSolar"];
      const names = ["Panel 4", "Panel 5", "Panel 6"];
      const locations = ["Location 4", "Location 5", "Location 6"];
      const capacities = [300, 400, 500];
      const owners = [owner.address, addr1.address, addr2.address];

      await factory.registerPanelsBatchForOwners(
        serialNumbers,
        manufacturers,
        names,
        locations,
        capacities,
        owners
      );

      // Check if all panels are registered correctly with the right owners
      for (let i = 0; i < serialNumbers.length; i++) {
        const panel = await registry.getPanelBySerialNumber(serialNumbers[i]);
        expect(panel[0]).to.equal(serialNumbers[i]);
        expect(panel[1]).to.equal(manufacturers[i]);
        expect(panel[2]).to.equal(capacities[i]);
        expect(panel[4]).to.equal(owners[i]);
        expect(panel[5]).to.be.true; // isActive
      }

      // Check each owner's panels
      const owner1Panels = await registry.getOwnerPanels(owner.address);
      const owner2Panels = await registry.getOwnerPanels(addr1.address);
      const owner3Panels = await registry.getOwnerPanels(addr2.address);
      
      expect(owner1Panels.length).to.be.at.least(1);
      expect(owner2Panels.length).to.be.at.least(1);
      expect(owner3Panels.length).to.be.at.least(1);
    });

    it("Should fail when arrays have different lengths", async function () {
      const serialNumbers = ["SN007", "SN008", "SN009"];
      const manufacturers = ["SolarCorp", "SunPower"];
      const names = ["Panel 7", "Panel 8", "Panel 9"];
      const locations = ["Location 7", "Location 8", "Location 9"];
      const capacities = [300, 400, 500];

      await expect(
        factory.registerPanelsBatch(
          serialNumbers,
          manufacturers,
          names,
          locations,
          capacities
        )
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should fail when trying to register an already registered panel", async function () {
      // Register first panel
      await factory.registerPanelsBatchSimple(
        ["SN010"],
        ["SolarCorp"],
        [300]
      );
      
      // Try to register the same panel again
      await expect(
        factory.registerPanelsBatchSimple(
          ["SN010"],
          ["SunPower"],
          [400]
        )
      ).to.be.revertedWith("Panel with this serial number already registered");
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-registrars to register panels for others", async function () {
      const serialNumbers = ["SN011", "SN012"];
      const manufacturers = ["SolarCorp", "SunPower"];
      const names = ["Panel 11", "Panel 12"];
      const locations = ["Location 11", "Location 12"];
      const capacities = [300, 400];
      const owners = [addr1.address, addr2.address];

      await expect(
        factory.connect(addr1).registerPanelsBatchForOwners(
          serialNumbers,
          manufacturers,
          names,
          locations,
          capacities,
          owners
        )
      ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + REGISTRAR_ROLE);
    });

    it("Should not allow changing registry address by non-admins", async function () {
      await expect(
        factory.connect(addr1).setRegistryAddress(addr1.address)
      ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });

    it("Should not allow changing factory address by non-admins", async function () {
      await expect(
        registry.connect(addr1).setFactoryAddress(addr1.address)
      ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
    
    it("Should allow pausing and unpausing by admin", async function () {
      // Pause the factory
      await factory.pause();
      
      // Try to register panels while paused
      const serialNumbers = ["SN013", "SN014"];
      const manufacturers = ["SolarCorp", "SunPower"];
      const names = ["Panel 13", "Panel 14"];
      const locations = ["Location 13", "Location 14"];
      const capacities = [300, 400];
      
      await expect(
        factory.registerPanelsBatch(
          serialNumbers,
          manufacturers,
          names,
          locations,
          capacities
        )
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause and try again
      await factory.unpause();
      
      await factory.registerPanelsBatch(
        serialNumbers,
        manufacturers,
        names,
        locations,
        capacities
      );
      
      // Check if panels were registered after unpausing
      for (let i = 0; i < serialNumbers.length; i++) {
        const panel = await registry.getPanelBySerialNumber(serialNumbers[i]);
        expect(panel[0]).to.equal(serialNumbers[i]);
      }
    });
  });
}); 