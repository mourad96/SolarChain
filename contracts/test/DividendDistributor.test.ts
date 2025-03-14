import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { DividendDistributor, ShareToken, AssetRegistry, MockERC20 } from "../typechain-types";

describe("DividendDistributor", function () {
  let dividendDistributor: DividendDistributor;
  let shareToken: ShareToken;
  let assetRegistry: AssetRegistry;
  let paymentToken: MockERC20;
  let owner: SignerWithAddress;
  let distributor: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const panelId = 1;
  const totalShares = ethers.parseEther("1000");
  const dividendAmount = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, distributor, user1, user2] = await ethers.getSigners();

    // Deploy AssetRegistry
    const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Deploy ShareToken
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = await ShareToken.deploy(await assetRegistry.getAddress());
    await shareToken.waitForDeployment();

    // Deploy MockERC20 for payment token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    paymentToken = await MockERC20.deploy("USD Coin", "USDC");
    await paymentToken.waitForDeployment();

    // Deploy DividendDistributor
    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await DividendDistributor.deploy(
      await shareToken.getAddress(),
      await assetRegistry.getAddress(),
      await paymentToken.getAddress()
    );
    await dividendDistributor.waitForDeployment();

    // Setup roles and initial state
    await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, distributor.address);
    await shareToken.grantRole(await shareToken.MINTER_ROLE(), owner.address);

    // Register panel and mint shares
    await assetRegistry.registerPanel("Test Panel", "Test Location", 1000);
    await shareToken.mintShares(panelId, totalShares);

    // Mint payment tokens to distributor
    await paymentToken.mint(distributor.address, ethers.parseEther("1000"));
    await paymentToken.connect(distributor).approve(await dividendDistributor.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set the correct addresses", async function () {
      expect(await dividendDistributor.shareToken()).to.equal(await shareToken.getAddress());
      expect(await dividendDistributor.assetRegistry()).to.equal(await assetRegistry.getAddress());
      expect(await dividendDistributor.paymentToken()).to.equal(await paymentToken.getAddress());
    });

    it("Should set the distributor role correctly", async function () {
      expect(await dividendDistributor.hasRole(DISTRIBUTOR_ROLE, distributor.address)).to.be.true;
    });
  });

  describe("Dividend Distribution", function () {
    it("Should allow distributor to distribute dividends", async function () {
      const tx = await dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(dividendDistributor, "DividendDistributed")
        .withArgs(panelId, dividendAmount, block!.timestamp);

      const history = await dividendDistributor.getDividendHistory(panelId);
      expect(history[0].amount).to.equal(dividendAmount);
      expect(history[0].distributed).to.be.true;
    });

    it("Should not allow non-distributor to distribute dividends", async function () {
      await expect(
        dividendDistributor.connect(user1).distributeDividends(panelId, dividendAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${DISTRIBUTOR_ROLE}`
      );
    });

    it("Should not distribute dividends for inactive panel", async function () {
      await assetRegistry.setPanelStatus(panelId, false);
      await expect(
        dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount)
      ).to.be.revertedWith("Panel is not active");
    });

    it("Should not distribute zero amount", async function () {
      await expect(
        dividendDistributor.connect(distributor).distributeDividends(panelId, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Dividend Claims", function () {
    beforeEach(async function () {
      // Transfer all shares to users
      await shareToken.transferPanelShares(panelId, user1.address, ethers.parseEther("500")); // 50%
      await shareToken.transferPanelShares(panelId, user2.address, ethers.parseEther("500")); // 50%
      // Distribute dividends
      await dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount);
    });

    it("Should allow shareholders to claim dividends", async function () {
      const user1Share = ethers.parseEther("50"); // 50% of 100
      await expect(dividendDistributor.connect(user1).claimDividends(panelId))
        .to.emit(dividendDistributor, "DividendClaimed")
        .withArgs(panelId, user1.address, user1Share);

      expect(await paymentToken.balanceOf(user1.address)).to.equal(user1Share);
    });

    it("Should calculate unclaimed dividends correctly", async function () {
      const user1Share = ethers.parseEther("50"); // 50% of 100
      expect(await dividendDistributor.getUnclaimedDividends(panelId, user1.address))
        .to.equal(user1Share);
    });

    it("Should not allow claiming twice", async function () {
      await dividendDistributor.connect(user1).claimDividends(panelId);
      await expect(
        dividendDistributor.connect(user1).claimDividends(panelId)
      ).to.be.revertedWith("No unclaimed dividends");
    });

    it("Should not allow non-shareholders to claim", async function () {
      const nonHolder = owner; // Owner transferred all shares
      await expect(
        dividendDistributor.connect(nonHolder).claimDividends(panelId)
      ).to.be.revertedWith("No shares owned");
    });
  });

  describe("Dividend History", function () {
    it("Should track dividend history correctly", async function () {
      await dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount);
      await dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount);

      const history = await dividendDistributor.getDividendHistory(panelId);
      expect(history.length).to.equal(2);
      expect(history[0].amount).to.equal(dividendAmount);
      expect(history[1].amount).to.equal(dividendAmount);
    });
  });

  describe("Pausable", function () {
    it("Should prevent operations when paused", async function () {
      await dividendDistributor.pause();

      await expect(
        dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount)
      ).to.be.revertedWith("Pausable: paused");

      await expect(
        dividendDistributor.connect(user1).claimDividends(panelId)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should resume operations when unpaused", async function () {
      await dividendDistributor.pause();
      await dividendDistributor.unpause();

      await expect(
        dividendDistributor.connect(distributor).distributeDividends(panelId, dividendAmount)
      ).to.not.be.reverted;
    });
  });
}); 