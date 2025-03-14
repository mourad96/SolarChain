import { ethers } from 'ethers';
import { Panel } from '@prisma/client';
import { logger } from '../utils/logger';

// Import the contract ABI from the artifacts
const SolarPanelRegistryABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_serialNumber",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_manufacturer",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_capacity",
        "type": "uint256"
      }
    ],
    "name": "registerPanel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_serialNumber",
        "type": "string"
      }
    ],
    "name": "getPanelBySerialNumber",
    "outputs": [
      {
        "internalType": "string",
        "name": "serialNumber",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "manufacturer",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "capacity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "registrationDate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "getOwnerPanels",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "serialNumber",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "manufacturer",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "capacity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "PanelRegistered",
    "type": "event"
  }
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://rpc-amoy.polygon.technology';
      const contractAddress = process.env.SOLAR_PANEL_REGISTRY_ADDRESS;
      
      if (!contractAddress) {
        throw new Error('Missing blockchain configuration: SOLAR_PANEL_REGISTRY_ADDRESS not set');
      }
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = new ethers.Contract(contractAddress, SolarPanelRegistryABI, this.provider);
      
      logger.info('Blockchain service initialized successfully', {
        rpcUrl,
        contractAddress
      });
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw new Error('Failed to initialize blockchain service');
    }
  }

  async registerPanelOnBlockchain(panel: Panel): Promise<string> {
    try {
      // Create a wallet to sign the transaction
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);

      // Convert capacity from kW to W (multiply by 1000)
      const capacityInWatts = Math.floor(panel.capacity * 1000);

      logger.info('Registering panel on blockchain:', { 
        panelId: panel.id, 
        capacity: capacityInWatts 
      });

      // Register the panel using the function from the ABI
      // Using any type to bypass TypeScript's type checking for dynamic contract methods
      const tx = await (contractWithSigner as any).registerPanel(
        panel.id, // Using panel ID as serial number
        panel.name, // Using panel name as manufacturer for now
        capacityInWatts
      );

      logger.info('Panel registration transaction submitted:', { 
        txHash: tx.hash,
        panelId: panel.id 
      });

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      logger.info('Panel registration confirmed on blockchain:', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        panelId: panel.id 
      });

      // Return the transaction hash
      return receipt.hash;
    } catch (error) {
      logger.error('Error registering panel on blockchain:', error);
      throw new Error('Failed to register panel on blockchain');
    }
  }

  async getPanelFromBlockchain(serialNumber: string) {
    try {
      // Using any type to bypass TypeScript's type checking for dynamic contract methods
      const panel = await (this.contract as any).getPanelBySerialNumber(serialNumber);
      return {
        serialNumber: panel[0],
        manufacturer: panel[1],
        capacity: Number(panel[2]) / 1000, // Convert from W to kW
        registrationDate: new Date(Number(panel[3]) * 1000),
        owner: panel[4],
        isRegistered: panel[5]
      };
    } catch (error) {
      logger.error('Error getting panel from blockchain:', error);
      throw new Error('Failed to get panel from blockchain');
    }
  }

  async getOwnerPanels(ownerAddress: string): Promise<string[]> {
    try {
      // Using any type to bypass TypeScript's type checking for dynamic contract methods
      const panelSerialNumbers = await (this.contract as any).getOwnerPanels(ownerAddress);
      return panelSerialNumbers;
    } catch (error) {
      logger.error('Error getting owner panels from blockchain:', error);
      throw new Error('Failed to get owner panels from blockchain');
    }
  }
} 