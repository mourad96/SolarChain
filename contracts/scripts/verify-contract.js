import { run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Script to verify a contract on Etherscan
 * Usage: 
 * 1. Set the contract address and constructor arguments in .env file or pass them as command line arguments
 * 2. Run: npx hardhat run scripts/verify-contract.ts --network <network-name>
 * 
 * Example .env entries:
 * CONTRACT_ADDRESS=0x123...
 * CONSTRUCTOR_ARGS=["0x456...", "Token Name", 18]
 * 
 * Or run with command line args:
 * npx hardhat run scripts/verify-contract.ts --network polygon --address 0x123... --args '["0x456...", "Token Name", 18]'
 */
async function main() {
  // Get contract address from .env or command line
  let contractAddress = process.env.CONTRACT_ADDRESS;
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--address" && i + 1 < args.length) {
      contractAddress = args[i + 1];
      break;
    }
  }

  if (!contractAddress) {
    console.error("Contract address not provided. Set CONTRACT_ADDRESS in .env file or use --address flag");
    process.exit(1);
  }

  // Get constructor arguments from .env or command line
  let constructorArgs: any[] = [];
  let argsString = process.env.CONSTRUCTOR_ARGS;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--args" && i + 1 < args.length) {
      argsString = args[i + 1];
      break;
    }
  }

  if (argsString) {
    try {
      constructorArgs = JSON.parse(argsString);
    } catch (error) {
      console.error("Error parsing constructor arguments. Make sure they are in valid JSON format");
      process.exit(1);
    }
  }

  console.log(`Verifying contract at address: ${contractAddress}`);
  console.log(`Constructor arguments: ${JSON.stringify(constructorArgs)}`);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    console.log("Contract verified successfully");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified");
    } else {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 