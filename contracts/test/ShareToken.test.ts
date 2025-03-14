import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ShareToken, AssetRegistry } from "../typechain-types";
import { BigNumberish } from "ethers";

describe("ShareToken", function () {
  let shareToken: ShareToken;
  let assetRegistry: AssetRegistry;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const panelId = 1;
  const totalShares = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

    // Deploy AssetRegistry first
    const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Deploy ShareToken
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = await ShareToken.deploy(await assetRegistry.getAddress());
    await shareToken.waitForDeployment();

    // Setup roles
    await shareToken.grantRole(MINTER_ROLE, minter.address);

    // Register a panel in AssetRegistry
    await assetRegistry.registerPanel(
      "Test Panel",
      "Test Location",
      100
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shareToken.hasRole(ethers.ZeroHash, owner.address)).to.be.true;
    });

    it("Should set the right asset registry", async function () {
      expect(await shareToken.assetRegistry()).to.equal(await assetRegistry.getAddress());
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint shares", async function () {
      await expect(shareToken.connect(minter).mintShares(panelId, totalShares))
        .to.emit(shareToken, "SharesMinted")
        .withArgs(panelId, totalShares);

      const [actualShares, isMinted] = await shareToken.getPanelTokenDetails(panelId);
      expect(actualShares).to.equal(totalShares);
      expect(isMinted).to.be.true;
    });

    it("Should not allow non-minter to mint shares", async function () {
      await expect(
        shareToken.connect(user1).mintShares(panelId, totalShares)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });

    it("Should not allow minting shares twice for same panel", async function () {
      await shareToken.connect(minter).mintShares(panelId, totalShares);
      await expect(
        shareToken.connect(minter).mintShares(panelId, totalShares)
      ).to.be.revertedWith("Shares already minted for this panel");
    });
  });

  describe("Share Transfer", function () {
    beforeEach(async function () {
      await shareToken.connect(minter).mintShares(panelId, totalShares);
    });

    it("Should allow transfer of shares", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        shareToken.connect(owner).transferPanelShares(panelId, user1.address, transferAmount)
      )
        .to.emit(shareToken, "SharesTransferred")
        .withArgs(panelId, owner.address, user1.address, transferAmount);

      expect(await shareToken.getPanelBalance(panelId, user1.address)).to.equal(transferAmount);
    });

    it("Should not allow transfer more than balance", async function () {
      const transferAmount = totalShares + 1n;
      
      await expect(
        shareToken.connect(owner).transferPanelShares(panelId, user1.address, transferAmount)
      ).to.be.revertedWith("Insufficient panel shares");
    });

    it("Should track panel holders correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await shareToken.connect(owner).transferPanelShares(panelId, user1.address, transferAmount);
      const holders = await shareToken.getPanelHolders(panelId);
      
      expect(holders).to.include(owner.address);
      expect(holders).to.include(user1.address);
    });
  });

  describe("Pausable", function () {
    it("Should allow admin to pause and unpause", async function () {
      await shareToken.connect(owner).pause();
      await expect(
        shareToken.connect(minter).mintShares(panelId, totalShares)
      ).to.be.revertedWith("Pausable: paused");

      await shareToken.connect(owner).unpause();
      await expect(shareToken.connect(minter).mintShares(panelId, totalShares))
        .to.emit(shareToken, "SharesMinted");
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(shareToken.connect(user1).pause())
        .to.be.revertedWith(
          `AccessControl: account ${user1.address.toLowerCase()} is missing role ${ethers.ZeroHash}`
        );
    });
  });
}); 