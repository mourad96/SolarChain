import { ethers } from 'ethers';
import { Panel } from '@prisma/client';
import { logger } from '../utils/logger';

// Import the contract ABI from the artifacts
const SolarPanelRegistryABI = [
  // Registry functions
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
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_location",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_capacity",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "registerPanelByFactory",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "panelId",
        "type": "uint256"
      }
    ],
    "name": "panels",
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
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "capacity",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "registrationDate",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "serialNumberToId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getPanelsByOwner",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "panelId",
        "type": "uint256"
      },
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
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "location",
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

const SolarPanelFactoryABI = [
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "_serialNumbers",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "_manufacturers",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "_names",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "_locations",
        "type": "string[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_capacities",
        "type": "uint256[]"
      }
    ],
    "name": "registerPanelsBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract | null = null;
  private factoryContract: ethers.Contract | null = null;
  private isInitialized: boolean = false;

  constructor() {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.AMOY_URL || 'https://rpc-amoy.polygon.technology';
      const registryAddress = process.env.SOLAR_PANEL_REGISTRY_ADDRESS;
      const factoryAddress = process.env.SOLAR_PANEL_FACTORY_ADDRESS;
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Only initialize contracts if addresses are provided and not empty
      if (registryAddress && registryAddress.trim() !== '') {
        this.registryContract = new ethers.Contract(registryAddress, SolarPanelRegistryABI, this.provider);
        this.isInitialized = true;
        
        logger.info('Registry contract initialized successfully', {
          registryAddress
        });
      } else {
        logger.warn('Missing blockchain configuration: SOLAR_PANEL_REGISTRY_ADDRESS not set or empty');
      }
      
      // Initialize factory contract if address is provided and not empty
      if (factoryAddress && factoryAddress.trim() !== '') {
        this.factoryContract = new ethers.Contract(factoryAddress, SolarPanelFactoryABI, this.provider);
        
        logger.info('Factory contract initialized successfully', {
          factoryAddress
        });
      } else {
        logger.warn('Missing blockchain configuration: SOLAR_PANEL_FACTORY_ADDRESS not set or empty');
      }
      
      logger.info('Blockchain service initialized successfully', {
        rpcUrl,
        registryAddress: registryAddress || 'Not configured',
        factoryAddress: factoryAddress || 'Not configured'
      });
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw new Error('Failed to initialize blockchain service');
    }
  }

  private checkInitialization() {
    if (!this.isInitialized || !this.registryContract) {
      throw new Error('Blockchain service not properly initialized. Check contract addresses.');
    }
  }

  async registerPanelOnBlockchain(panel: Panel): Promise<string> {
    try {
      this.checkInitialization();
      
      // Create a wallet to sign the transaction
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.registryContract!.connect(wallet);

      // Convert capacity from kW to W (multiply by 1000)
      const capacityInWatts = Math.floor(panel.capacity * 1000);

      logger.info('Registering panel on blockchain:', { 
        panelId: panel.id, 
        capacity: capacityInWatts 
      });

      // Register the panel using the function from the ABI
      // Using any type to bypass TypeScript's type checking for dynamic contract methods
      const tx = await (contractWithSigner as any).registerPanelByFactory(
        panel.id, // Using panel ID as serial number
        panel.name, // Use name as manufacturer since we don't have a separate manufacturer field
        panel.name,
        panel.location || 'Unknown', // Use location if available, otherwise use 'Unknown'
        capacityInWatts,
        wallet.address // Owner is the wallet address
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

  async registerPanelsBatch(panels: Panel[]): Promise<string> {
    try {
      this.checkInitialization();
      
      if (!this.factoryContract) {
        throw new Error('Factory contract not initialized');
      }

      // Create a wallet to sign the transaction
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.factoryContract.connect(wallet);

      // Prepare arrays for batch registration
      const serialNumbers = panels.map(p => p.id);
      const manufacturers = panels.map(p => p.name); // Use name as manufacturer
      const names = panels.map(p => p.name);
      const locations = panels.map(p => p.location || 'Unknown');
      const capacities = panels.map(p => Math.floor(p.capacity * 1000)); // Convert kW to W

      logger.info('Registering panels batch on blockchain:', { 
        count: panels.length
      });

      // Register the panels using the batch function
      const tx = await (contractWithSigner as any).registerPanelsBatch(
        serialNumbers,
        manufacturers,
        names,
        locations,
        capacities
      );

      logger.info('Panels batch registration transaction submitted:', { 
        txHash: tx.hash,
        count: panels.length
      });

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      logger.info('Panels batch registration confirmed on blockchain:', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        count: panels.length
      });

      // Return the transaction hash
      return receipt.hash;
    } catch (error) {
      logger.error('Error registering panels batch on blockchain:', error);
      throw new Error('Failed to register panels batch on blockchain');
    }
  }

  async getPanelFromBlockchain(serialNumber: string) {
    try {
      this.checkInitialization();
      
      // Get panel ID from serial number
      const panelId = await (this.registryContract as any).serialNumberToId(serialNumber);
      
      if (panelId.toString() === '0') {
        throw new Error(`Panel with serial number ${serialNumber} not found`);
      }
      
      // Get panel details using the ID
      const panel = await (this.registryContract as any).panels(panelId);
      
      return {
        id: panelId.toString(),
        serialNumber: panel[0],
        manufacturer: panel[1],
        name: panel[2],
        location: panel[3],
        capacity: Number(panel[4]) / 1000, // Convert from W to kW
        owner: panel[5],
        isActive: panel[6],
        registrationDate: new Date(Number(panel[7]) * 1000)
      };
    } catch (error) {
      logger.error('Error getting panel from blockchain:', error);
      throw new Error('Failed to get panel from blockchain');
    }
  }

  async getOwnerPanels(ownerAddress: string): Promise<string[]> {
    try {
      this.checkInitialization();
      
      // Get panel IDs owned by the address
      const panelIds = await (this.registryContract as any).getPanelsByOwner(ownerAddress);
      
      // Get serial numbers for each panel ID
      const serialNumbers = await Promise.all(
        panelIds.map(async (id: ethers.BigNumberish) => {
          const panel = await (this.registryContract as any).panels(id);
          return panel[0]; // serialNumber is the first element
        })
      );
      
      return serialNumbers;
    } catch (error) {
      logger.error('Error getting owner panels from blockchain:', error);
      throw new Error('Failed to get owner panels from blockchain');
    }
  }

  async getTokenPrice(panelId: string): Promise<string | null> {
    try {
      this.checkInitialization();
      
      // In a real implementation, this would call a blockchain contract method
      // For now, we'll return a simulated price based on the panel ID
      // This is just a placeholder until the actual blockchain integration is complete
      
      // Generate a deterministic but seemingly random price based on the panel ID
      const hash = ethers.id(panelId);
      const numericValue = parseInt(hash.slice(2, 10), 16);
      const price = (10 + (numericValue % 90)) / 10; // Price between $1.0 and $10.0
      
      return price.toFixed(2);
    } catch (error) {
      logger.error('Error getting token price:', error);
      return null;
    }
  }

  async getEstimatedROI(panelId: string): Promise<number | null> {
    try {
      this.checkInitialization();
      
      // In a real implementation, this would calculate ROI based on historical data
      // and blockchain information. For now, we'll return a simulated ROI.
      
      // Generate a deterministic but seemingly random ROI based on the panel ID
      const hash = ethers.id(panelId);
      const numericValue = parseInt(hash.slice(2, 10), 16);
      const roi = 8 + (numericValue % 15); // ROI between 8% and 22%
      
      return roi;
    } catch (error) {
      logger.error('Error calculating estimated ROI:', error);
      return null;
    }
  }

  async getPanelById(panelId: string): Promise<any> {
    try {
      this.checkInitialization();
      
      // In a real implementation, this would call a blockchain contract method
      // For now, we'll return simulated data
      
      // Generate deterministic but seemingly random data based on panel ID
      const hash = ethers.id(panelId);
      const numericValue = parseInt(hash.slice(2, 10), 16);
      
      return {
        tokenId: (numericValue % 10000).toString(),
        totalSupply: (100 + (numericValue % 900)).toString(),
        availableSupply: (20 + (numericValue % 80)).toString(),
        owner: `0x${hash.slice(2, 42)}`,
        isActive: true,
        registrationDate: Math.floor(Date.now() / 1000) - (numericValue % 10000000)
      };
    } catch (error) {
      logger.error('Error getting panel by ID from blockchain:', error);
      return null;
    }
  }
} 