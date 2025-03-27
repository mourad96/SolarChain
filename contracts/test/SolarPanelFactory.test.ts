import { expect } from "chai";
import { ethers } from "hardhat";
import { upgrades } from "hardhat";
import { Signer } from "ethers";

describe("SolarPanelFactory", function () {
  // Using any type here temporarily to fix the immediate issue
  let solarPanelRegistry: any;
  let solarPanelFactory: any;
  let mockUSDC: any;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  // We'll keep this for using as capacity parameter in createPanelWithShares
  const panelCapacity = ethers.parseEther("0.1");
  const totalShares = ethers.parseEther("1000");
  const tokenPrice = ethers.parseEther("0.1"); // Adding token price
  const saleEndTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy SolarPanelRegistry using upgrades.deployProxy
    const SolarPanelRegistryFactory = await ethers.getContractFactory("SolarPanelRegistry");
    solarPanelRegistry = await upgrades.deployProxy(
      SolarPanelRegistryFactory, 
      [], 
      { initializer: "initialize", kind: "uups" }
    );
    await solarPanelRegistry.waitForDeployment();

    // Deploy MockERC20 (USDC) for payment
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockUSDC = await upgrades.deployProxy(
      MockERC20Factory,
      ["USD Coin", "USDC"],
      { initializer: "initialize", kind: "uups" }
    );
    await mockUSDC.waitForDeployment();

    // Deploy SolarPanelFactory using upgrades.deployProxy
    const SolarPanelFactoryFactory = await ethers.getContractFactory("SolarPanelFactory");
    solarPanelFactory = await upgrades.deployProxy(
      SolarPanelFactoryFactory,
      [await solarPanelRegistry.getAddress(), await mockUSDC.getAddress()],
      { initializer: "initialize", kind: "uups" }
    );
    await solarPanelFactory.waitForDeployment();

    // Grant FACTORY_ROLE to factory in registry
    await solarPanelRegistry.grantRole(await solarPanelRegistry.FACTORY_ROLE(), await solarPanelFactory.getAddress());
    
    // Grant DEFAULT_ADMIN_ROLE to factory in registry
    await solarPanelRegistry.grantRole(DEFAULT_ADMIN_ROLE, await solarPanelFactory.getAddress());
    
    // Grant REGISTRAR_ROLE to owner in factory
    await solarPanelFactory.grantRole(REGISTRAR_ROLE, await owner.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      expect(await solarPanelFactory.hasRole(DEFAULT_ADMIN_ROLE, await owner.getAddress())).to.be.true;
      expect(await solarPanelFactory.hasRole(ADMIN_ROLE, await owner.getAddress())).to.be.true;
      expect(await solarPanelFactory.hasRole(REGISTRAR_ROLE, await owner.getAddress())).to.be.true;
    });

    it("Should set the right registry address in factory", async function () {
      expect(await solarPanelFactory.registry()).to.equal(await solarPanelRegistry.getAddress());
    });

    it("Should set the right default payment token", async function () {
      expect(await solarPanelFactory.defaultPaymentToken()).to.equal(await mockUSDC.getAddress());
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-registrars to register panels", async function () {
      const user1Address = await user1.getAddress();
      await expect(
        solarPanelFactory.connect(user1).createPanelWithShares(
          "TEST001",
          "Test Panel Token",
          "TPT",
          panelCapacity, // capacity
          totalShares, // totalShares
          tokenPrice, // tokenPrice
          saleEndTime,  // saleEndTime
          ethers.ZeroAddress // payment token (use default)
        )
      ).to.be.revertedWith("AccessControl: account " + user1Address.toLowerCase() + " is missing role " + REGISTRAR_ROLE);
    });

    it("Should allow pausing and unpausing by admin", async function () {
      await solarPanelFactory.pause();
      
      await expect(
        solarPanelFactory.createPanelWithShares(
          "TEST001",
          "Test Panel Token",
          "TPT",
          panelCapacity, // capacity
          totalShares, // totalShares
          tokenPrice, // tokenPrice
          saleEndTime,  // saleEndTime
          ethers.ZeroAddress // payment token (use default)
        )
      ).to.be.revertedWith("Pausable: paused");
      
      await solarPanelFactory.unpause();
      
      await solarPanelFactory.createPanelWithShares(
        "TEST001",
        "Test Panel Token",
        "TPT",
        panelCapacity, // capacity
        totalShares, // totalShares
        tokenPrice, // tokenPrice
        saleEndTime,  // saleEndTime
        ethers.ZeroAddress // payment token (use default)
      );
    });

    it("Should not allow non-admins to pause/unpause", async function () {
      const user1Address = await user1.getAddress();
      
      await expect(
        solarPanelFactory.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account " + user1Address.toLowerCase() + " is missing role " + ADMIN_ROLE);
      
      await expect(
        solarPanelFactory.connect(user1).unpause()
      ).to.be.revertedWith("AccessControl: account " + user1Address.toLowerCase() + " is missing role " + ADMIN_ROLE);
    });
  });
}); 