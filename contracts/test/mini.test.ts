import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, user1, user2] = signers;
  console.log("Owner Address:", owner.address);
  console.log("User1 Address:", user1.address);
  console.log("User2 Address:", user2.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
