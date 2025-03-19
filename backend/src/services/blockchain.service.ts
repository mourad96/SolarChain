import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Define Panel interface to match expected structure
interface Panel {
  id: string;
  name: string;
  location: string;
  capacity: number;
  [key: string]: any; // Allow other properties
}

// Import the contract ABIs from the artifacts
const loadContractABI = (contractName: string) => {
  try {
    // Try multiple possible paths for the artifacts
    const possiblePaths = [
      // From backend directory
      path.resolve(__dirname, '../../../contracts/artifacts/contracts', `${contractName}.sol/${contractName}.json`),
      // From project root directory
      path.resolve(__dirname, '../../contracts/artifacts/contracts', `${contractName}.sol/${contractName}.json`),
      // Absolute path based on backend location
      path.resolve(process.cwd(), '../contracts/artifacts/contracts', `${contractName}.sol/${contractName}.json`),
      // Direct from workspace root
      path.resolve(process.cwd(), '../../contracts/artifacts/contracts', `${contractName}.sol/${contractName}.json`)
    ];
    
    // Try each path until we find one that works
    for (const artifactPath of possiblePaths) {
      if (fs.existsSync(artifactPath)) {
        logger.info(`Loading ABI from: ${artifactPath}`);
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        return artifact.abi;
      }
    }
    
    // If we reach here, we couldn't find the ABI file
    logger.error(`Could not find ABI file for ${contractName} in any of the expected locations`);
    throw new Error(`Could not find ABI file for ${contractName} in any of the expected locations`);
  } catch (error) {
    logger.error(`Failed to load ABI for ${contractName}:`, error);
    throw new Error(`Failed to load contract ABI for ${contractName}: ${error}`);
  }
};

// Load the ABIs
const SolarPanelRegistryABI = loadContractABI('SolarPanelRegistry');
const SolarPanelFactoryABI = loadContractABI('SolarPanelFactory');

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

      // Register the panel using the updated function from the ABI
      // Now using the simpler registerPanelByFactory method that accepts externalId, capacity, and owner
      const tx = await (contractWithSigner as any).registerPanelByFactory(
        panel.id, // Using panel ID as externalId
        capacityInWatts, // Minimum capacity in watts
        wallet.address // Owner is the wallet address
      );

      logger.info('Panel registration transaction submitted:', { 
        txHash: tx.hash,
        panelId: panel.id 
      });

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      // Get panel ID from event logs if possible
      let blockchainPanelId = "";
      try {
        const event = receipt.logs
          .map((log: any) => {
            try {
              return this.registryContract!.interface.parseLog({
                topics: log.topics as string[],
                data: log.data
              });
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean)
          .find((event: any) => event.name === 'PanelRegistered');
        
        if (event) {
          blockchainPanelId = event.args[0].toString();
        }
      } catch (eventError) {
        logger.warn('Failed to parse event logs for panel ID:', eventError);
      }

      logger.info('Panel registration confirmed on blockchain:', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        panelId: panel.id,
        blockchainPanelId: blockchainPanelId || 'Unknown'
      });

      // Return the transaction hash
      return receipt.hash;
    } catch (error) {
      logger.error('Error registering panel on blockchain:', error);
      throw new Error(`Failed to register panel on blockchain: ${error.message}`);
    }
  }

  async registerPanelsBatch(panels: Panel[]): Promise<string> {
    try {
      this.checkInitialization();
      
      // Create a wallet to sign the transaction
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Note: The updated contract doesn't seem to have a batch registration function,
      // so we'll register panels one by one and return the hash of the last transaction
      
      logger.info('Registering panels on blockchain one by one:', { 
        count: panels.length
      });
      
      let lastReceipt: any = null;
      
      for (const panel of panels) {
        try {
          const contractWithSigner = this.registryContract!.connect(wallet);
          
          // Convert capacity from kW to W
          const capacityInWatts = Math.floor(panel.capacity * 1000);
          
          // Register the panel using the new contract interface
          const tx = await (contractWithSigner as any).registerPanelByFactory(
            panel.id, // Using panel ID as externalId
            capacityInWatts, // Minimum capacity in watts
            wallet.address // Owner is the wallet address
          );
          
          logger.info(`Registering panel ${panel.id}, transaction submitted:`, {
            txHash: tx.hash
          });
          
          // Wait for the transaction to be mined
          lastReceipt = await tx.wait();
          
          logger.info(`Panel ${panel.id} registration confirmed:`, {
            txHash: lastReceipt.hash,
            blockNumber: lastReceipt.blockNumber
          });
        } catch (panelError) {
          logger.error(`Failed to register panel ${panel.id}:`, panelError);
          // Continue with the next panel
        }
      }
      
      if (!lastReceipt) {
        throw new Error('Failed to register any panels');
      }
      
      logger.info('Panel registrations completed:', {
        txHash: lastReceipt.hash,
        blockNumber: lastReceipt.blockNumber,
        count: panels.length
      });
      
      // Return the hash of the last successful transaction
      return lastReceipt.hash;
    } catch (error) {
      logger.error('Error registering panels on blockchain:', error);
      throw new Error(`Failed to register panels batch on blockchain: ${error.message}`);
    }
  }

  async getPanelFromBlockchain(serialNumber: string) {
    try {
      this.checkInitialization();
      
      // First try looking up the panel directly in the registry using externalId
      try {
        // Get panel ID from external ID (which is our serial number)
        const panelId = await (this.registryContract as any).getPanelIdByExternalId(serialNumber);
        
        if (panelId.toString() !== '0') {
          // Get panel details using the ID
          const panel = await (this.registryContract as any).panels(panelId);
          
          return {
            id: panelId.toString(),
            serialNumber: panel.externalId,
            manufacturer: "Unknown", // Not stored directly in the contract anymore
            name: panel.externalId, // Using externalId as name since the contract doesn't store name
            location: "Unknown", // Not stored directly in the contract anymore
            capacity: Number(panel.minimumCapacity) / 1000, // Convert from W to kW
            owner: panel.owner,
            isActive: panel.isActive,
            registrationDate: new Date(Number(panel.registrationDate) * 1000),
            tokenAddress: panel.shareTokenAddress
          };
        }
      } catch (error) {
        logger.warn(`Direct panel lookup failed for ${serialNumber}:`, error);
        // Continue to try alternative method
      }
      
      // If direct lookup fails, try loading from the database and looking up by blockchain panel ID
      try {
        const prisma = (await import('../config/prisma')).prisma;
        
        // Find the panel in the database
        const dbPanel = await prisma.panel.findUnique({
          where: { id: serialNumber },
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            status: true,
            blockchainPanelId: true,
            blockchainTokenAddress: true,
            blockchainTxHash: true,
            owner: {
              select: {
                walletAddress: true
              }
            }
          }
        });
        
        if (dbPanel && dbPanel.blockchainPanelId) {
          // If the panel exists in the database and has a blockchain ID,
          // construct a response that matches the expected format
          return {
            id: dbPanel.blockchainPanelId,
            serialNumber: dbPanel.id,
            manufacturer: dbPanel.name, // Use name as manufacturer as before
            name: dbPanel.name,
            location: dbPanel.location || 'Unknown',
            capacity: dbPanel.capacity,
            owner: dbPanel.owner?.walletAddress || 'Unknown',
            isActive: dbPanel.status === 'active',
            registrationDate: new Date(),
            tokenAddress: dbPanel.blockchainTokenAddress
          };
        }
      } catch (dbError) {
        logger.warn(`Database panel lookup failed for ${serialNumber}:`, dbError);
      }
      
      // If all lookups fail, throw an error
      throw new Error(`Panel with serial number ${serialNumber} not found`);
    } catch (error) {
      logger.error('Error getting panel from blockchain:', error);
      throw new Error(`Error getting panel from blockchain: ${error.message}`);
    }
  }

  async getOwnerPanels(ownerAddress: string): Promise<string[]> {
    try {
      this.checkInitialization();
      
      let panelSerialNumbers: string[] = [];
      
      // Try to get panels from the blockchain using the owner address
      try {
        // Get all panel IDs owned by this wallet
        const panelIds = await (this.registryContract as any).getPanelsByOwner(ownerAddress);
        
        // For each panel ID, get the panel details to extract the externalId (our serial number)
        for (const panelId of panelIds) {
          try {
            const panel = await (this.registryContract as any).panels(panelId);
            if (panel.externalId) {
              panelSerialNumbers.push(panel.externalId);
            }
          } catch (panelError) {
            logger.warn(`Failed to fetch panel ${panelId.toString()} details:`, panelError);
          }
        }
      } catch (error) {
        logger.warn(`Failed to get panels for owner ${ownerAddress} from blockchain:`, error);
      }
      
      // Method 2: For newly created panels using createPanelWithShares, check the database
      // This is a fallback since these panels might not be returned by the getPanelsByOwner function
      try {
        // Get directly from database based on the txHash that was saved during creation
        const prisma = (await import('../config/prisma')).prisma;
        const dbPanels = await prisma.panel.findMany({
          where: {
            blockchainTxHash: { not: null },
            blockchainPanelId: { not: null },
            blockchainTokenAddress: { not: null },
          },
          select: {
            id: true,
            blockchainPanelId: true,
            blockchainTokenAddress: true
          }
        });
        
        // Add these panel IDs to our list if they have blockchain IDs
        for (const panel of dbPanels) {
          if (panel.blockchainPanelId && !panelSerialNumbers.includes(panel.id)) {
            panelSerialNumbers.push(panel.id);
          }
        }
      } catch (dbError) {
        logger.warn('Error getting panels from database:', dbError);
      }
      
      // If no panels found, log the issue
      if (panelSerialNumbers.length === 0) {
        logger.warn(`No panels found for wallet address ${ownerAddress}`);
      } else {
        logger.info(`Found ${panelSerialNumbers.length} panels for wallet address ${ownerAddress}`);
      }
      
      return panelSerialNumbers;
    } catch (error) {
      logger.error('Error getting owner panels from blockchain:', error);
      throw new Error(`Failed to get owner panels from blockchain: ${error.message}`);
    }
  }

  async getPanelById(panelId: string): Promise<any> {
    try {
      this.checkInitialization();
      
      // Try to find the panel in the registry
      if (!this.registryContract) {
        throw new Error('Registry contract not initialized');
      }
      
      // First, try to get the blockchain panel ID if we're using an external ID
      let blockchainPanelId;
      try {
        blockchainPanelId = await (this.registryContract as any).getPanelIdByExternalId(panelId);
        
        // If it returns 0, the panel doesn't exist with this external ID
        if (blockchainPanelId.toString() === '0') {
          // If panelId might be a number already, try using it directly
          blockchainPanelId = panelId;
        }
      } catch (error) {
        // If the lookup fails, assume panelId might be the blockchain ID already
        blockchainPanelId = panelId;
        logger.warn(`Failed to get panel ID by external ID, trying direct ID: ${error}`);
      }
      
      // Get panel details from registry
      const panel = await (this.registryContract as any).panels(blockchainPanelId);
      
      // Check if panel exists and has valid data
      if (!panel || panel.owner === ethers.ZeroAddress) {
        throw new Error(`Panel not found with ID ${blockchainPanelId}`);
      }
      
      // Check if the panel has a token address
      if (panel.shareTokenAddress === ethers.ZeroAddress) {
        // Return panel data without token information
        return {
          tokenId: blockchainPanelId.toString(),
          totalSupply: "0",
          availableSupply: "0",
          owner: panel.owner,
          isActive: panel.isActive,
          registrationDate: Number(panel.registrationDate)
        };
      }
      
      // If panel has a token, get token details
      try {
        // Load ShareToken ABI
        const ShareTokenABI = loadContractABI('ShareToken');
        
        // Create contract instance
        const shareTokenContract = new ethers.Contract(
          panel.shareTokenAddress,
          ShareTokenABI,
          this.provider
        );
        
        // Get token details
        const tokenDetails = await shareTokenContract.getTokenDetails();
        
        // Get available supply (total - held by registry or factory)
        const totalSupply = tokenDetails[0].toString();
        
        // Calculate available supply by checking registry's balance
        const registryBalance = await shareTokenContract.balanceOf(this.registryContract.target);
        
        // Available supply is total supply minus what registry/factory holds
        const availableSupply = (BigInt(totalSupply) - BigInt(registryBalance)).toString();
        
        return {
          tokenId: blockchainPanelId.toString(),
          totalSupply,
          availableSupply,
          owner: panel.owner,
          isActive: panel.isActive,
          registrationDate: Number(panel.registrationDate)
        };
      } catch (tokenError) {
        logger.error(`Error fetching token details for panel ${blockchainPanelId}:`, tokenError);
        
        // Return panel data with empty token info if token contract call fails
        return {
          tokenId: blockchainPanelId.toString(),
          totalSupply: "0",
          availableSupply: "0",
          owner: panel.owner,
          isActive: panel.isActive,
          registrationDate: Number(panel.registrationDate)
        };
      }
    } catch (error) {
      logger.error('Error getting panel by ID from blockchain:', error);
      
      // Fallback to simulated data with mock indicator
      const hash = ethers.id(panelId);
      const numericValue = parseInt(hash.slice(2, 10), 16);
      
      return {
        tokenId: (numericValue % 10000).toString(),
        totalSupply: (100 + (numericValue % 900)).toString(),
        availableSupply: (20 + (numericValue % 80)).toString(),
        owner: `0x${hash.slice(2, 42)}`,
        isActive: true,
        registrationDate: Math.floor(Date.now() / 1000) - (numericValue % 10000000),
        isMockData: true
      };
    }
  }

  async getTokenPrice(panelId: string): Promise<string | null> {
    try {
      this.checkInitialization();
      
      // First, get panel data to find the token contract
      const panelData = await this.getPanelById(panelId);
      
      // If we got mock data, return a simulated price with mock indicator
      if (panelData.isMockData) {
        const hash = ethers.id(panelId);
        const numericValue = parseInt(hash.slice(2, 10), 16);
        const price = (10 + (numericValue % 90)) / 10; // Price between $1.0 and $10.0
        return price.toFixed(2) + " (mock)";
      }
      
      // If panel exists but doesn't have tokens, return zero
      if (panelData.totalSupply === "0") {
        return "0.00";
      }
      
      // Get panel details to find token address
      let blockchainPanelId = panelData.tokenId;
      const panel = await (this.registryContract as any).panels(blockchainPanelId);
      
      // If no token address, return zero
      if (panel.shareTokenAddress === ethers.ZeroAddress) {
        return "0.00";
      }
      
      // In real-world use, you'd look up a price from a market or oracle here
      // For now, using a simple formula based on total supply and available supply
      const totalSupply = BigInt(panelData.totalSupply);
      const availableSupply = BigInt(panelData.availableSupply);
      
      if (totalSupply === BigInt(0)) {
        return "0.00";
      }
      
      // Price increases as availability decreases
      const soldRatio = Number((totalSupply - availableSupply) * BigInt(100) / totalSupply) / 100;
      const basePrice = 1.0;
      const price = basePrice + (basePrice * soldRatio * 4); // Price between $1 and $5
      
      return price.toFixed(2);
    } catch (error) {
      logger.error('Error getting token price:', error);
      return null;
    }
  }

  async getEstimatedROI(panelId: string): Promise<number | null> {
    try {
      this.checkInitialization();
      
      // Get panel data first to check if it exists and has tokens
      const panelData = await this.getPanelById(panelId);
      
      // If we got mock data, return a simulated ROI with an indicator
      if (panelData.isMockData) {
        const hash = ethers.id(panelId);
        const numericValue = parseInt(hash.slice(2, 10), 16);
        return 8 + (numericValue % 15); // ROI between 8% and 22%
      }
      
      // If panel exists in blockchain and is active
      if (panelData.isActive) {
        // Get panel details from registry
        let blockchainPanelId = panelData.tokenId;
        const panel = await (this.registryContract as any).panels(blockchainPanelId);
        
        // Use capacity to calculate estimated ROI
        // Higher capacity panels typically have better economies of scale
        const capacityWatts = Number(panel.minimumCapacity);
        
        // Calculate base ROI based on capacity
        // This is a simplified model - in reality, would use financial models
        // based on energy production, maintenance costs, etc.
        let baseROI = 10; // 10% base ROI
        
        if (capacityWatts >= 10000) { // 10+ kW
          baseROI = 15;
        } else if (capacityWatts >= 5000) { // 5-10 kW
          baseROI = 12;
        }
        
        // Add randomization based on panel ID for variation
        const hash = ethers.id(panelId);
        const numericValue = parseInt(hash.slice(2, 10), 16);
        const variation = (numericValue % 5) - 2; // -2 to +2 variation
        
        return baseROI + variation;
      }
      
      // If panel is not active
      return 0;
    } catch (error) {
      logger.error('Error calculating estimated ROI:', error);
      return null;
    }
  }

  async createPanelWithShares(
    panel: Panel, 
    tokenName: string, 
    tokenSymbol: string, 
    totalShares: number
  ): Promise<{ panelId: string; tokenAddress: string; txHash: string }> {
    try {
      this.checkInitialization();
      
      if (!this.factoryContract) {
        throw new Error('Factory contract not initialized');
      }

      // Create a wallet to sign the transaction from the user's wallet address
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.factoryContract.connect(wallet);

      logger.info('Creating panel with shares on blockchain:', { 
        panelId: panel.id,
        tokenName,
        tokenSymbol,
        totalShares
      });

      // Call the createPanelWithShares function
      const tx = await (contractWithSigner as any).createPanelWithShares(
        panel.id, // External ID (using panel ID)
        tokenName,
        tokenSymbol,
        totalShares
      );

      logger.info('Panel with shares creation transaction submitted:', { 
        txHash: tx.hash,
        panelId: panel.id 
      });

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Get the created panel ID and token address from the event
      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.factoryContract!.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .find((event: any) => event.name === 'PanelAndSharesCreated');
      
      if (!event) {
        throw new Error('Failed to find PanelAndSharesCreated event in transaction receipt');
      }
      
      const blockchainPanelId = event.args[0].toString();
      const shareTokenAddress = event.args[1];

      logger.info('Panel with shares created on blockchain:', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        panelId: panel.id,
        blockchainPanelId,
        shareTokenAddress
      });

      // Return transaction details
      return {
        panelId: blockchainPanelId,
        tokenAddress: shareTokenAddress,
        txHash: receipt.hash
      };
    } catch (error) {
      logger.error('Error creating panel with shares on blockchain:', error);
      throw new Error(`Failed to create panel with shares on blockchain: ${error}`);
    }
  }

  /**
   * Invest in a project by purchasing shares
   * @param panelId The ID of the panel/project
   * @param amount The amount of shares to purchase
   * @param investorAddress The wallet address of the investor
   * @returns Transaction details
   */
  async investInProject(
    panelId: string,
    amount: number,
    investorAddress: string
  ): Promise<{ txHash: string; sharesPurchased: number; tokenAddress: string }> {
    try {
      this.checkInitialization();
      
      // Get panel data to find the token contract
      const panelData = await this.getPanelById(panelId);
      
      // If we got mock data, throw an error
      if (panelData.isMockData) {
        throw new Error('Cannot invest in mock project data');
      }
      
      // Get panel details to find token address
      let blockchainPanelId = panelData.tokenId;
      const panel = await (this.registryContract as any).panels(blockchainPanelId);
      
      // If no token address, throw error
      if (panel.shareTokenAddress === ethers.ZeroAddress) {
        throw new Error('Project does not have an associated token for investment');
      }
      
      // Load ShareToken ABI
      const ShareTokenABI = loadContractABI('ShareToken');
      
      // Create contract instance
      const shareTokenContract = new ethers.Contract(
        panel.shareTokenAddress,
        ShareTokenABI,
        this.provider
      );
      
      // Calculate available supply
      const registryBalance = await shareTokenContract.balanceOf(this.registryContract!.target);
      
      // If amount is more than available, throw error
      if (BigInt(amount) > registryBalance) {
        throw new Error(`Insufficient shares available. Requested: ${amount}, Available: ${registryBalance.toString()}`);
      }
      
      // Sign transaction with admin wallet to transfer tokens to the investor
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = shareTokenContract.connect(wallet);
      
      logger.info('Initiating investment transaction:', { 
        panelId,
        amount,
        investorAddress,
        tokenAddress: panel.shareTokenAddress
      });
      
      // First check if we are approved to transfer
      const registryAddress = this.registryContract!.target;
      const allowance = await shareTokenContract.allowance(registryAddress, wallet.address);
      
      // If not approved, approve first
      if (allowance < BigInt(amount)) {
        try {
          // Only the registry can approve, and we may not have control over it
          // This is a simplified approach, in a real system the registry contract would have
          // a separate function for this operation
          throw new Error('Registry approval required for token transfer');
        } catch (approvalError) {
          logger.error('Failed to get approval for token transfer:', approvalError);
          throw new Error('Cannot transfer tokens without registry approval');
        }
      }
      
      // Transfer tokens directly
      // In a real implementation, this would usually be a purchase operation
      // where the investor sends payment and receives tokens
      const tx = await (contractWithSigner as any).transfer(investorAddress, amount);
      
      logger.info('Investment transaction submitted:', { 
        txHash: tx.hash,
        amount,
        investor: investorAddress
      });
      
      // Wait for transaction to complete
      const receipt = await tx.wait();
      
      logger.info('Investment transaction confirmed:', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount,
        investor: investorAddress
      });
      
      return {
        txHash: receipt.hash,
        sharesPurchased: amount,
        tokenAddress: panel.shareTokenAddress
      };
    } catch (error) {
      logger.error('Error investing in project:', error);
      throw new Error(`Failed to invest in project: ${error.message}`);
    }
  }
} 