import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Import upgrades using require
const { upgrades } = require("hardhat");

describe("Upgradeable Contracts", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let registry: any;
  let factory: any;
  let shareToken: any;
  let dividendDistributor: any;
  let mockToken: any;

  before(async function () {
    // Get signers
    [owner, user1] = await ethers.getSigners();
  });

  it("should deploy SolarPanelRegistry", async function () {
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    const minimumPanelCapacity = ethers.parseEther("0.1");
    
    registry = await upgrades.deployProxy(SolarPanelRegistry, [], {
      initializer: "initialize",
      kind: "uups",
    });
    
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    
    expect(registryAddress).to.be.properAddress;
  });

  it("should deploy SolarPanelFactory", async function () {
    const SolarPanelFactory = await ethers.getContractFactory("SolarPanelFactory");
    const registryAddress = await registry.getAddress();
    
    // Deploy MockERC20 first if not yet deployed
    if (!mockToken) {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      mockToken = await upgrades.deployProxy(
        MockERC20,
        ["USD Coin", "USDC"],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );
      
      await mockToken.waitForDeployment();
    }
    
    const mockTokenAddress = await mockToken.getAddress();
    
    factory = await upgrades.deployProxy(
      SolarPanelFactory,
      [registryAddress, mockTokenAddress],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    expect(factoryAddress).to.be.properAddress;
  });

  it("should deploy MockERC20", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await upgrades.deployProxy(
      MockERC20,
      ["USD Coin", "USDC"],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    
    await mockToken.waitForDeployment();
    const tokenAddress = await mockToken.getAddress();
    
    expect(tokenAddress).to.be.properAddress;
    expect(await mockToken.name()).to.equal("USD Coin");
    expect(await mockToken.symbol()).to.equal("USDC");
  });

  it("should deploy ShareToken", async function () {
    const ShareToken = await ethers.getContractFactory("ShareToken");
    const registryAddress = await registry.getAddress();
    
    shareToken = await upgrades.deployProxy(
      ShareToken,
      ["Solar Panel Share", "SPS", registryAddress, 1],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    
    await shareToken.waitForDeployment();
    const shareTokenAddress = await shareToken.getAddress();
    
    expect(shareTokenAddress).to.be.properAddress;
    expect(await shareToken.name()).to.equal("Solar Panel Share");
    expect(await shareToken.symbol()).to.equal("SPS");
  });

  it("should deploy DividendDistributor", async function () {
    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    const registryAddress = await registry.getAddress();
    const shareTokenAddress = await shareToken.getAddress();
    const mockTokenAddress = await mockToken.getAddress();
    
    dividendDistributor = await upgrades.deployProxy(
      DividendDistributor,
      [shareTokenAddress, registryAddress, mockTokenAddress],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    
    await dividendDistributor.waitForDeployment();
    const distributorAddress = await dividendDistributor.getAddress();
    
    expect(distributorAddress).to.be.properAddress;
  });

  it("should set up roles correctly", async function () {
    const registryAddress = await registry.getAddress();
    const factoryAddress = await factory.getAddress();
    
    // Grant FACTORY_ROLE to the factory in registry
    const FACTORY_ROLE = await registry.FACTORY_ROLE();
    await registry.grantRole(FACTORY_ROLE, factoryAddress);
    
    expect(await registry.hasRole(FACTORY_ROLE, factoryAddress)).to.be.true;
  });
}); 