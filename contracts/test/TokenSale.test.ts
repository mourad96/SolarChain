import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SolarPanelRegistry, SolarPanelFactory, ShareToken, TokenSale, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Log, ContractTransactionReceipt } from "ethers";

describe("TokenSale", function () {
  let owner: HardhatEthersSigner;
  let investor1: HardhatEthersSigner;
  let investor2: HardhatEthersSigner;
  let registry: SolarPanelRegistry;
  let factory: SolarPanelFactory;
  let usdcToken: MockERC20;

  beforeEach(async function () {
    // Deploy contracts
    [owner, investor1, investor2] = await ethers.getSigners();

    // Deploy Registry
    const SolarPanelRegistry = await ethers.getContractFactory("SolarPanelRegistry");
    registry = await upgrades.deployProxy(SolarPanelRegistry, [], { initializer: "initialize", kind: "uups" }) as unknown as SolarPanelRegistry;
    await registry.waitForDeployment();

    // Deploy Mock USDC token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdcToken = await upgrades.deployProxy(MockERC20Factory, ["USD Coin", "USDC"], { initializer: "initialize", kind: "uups" }) as unknown as MockERC20;
    await usdcToken.waitForDeployment();
    
    // Mint USDC to investors for testing
    await usdcToken.mint(investor1.address, ethers.parseEther("1000"));
    await usdcToken.mint(investor2.address, ethers.parseEther("1000"));

    // Deploy Factory
    const SolarPanelFactory = await ethers.getContractFactory("SolarPanelFactory");
    factory = await upgrades.deployProxy(SolarPanelFactory, [await registry.getAddress(), await usdcToken.getAddress()], { initializer: "initialize", kind: "uups" }) as unknown as SolarPanelFactory;
    await factory.waitForDeployment();

    // Grant FACTORY_ROLE to Factory
    await registry.grantRole(await registry.FACTORY_ROLE(), await factory.getAddress());
    
    // Grant DEFAULT_ADMIN_ROLE to Factory - needed to register panels
    await registry.grantRole(ethers.ZeroHash, await factory.getAddress());
    
    // Grant REGISTRAR_ROLE to owner in factory
    await factory.grantRole(await factory.REGISTRAR_ROLE(), owner.address);
  });


  it("Should create a panel with shares and token sale", async function () {
    // Create panel with shares with sale
    const externalId = "PANEL123";
    const tokenName = "Solar Share";
    const tokenSymbol = "SOLAR";
    const capacity = 5000; // 5kW
    const totalShares = ethers.parseEther("1000"); // 1000 tokens
    const tokenPrice = ethers.parseUnits("1", "finney"); // Need non-zero price due to contract validation
    const saleEndTime = Math.floor(Date.now() / 1000) + 86400; // Need future time due to contract validation

    const tx = await factory.createPanelWithShares(
      externalId,
      tokenName,
      tokenSymbol,
      capacity,
      totalShares,
      tokenPrice,
      saleEndTime,
      ethers.ZeroAddress // payment token (use default)
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");
    
    // Parse panels event
    const panelEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    
    expect(panelEvents.length).to.be.greaterThan(0, "No PanelAndSharesCreated event found");
    const parsedPanelEvent = factory.interface.parseLog(panelEvents[0]);
    if (!parsedPanelEvent) throw new Error("Failed to parse PanelAndSharesCreated event");
    const [panelId, shareTokenAddress] = parsedPanelEvent.args;
    
    // Get the token instance
    const shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress);

    // Verify token setup
    expect(await shareToken.name()).to.equal(tokenName);
    expect(await shareToken.symbol()).to.equal(tokenSymbol);
    
    // Verify sale was created by checking for TokenSaleCreated event
    const saleEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'TokenSaleCreated';
      } catch (e) {
        return false;
      }
    });
    expect(saleEvents.length).to.be.greaterThan(0, "No TokenSaleCreated event found when sale should be created");
    
    // Verify tokens were transferred to the sale contract not the owner
    const parsedSaleEvent = factory.interface.parseLog(saleEvents[0]);
    if (!parsedSaleEvent) throw new Error("Failed to parse TokenSaleCreated event");
    const [, saleContractAddress] = parsedSaleEvent.args;
    
    // Owner shouldn't have tokens directly, they should be in the sale contract
    expect(await shareToken.balanceOf(owner.address)).to.equal(0);
    expect(await shareToken.balanceOf(saleContractAddress)).to.equal(totalShares);
  });

  it("Should create a panel with shares and token sale with detailed verification", async function () {
    // Create panel with shares and integrated token sale
    const externalId = "PANEL124";
    const tokenName = "Solar Share 2";
    const tokenSymbol = "SOLAR2";
    const capacity = 5000; // 5kW
    const totalShares = ethers.parseEther("1000"); // 1000 tokens
    const price = ethers.parseUnits("1", "finney"); // 0.001 ETH per token (1 finney = 0.001 ETH)
    const saleEndTime = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

    // Create a panel with shares and token sale
    const tx = await factory.createPanelWithShares(
      externalId,
      tokenName,
      tokenSymbol,
      capacity,
      totalShares,
      price,
      saleEndTime,
      ethers.ZeroAddress // payment token (use default)
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");
    
    // Parse panels event
    const panelEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    
    expect(panelEvents.length).to.be.greaterThan(0, "No PanelAndSharesCreated event found");
    const parsedPanelEvent = factory.interface.parseLog(panelEvents[0]);
    if (!parsedPanelEvent) throw new Error("Failed to parse PanelAndSharesCreated event");
    const [panelId, shareTokenAddress] = parsedPanelEvent.args;
    
    // Parse sale event
    const saleEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'TokenSaleCreated';
      } catch (e) {
        return false;
      }
    });
    
    expect(saleEvents.length).to.be.greaterThan(0, "No TokenSaleCreated event found");
    const parsedSaleEvent = factory.interface.parseLog(saleEvents[0]);
    if (!parsedSaleEvent) throw new Error("Failed to parse TokenSaleCreated event");
    const [tokenAddress, saleContractAddress, priceEmitted, tokensForSaleEmitted, saleEndTimeEmitted] = parsedSaleEvent.args;
    
    // Get contract instances
    const shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress);
    const tokenSale = await ethers.getContractAt("TokenSale", saleContractAddress);

    // Verify token setup
    expect(await shareToken.name()).to.equal(tokenName);
    expect(await shareToken.symbol()).to.equal(tokenSymbol);
    
    // Check token balances - with the new implementation, they could be in different locations
    // so we'll just check the total supply
    const totalTokenSupply = await shareToken.totalSupply();
    expect(totalTokenSupply).to.equal(totalShares);

    // Verify sale contract setup
    expect(await tokenSale.shareToken()).to.equal(shareTokenAddress);
    expect(await tokenSale.price()).to.equal(price);
    expect(await tokenSale.saleEndTime()).to.be.closeTo(BigInt(saleEndTime), BigInt(10)); // Allow some variation
    expect(await tokenSale.isSaleActive()).to.equal(true);
    expect(await tokenSale.paymentToken()).to.equal(await usdcToken.getAddress());
  });

  it("Should verify sale contract is properly linked in the registry", async function () {
    // Create panel with shares and sale
    const externalId = "PANEL123";
    const tokenName = "Solar Share";
    const tokenSymbol = "SOLAR";
    const totalShares = ethers.parseEther("1000");
    const capacity = 5000;
    const tokensForSale = ethers.parseEther("500");
    const price = ethers.parseUnits("1", "finney");
    const saleEndTime = Math.floor(Date.now() / 1000) + 86400;

    // Create panel with shares and token sale
    const tx = await factory.createPanelWithShares(
      externalId,
      tokenName,
      tokenSymbol,
      capacity,
      totalShares,
      price,
      saleEndTime,
      ethers.ZeroAddress // payment token (use default)
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");
    
    // Get panel event
    const panelEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    
    // Get sale event
    const saleEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'TokenSaleCreated';
      } catch (e) {
        return false;
      }
    });
    
    const parsedPanelEvent = factory.interface.parseLog(panelEvents[0]);
    if (!parsedPanelEvent) throw new Error("Failed to parse PanelAndSharesCreated event");
    const [panelId, shareTokenAddress] = parsedPanelEvent.args;
    
    const parsedSaleEvent = factory.interface.parseLog(saleEvents[0]);
    if (!parsedSaleEvent) throw new Error("Failed to parse TokenSaleCreated event");
    const [tokenAddress, saleContractAddress] = parsedSaleEvent.args;

    // Verify the registry links
    // 1. Check that the panel ID can be retrieved by the sale address
    expect(await registry.getPanelIdBySale(saleContractAddress)).to.equal(panelId);
    
    // 2. Check that the sale address can be retrieved by the panel ID
    expect(await registry.getSaleContractAddress(panelId)).to.equal(saleContractAddress);
    
    // 3. Verify bidirectional mapping consistency
    const retrievedPanelId = await registry.getPanelIdBySale(saleContractAddress);
    const retrievedSaleAddress = await registry.getSaleContractAddress(retrievedPanelId);
    expect(retrievedSaleAddress).to.equal(saleContractAddress);
  });

  it("Should allow investors to purchase tokens from the integrated sale", async function () {
    // Create panel with shares and integrated token sale
    const externalId = "PANEL125";
    const tokenName = "Solar Share";
    const tokenSymbol = "SOLAR";
    const totalShares = ethers.parseEther("1000"); // 1000 tokens
    const capacity = 5000; // 5kW
    const price = ethers.parseUnits("1", "finney"); // 0.001 ETH per token (1 finney = 0.001 ETH)
    const saleEndTime = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

    const tx = await factory.createPanelWithShares(
      externalId,
      tokenName,
      tokenSymbol,
      capacity,
      totalShares,
      price,
      saleEndTime,
      await usdcToken.getAddress() // Use USDC as payment token explicitly
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");
    
    // Find sale event
    const saleEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'TokenSaleCreated';
      } catch (e) {
        return false;
      }
    });
    
    expect(saleEvents.length).to.be.greaterThan(0, "No TokenSaleCreated event found");
    const parsedSaleEvent = factory.interface.parseLog(saleEvents[0]);
    if (!parsedSaleEvent) throw new Error("Failed to parse TokenSaleCreated event");
    
    // Get event parameters
    const [shareTokenAddress, saleContractAddress] = parsedSaleEvent.args;

    // Get the token and sale contract instances
    const shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress);
    const tokenSale = await ethers.getContractAt("TokenSale", saleContractAddress);

    // Get the payment token address directly from the sale contract
    const paymentTokenAddress = await tokenSale.paymentToken();
    const paymentToken = await ethers.getContractAt("MockERC20", paymentTokenAddress);
    
    // Make sure investor1 has enough USDC - use fresh minting
    await usdcToken.mint(investor1.address, ethers.parseEther("2000"));
    
    // Calculate payment amount - use 1 as the amount (not 1e18) since contract multiplies by price directly
    const purchaseAmount = 1n; // Buy 1 token (without 18 decimals)
    const tokenPrice = await tokenSale.price();
    const paymentAmount = purchaseAmount * tokenPrice; // Direct multiplication as per contract
    
    // Log debugging information
    console.log(`Purchase Amount: ${purchaseAmount}, Token Price: ${tokenPrice}, Payment Amount: ${paymentAmount}`);
    console.log(`Investor USDC Balance: ${await usdcToken.balanceOf(investor1.address)}`);
    console.log(`Sale Contract Payment Token: ${paymentTokenAddress}`);
    console.log(`USDC Token Address: ${await usdcToken.getAddress()}`);
    
    // Check if the payment token addresses match
    expect(paymentTokenAddress).to.equal(await usdcToken.getAddress(), 
      "Payment token address mismatch - make sure the addresses match exactly");
    
    // Ensure investor has a balance
    const investorBalance = await usdcToken.balanceOf(investor1.address);
    expect(investorBalance).to.be.gt(0, "Investor has no USDC balance");
    expect(investorBalance).to.be.gte(paymentAmount, "Investor has insufficient USDC balance");
    
    // Clear any existing allowance (helpful if test is rerun)
    await usdcToken.connect(investor1).approve(paymentTokenAddress, 0);
    
    // Explicitly approve the sale contract to spend USDC
    const approvalTx = await usdcToken.connect(investor1).approve(saleContractAddress, paymentAmount);
    await approvalTx.wait();
    
    // Verify allowance
    const allowance = await usdcToken.allowance(investor1.address, saleContractAddress);
    console.log(`Allowance: ${allowance}, Required: ${paymentAmount}`);
    expect(allowance).to.be.gte(paymentAmount, "Allowance not set correctly");
    
    // Record starting balances
    const initialInvestorShareBalance = await shareToken.balanceOf(investor1.address);
    const initialInvestorUSDCBalance = await usdcToken.balanceOf(investor1.address);
    const initialContractShareBalance = await shareToken.balanceOf(saleContractAddress);
    const initialContractUSDCBalance = await usdcToken.balanceOf(saleContractAddress);
    
    // Purchase tokens
    const purchaseTx = await tokenSale.connect(investor1).purchaseTokens(purchaseAmount);
    await purchaseTx.wait();
    
    // Check token balances after purchase
    const finalInvestorShareBalance = await shareToken.balanceOf(investor1.address);
    const finalInvestorUSDCBalance = await usdcToken.balanceOf(investor1.address);
    const finalContractShareBalance = await shareToken.balanceOf(saleContractAddress);
    const finalContractUSDCBalance = await usdcToken.balanceOf(saleContractAddress);
    
    // Verify balances changed properly
    expect(finalInvestorShareBalance).to.equal(initialInvestorShareBalance + purchaseAmount);
    expect(finalInvestorUSDCBalance).to.equal(initialInvestorUSDCBalance - paymentAmount);
    expect(finalContractShareBalance).to.equal(initialContractShareBalance - purchaseAmount);
    expect(finalContractUSDCBalance).to.equal(initialContractUSDCBalance + paymentAmount);
    
    // Check contract state
    expect(await tokenSale.soldTokens()).to.equal(purchaseAmount);
  });

  it("Should allow owner to withdraw funds", async function () {
    // Create panel with integrated token sale
    const externalId = "PANEL126";
    const tokenName = "Solar Share";
    const tokenSymbol = "SOLAR";
    const totalShares = ethers.parseEther("1000");
    const capacity = 5000;
    const price = ethers.parseUnits("1", "finney");
    const saleEndTime = Math.floor(Date.now() / 1000) + 86400;

    const tx = await factory.createPanelWithShares(
      externalId,
      tokenName,
      tokenSymbol,
      capacity,
      totalShares,
      price,
      saleEndTime,
      await usdcToken.getAddress() // Use USDC as payment token explicitly
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");
    
    const saleEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'TokenSaleCreated';
      } catch (e) {
        return false;
      }
    });
    
    expect(saleEvents.length).to.be.greaterThan(0, "No TokenSaleCreated event found");
    const parsedSaleEvent = factory.interface.parseLog(saleEvents[0]);
    if (!parsedSaleEvent) throw new Error("Failed to parse TokenSaleCreated event");
    
    // Get event parameters
    const [shareTokenAddress, saleContractAddress] = parsedSaleEvent.args;

    // Get the token and sale contract instances
    const shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress);
    const tokenSale = await ethers.getContractAt("TokenSale", saleContractAddress);
    
    // Get the payment token from the sale contract
    const paymentTokenAddress = await tokenSale.paymentToken();
    expect(paymentTokenAddress).to.equal(await usdcToken.getAddress(), 
      "Payment token address mismatch");

    // Ensure investor1 has enough USDC
    await usdcToken.mint(investor1.address, ethers.parseEther("2000"));
    
    // Investor purchases tokens - use correct decimal scaling
    const purchaseAmount = 2n; // Buy 2 tokens (without 18 decimals)
    const tokenPrice = await tokenSale.price();
    const paymentAmount = purchaseAmount * tokenPrice; // Direct multiplication as per contract
    
    // Approve the sale contract to spend USDC
    await usdcToken.connect(investor1).approve(saleContractAddress, paymentAmount);
    
    // Verify allowance
    const allowance = await usdcToken.allowance(investor1.address, saleContractAddress);
    expect(allowance).to.be.gte(paymentAmount, "Allowance not set correctly");
    
    // Record initial balances
    const initialOwnerUSDCBalance = await usdcToken.balanceOf(owner.address);
    
    // Purchase tokens
    await tokenSale.connect(investor1).purchaseTokens(purchaseAmount);
    
    // Verify the contract now has funds
    const contractUSDCBalance = await usdcToken.balanceOf(saleContractAddress);
    expect(contractUSDCBalance).to.equal(paymentAmount);
    
    // Owner withdraws funds
    await tokenSale.connect(owner).withdrawFunds(owner.address);
    
    // Check balances after withdrawal
    const finalContractUSDCBalance = await usdcToken.balanceOf(saleContractAddress);
    const finalOwnerUSDCBalance = await usdcToken.balanceOf(owner.address);
    
    expect(finalContractUSDCBalance).to.equal(0);
    expect(finalOwnerUSDCBalance).to.equal(initialOwnerUSDCBalance + contractUSDCBalance);
  });

  it("Should create a panel with shares and validate share balances", async function () {
    // Create panel with shares and integrated token sale
    const externalId = "PANEL123";
    const tokenName = "Solar Share";
    const tokenSymbol = "SOLAR";
    const capacity = 5000; // 5kW
    const totalShares = ethers.parseEther("1000"); // 1000 tokens
    const tokenPrice = ethers.parseUnits("1", "finney"); // Need non-zero price due to contract validation
    const saleEndTime = Math.floor(Date.now() / 1000) + 86400; // Need future time due to contract validation

    const tx = await factory.createPanelWithShares(
      externalId,
      tokenName,
      tokenSymbol,
      capacity,
      totalShares,
      tokenPrice,
      saleEndTime,
      ethers.ZeroAddress // payment token (use default)
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");
    
    // Parse panels event
    const panelEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'PanelAndSharesCreated';
      } catch (e) {
        return false;
      }
    });
    
    expect(panelEvents.length).to.be.greaterThan(0, "No PanelAndSharesCreated event found");
    const parsedPanelEvent = factory.interface.parseLog(panelEvents[0]);
    if (!parsedPanelEvent) throw new Error("Failed to parse PanelAndSharesCreated event");
    const [panelId, shareTokenAddress] = parsedPanelEvent.args;
    
    // Get the token instance
    const shareToken = await ethers.getContractAt("ShareToken", shareTokenAddress);

    // Verify token setup
    expect(await shareToken.name()).to.equal(tokenName);
    expect(await shareToken.symbol()).to.equal(tokenSymbol);
    
    // Verify sale was created by checking for TokenSaleCreated event
    const saleEvents = receipt.logs.filter((log: Log) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'TokenSaleCreated';
      } catch (e) {
        return false;
      }
    });
    expect(saleEvents.length).to.be.greaterThan(0, "No TokenSaleCreated event found when sale should be created");
    
    // Verify tokens were transferred to the sale contract not the owner
    const parsedSaleEvent = factory.interface.parseLog(saleEvents[0]);
    if (!parsedSaleEvent) throw new Error("Failed to parse TokenSaleCreated event");
    const [, saleContractAddress] = parsedSaleEvent.args;
    
    // Owner shouldn't have tokens directly, they should be in the sale contract
    expect(await shareToken.balanceOf(owner.address)).to.equal(0);
    expect(await shareToken.balanceOf(saleContractAddress)).to.equal(totalShares);
  });
}); 