import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { MockERC20 } from "../typechain-types";


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

    const MockERC20Factory = await ethers.getContractFactory("MockERC20", owner);
    const deployedToken = await upgrades.deployProxy(MockERC20Factory, [name, symbol], {
      initializer: "initialize",
      kind: "uups",
    });
    await deployedToken.waitForDeployment();
    token = deployedToken as MockERC20;
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
    });

    it("Should set the right owner", async function () {
      console.log("User1 Address:", user1.address);
      const ownerAddress = owner.address;
      expect(await token.owner()).to.equal(ownerAddress);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const user1Address = user1.address;
      await expect(token.connect(owner).mint(user1Address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1Address, amount);

      expect(await token.balanceOf(user1Address)).to.equal(amount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const user1Address = user1.address;
      await expect(
        token.connect(user1).mint(user1Address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      const user1Address = user1.address;
      await token.connect(owner).mint(user1Address, amount);
    });

    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("50");
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      await expect(token.connect(user1).transfer(user2Address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1Address, user2Address, transferAmount);

      expect(await token.balanceOf(user2Address)).to.equal(transferAmount);
      expect(await token.balanceOf(user1Address)).to.equal(amount - transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const transferAmount = amount + 1n;
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      await expect(
        token.connect(user1).transfer(user2Address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Allowances", function () {
    beforeEach(async function () {
      const user1Address = user1.address;
      await token.connect(owner).mint(user1Address, amount);
    });

    it("Should approve spending of tokens", async function () {
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      await expect(token.connect(user1).approve(user2Address, amount))
        .to.emit(token, "Approval")
        .withArgs(user1Address, user2Address, amount);

      expect(await token.allowance(user1Address, user2Address)).to.equal(amount);
    });

    it("Should allow transferFrom when approved", async function () {
      const transferAmount = ethers.parseEther("50");
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      await token.connect(user1).approve(user2Address, transferAmount);
      
      await expect(token.connect(user2).transferFrom(user1Address, user2Address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1Address, user2Address, transferAmount);

      expect(await token.balanceOf(user2Address)).to.equal(transferAmount);
      expect(await token.allowance(user1Address, user2Address)).to.equal(0);
    });

    it("Should fail transferFrom if not enough allowance", async function () {
      const transferAmount = ethers.parseEther("50");
      const smallerAllowance = ethers.parseEther("25");
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      await token.connect(user1).approve(user2Address, smallerAllowance);
      
      await expect(
        token.connect(user2).transferFrom(user1Address, user2Address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
}); 