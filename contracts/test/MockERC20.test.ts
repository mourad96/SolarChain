import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MockERC20 } from "../typechain-types";

// Import upgrades from hardhat
const { upgrades } = require("hardhat");

describe("MockERC20", function () {
  let token: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const name = "Test Token";
  const symbol = "TEST";
  const amount = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await upgrades.deployProxy(
      MockERC20Factory,
      [name, symbol],
      { initializer: "initialize", kind: "uups" }
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
    });

    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      await expect(token.mint(user1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      await expect(
        token.connect(user1).mint(user1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await token.mint(user1.address, amount);
    });

    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("50");
      
      await expect(token.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await token.balanceOf(user1.address)).to.equal(amount - transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const transferAmount = amount + 1n;
      
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Allowances", function () {
    beforeEach(async function () {
      await token.mint(user1.address, amount);
    });

    it("Should approve spending of tokens", async function () {
      await expect(token.connect(user1).approve(user2.address, amount))
        .to.emit(token, "Approval")
        .withArgs(user1.address, user2.address, amount);

      expect(await token.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("Should allow transferFrom when approved", async function () {
      const transferAmount = ethers.parseEther("50");
      
      await token.connect(user1).approve(user2.address, transferAmount);
      
      await expect(token.connect(user2).transferFrom(user1.address, user2.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await token.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("Should fail transferFrom if not enough allowance", async function () {
      const transferAmount = ethers.parseEther("50");
      const smallerAllowance = ethers.parseEther("25");
      
      await token.connect(user1).approve(user2.address, smallerAllowance);
      
      await expect(
        token.connect(user2).transferFrom(user1.address, user2.address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
}); 