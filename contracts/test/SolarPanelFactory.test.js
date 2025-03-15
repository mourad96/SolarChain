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

    // Grant FACTORY_ROLE to factory and owner
    await registry.grantRole(FACTORY_ROLE, await factory.getAddress());
    await registry.grantRole(FACTORY_ROLE, owner.address);
    await registry.grantRole(DEFAULT_ADMIN_ROLE, await factory.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      expect(await factory.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await factory.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await factory.hasRole(REGISTRAR_ROLE, owner.address)).to.be.true;
      expect(await registry.hasRole(FACTORY_ROLE, await factory.getAddress())).to.be.true;
    });

    it("Should set the right registry address in factory", async function () {
      expect(await factory.registry()).to.equal(await registry.getAddress());
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
        const panelId = await registry.serialNumberToId(serialNumbers[i]);
        const panel = await registry.panels(panelId);
        expect(panel.serialNumber).to.equal(serialNumbers[i]);
        expect(panel.manufacturer).to.equal(manufacturers[i]);
        expect(panel.name).to.equal(names[i]);
        expect(panel.location).to.equal(locations[i]);
        expect(panel.capacity).to.equal(capacities[i]);
        expect(panel.owner).to.equal(owner.address);
        expect(panel.isActive).to.be.true;
      }

      // Check owner's panels
      const ownerPanels = await registry.getPanelsByOwner(owner.address);
      expect(ownerPanels.length).to.equal(serialNumbers.length);
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
        const panelId = await registry.serialNumberToId(serialNumbers[i]);
        const panel = await registry.panels(panelId);
        expect(panel.serialNumber).to.equal(serialNumbers[i]);
        expect(panel.manufacturer).to.equal(manufacturers[i]);
        expect(panel.name).to.equal(names[i]);
        expect(panel.location).to.equal(locations[i]);
        expect(panel.capacity).to.equal(capacities[i]);
        expect(panel.owner).to.equal(owners[i]);
        expect(panel.isActive).to.be.true;
      }

      // Check each owner's panels
      for (const owner of owners) {
        const ownerPanels = await registry.getPanelsByOwner(owner);
        expect(ownerPanels.length).to.be.at.least(1);
      }
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
      const serialNumbers = ["SN010"];
      const manufacturers = ["SolarCorp"];
      const names = ["Panel 10"];
      const locations = ["Location 10"];
      const capacities = [300];

      // Register first panel
      await factory.registerPanelsBatch(
        serialNumbers,
        manufacturers,
        names,
        locations,
        capacities
      );
      
      // Try to register the same panel again
      await expect(
        factory.registerPanelsBatch(
          serialNumbers,
          manufacturers,
          names,
          locations,
          capacities
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
    
    it("Should allow pausing and unpausing by admin", async function () {
      // Pause the factory
      await factory.pause();
      
      // Try to register panels while paused
      const serialNumbers = ["SN013"];
      const manufacturers = ["SolarCorp"];
      const names = ["Panel 13"];
      const locations = ["Location 13"];
      const capacities = [300];

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

      const panelId = await registry.serialNumberToId(serialNumbers[0]);
      const panel = await registry.panels(panelId);
      expect(panel.serialNumber).to.equal(serialNumbers[0]);
    });

    it("Should not allow non-admins to pause/unpause", async function () {
      await expect(
        factory.connect(addr1).pause()
      ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);

      await expect(
        factory.connect(addr1).unpause()
      ).to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
  });
}); 