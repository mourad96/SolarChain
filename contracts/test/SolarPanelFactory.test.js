const { expect } = require("chai");
const { ethers } = require("hardhat");
const { upgrades } = require("hardhat");

describe("SolarPanelFactory", function () {
  let solarPanelRegistry;
  let solarPanelFactory;
  let owner;
  let user1;
  let user2;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const minimumPanelCapacity = ethers.parseEther("0.1");
  const totalShares = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy SolarPanelRegistry using upgrades.deployProxy
    const SolarPanelRegistryFactory = await ethers.getContractFactory("SolarPanelRegistry");
    solarPanelRegistry = await upgrades.deployProxy(
      SolarPanelRegistryFactory, 
      [minimumPanelCapacity], 
      { initializer: "initialize", kind: "uups" }
    );
    await solarPanelRegistry.waitForDeployment();

    // Deploy SolarPanelFactory using upgrades.deployProxy
    const SolarPanelFactoryFactory = await ethers.getContractFactory("SolarPanelFactory");
    solarPanelFactory = await upgrades.deployProxy(
      SolarPanelFactoryFactory,
      [await solarPanelRegistry.getAddress()],
      { initializer: "initialize", kind: "uups" }
    );
    await solarPanelFactory.waitForDeployment();

    // Grant FACTORY_ROLE to factory in registry
    await solarPanelRegistry.grantRole(await solarPanelRegistry.FACTORY_ROLE(), await solarPanelFactory.getAddress());
    
    // Grant DEFAULT_ADMIN_ROLE to factory in registry
    await solarPanelRegistry.grantRole(DEFAULT_ADMIN_ROLE, await solarPanelFactory.getAddress());
    
    // Grant REGISTRAR_ROLE to owner in factory
    await solarPanelFactory.grantRole(REGISTRAR_ROLE, owner.address);
  });

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      expect(await solarPanelFactory.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await solarPanelFactory.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await solarPanelFactory.hasRole(REGISTRAR_ROLE, owner.address)).to.be.true;
    });

    it("Should set the right registry address in factory", async function () {
      expect(await solarPanelFactory.registry()).to.equal(await solarPanelRegistry.getAddress());
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-registrars to register panels", async function () {
      await expect(
        solarPanelFactory.connect(user1).createPanelWithShares(
          "TEST001",
          "Test Panel Token",
          "TPT",
          totalShares
        )
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + REGISTRAR_ROLE);
    });

    it("Should allow pausing and unpausing by admin", async function () {
      await solarPanelFactory.pause();
      
      await expect(
        solarPanelFactory.createPanelWithShares(
          "TEST001",
          "Test Panel Token",
          "TPT",
          totalShares
        )
      ).to.be.revertedWith("Pausable: paused");
      
      await solarPanelFactory.unpause();
      
      await solarPanelFactory.createPanelWithShares(
        "TEST001",
        "Test Panel Token",
        "TPT",
        totalShares
      );
    });

    it("Should not allow non-admins to pause/unpause", async function () {
      await expect(
        solarPanelFactory.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
      
      await expect(
        solarPanelFactory.connect(user1).unpause()
      ).to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
  });
}); 