// scripts/interact.js
const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract's address
  const contractAddress = "0xA740cF6A0b52c504a687a25E040851cA5a40A210";

  // Get the contract factory
  const Contract = await ethers.getContractFactory("ShareToken");

  // Attach to the deployed contract
  const contract = Contract.attach(contractAddress);

  // Call the getTokenHolders function
  const tokenHolders = await contract.getTokenDetails();
  console.log("Token Holders:", tokenHolders);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
