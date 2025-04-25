import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { SolarPanelRegistry__factory, SolarPanelFactory__factory, ShareToken__factory, MockERC20__factory, TokenSale__factory, DividendDistributor__factory } from '../typechain-types';
import type { SolarPanelRegistry, SolarPanelFactory } from '../typechain-types';

// Define Panel interface to match expected structure
interface Panel {
  id: string;
  name: string;
  location: string;
  capacity: number;
  [key: string]: any; // Allow other properties
}

// Add interface for the factory contract methods
interface ISolarPanelFactory {
  createPanelWithShares(
    externalId: string,
    tokenName: string,
    tokenSymbol: string,
    capacity: ethers.BigNumberish,
    totalShares: ethers.BigNumberish,
    tokenPrice: ethers.BigNumberish,
    saleEndTime: ethers.BigNumberish,
    paymentToken: string
  ): Promise<ethers.ContractTransactionResponse>;
  interface: ethers.Interface;
  connect(signer: ethers.Signer): ISolarPanelFactory;
}

const USDC_DECIMALS = 18;

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: SolarPanelRegistry | null = null;
  private factoryContract: SolarPanelFactory | null = null;
  private paymentTokenContract: any = null; // Add payment token contract instance
  private dividendDistributorContract: any = null;
  private isInitialized: boolean = false;
  private isLocalNetwork: boolean = false;
  private enableDevMode: boolean = false;

  constructor() {
    try {
      const rpcUrl = process.env.AMOY_URL || 'https://rpc-amoy.polygon.technology';
      const registryAddress = process.env.SOLAR_PANEL_REGISTRY_ADDRESS;
      const factoryAddress = process.env.SOLAR_PANEL_FACTORY_ADDRESS;
      const paymentTokenAddress = process.env.MOCK_ERC20_ADDRESS;
      const dividendDistributorAddress = process.env.DIVIDEND_DISTRIBUTOR_ADDRESS;
      
      // Check if we're using a local network
      this.isLocalNetwork = rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost');
      
      // Check if dev mode is enabled
      this.enableDevMode = process.env.ENABLE_DEV_MODE === 'true';
      
      // Log configuration
      logger.info('Blockchain service configuration:', {
        rpcUrl, 
        isLocalNetwork: this.isLocalNetwork,
        enableDevMode: this.enableDevMode
      });
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Only initialize contracts if addresses are provided and not empty
      if (registryAddress && registryAddress.trim() !== '') {
        this.registryContract = SolarPanelRegistry__factory.connect(registryAddress, this.provider);
        this.isInitialized = true;
        
        logger.info('Registry contract initialized successfully', {
          registryAddress,
          network: this.isLocalNetwork ? 'local' : 'testnet'
        });
      } else {
        logger.warn('Missing blockchain configuration: SOLAR_PANEL_REGISTRY_ADDRESS not set or empty');
      }
      
      // Initialize factory contract if address is provided and not empty
      if (factoryAddress && factoryAddress.trim() !== '') {
        this.factoryContract = SolarPanelFactory__factory.connect(factoryAddress, this.provider);
        
        logger.info('Factory contract initialized successfully', {
          factoryAddress,
          network: this.isLocalNetwork ? 'local' : 'testnet'
        });
      } else {
        logger.warn('Missing blockchain configuration: SOLAR_PANEL_FACTORY_ADDRESS not set or empty');
      }

      // Initialize payment token contract if address is provided and not empty
      if (paymentTokenAddress && paymentTokenAddress.trim() !== '') {
        this.paymentTokenContract = MockERC20__factory.connect(paymentTokenAddress, this.provider);
        
        logger.info('Payment token contract initialized successfully', {
          paymentTokenAddress,
          network: this.isLocalNetwork ? 'local' : 'testnet'
        });
      } else {
        logger.warn('Missing blockchain configuration: MOCK_ERC20_ADDRESS not set or empty');
      }

      // Initialize dividend distributor contract if address is provided and not empty
      if (dividendDistributorAddress && dividendDistributorAddress.trim() !== '') {
        this.dividendDistributorContract = DividendDistributor__factory.connect(dividendDistributorAddress, this.provider);
        
        logger.info('Dividend distributor contract initialized successfully', {
          dividendDistributorAddress,
          network: this.isLocalNetwork ? 'local' : 'testnet'
        });
      } else {
        logger.warn('Missing blockchain configuration: DIVIDEND_DISTRIBUTOR_ADDRESS not set or empty');
      }
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
      // try {
      //   // Get directly from database based on the txHash that was saved during creation
      //   const prisma = (await import('../config/prisma')).prisma;
      //   const dbPanels = await prisma.panel.findMany({
      //     where: {
      //       blockchainTxHash: { not: null },
      //       blockchainPanelId: { not: null },
      //       blockchainTokenAddress: { not: null },
      //     },
      //     select: {
      //       id: true,
      //       blockchainPanelId: true,
      //       blockchainTokenAddress: true
      //     }
      //   });
        
      //   // Add these panel IDs to our list if they have blockchain IDs
      //   for (const panel of dbPanels) {
      //     if (panel.blockchainPanelId && !panelSerialNumbers.includes(panel.id)) {
      //       panelSerialNumbers.push(panel.id);
      //     }
      //   }
      // } catch (dbError) {
      //   logger.warn('Error getting panels from database:', dbError);
      // }
      
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

      // Get database connection to fetch panel name
      const prisma = (await import('../config/prisma')).prisma;
      
      // Look up panel in database using blockchain panel ID
      const dbPanel = await prisma.panel.findFirst({
        where: { blockchainPanelId: blockchainPanelId.toString() },
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true
        }
      });

      // Common panel data with name from database
      const commonData = {
        tokenId: blockchainPanelId.toString(),
        owner: panel.owner,
        isActive: panel.isActive,
        registrationDate: Number(panel.registrationDate),
        name: dbPanel?.name || `Solar Panel ${blockchainPanelId}`,
        location: dbPanel?.location || 'Unknown',
        capacity: dbPanel?.capacity || Number(panel.capacity) / 1000
      };
      
      // Check if the panel has a token address
      if (panel.shareTokenAddress === ethers.ZeroAddress) {
        // Return panel data without token information
        return {
          ...commonData,
          totalSupply: "0",
          availableSupply: "0",
          price: "0.00"
        };
      }
      
      // If panel has a token, get token details
      try {
        // Create contract instance for the share token
        const shareTokenContract = ShareToken__factory.connect(panel.shareTokenAddress, this.provider);
        
        // Get token details
        const tokenDetails = await shareTokenContract.getTokenDetails();
        
        // Get total supply
        const totalSupply = tokenDetails[0].toString();
        
        // Get available supply by checking TokenSale contract's balance
        const tokenSaleContract = TokenSale__factory.connect(panel.saleContractAddress, this.provider);
        const tokenSaleBalance = await shareTokenContract.balanceOf(panel.saleContractAddress);
        
        // Available supply is the TokenSale contract's balance
        const availableSupply = tokenSaleBalance.toString();

        // Get token price from TokenSale contract
        const price = await this.getTokenPrice(panel.saleContractAddress);
        
        return {
          ...commonData,
          totalSupply,
          availableSupply,
          price: price || "0.00",
          saleContractAddress: panel.saleContractAddress,
          shareTokenAddress: panel.shareTokenAddress
        };
      } catch (tokenError) {
        logger.error(`Error fetching token details for panel ${blockchainPanelId}:`, tokenError);
        
        // Return panel data with empty token info if token contract call fails
        return {
          ...commonData,
          totalSupply: "0",
          availableSupply: "0",
          price: "0.00"
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
        isMockData: true,
        price: ((10 + (numericValue % 90)) / 10).toFixed(2) + " (mock)",
        name: `Solar Panel ${panelId}` // Use generic name for mock data
      };
    }
  }

  async getTokenPrice(tokenSaleAddress: string): Promise<string | null> {
    try {
      this.checkInitialization();
      
      // If no token sale address provided, return zero
      if (!tokenSaleAddress || tokenSaleAddress === ethers.ZeroAddress) {
        return "0.00";
      }

      // Create TokenSale contract instance
      const tokenSaleContract = TokenSale__factory.connect(tokenSaleAddress, this.provider);
      
      // Get the price from the TokenSale contract
      const price = await tokenSaleContract.price();
      
      // Convert price from wei to USDC (assuming 18 decimals)
      const priceInUSDC = ethers.formatUnits(price, USDC_DECIMALS);
      
      return priceInUSDC;
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
  ): Promise<{ 
    transactions: {
      approve: {
        to: string;
        data: string;
        value: string;
      };
      create: {
        to: string;
        data: string;
        value: string;
      };
    }
  }> {
    try {
      this.checkInitialization();

      if (!this.factoryContract) {
        throw new Error('Factory contract not properly initialized');
      }

      if (!this.paymentTokenContract) {
        throw new Error('Payment token contract not properly initialized');
      }

      // Get USDC address from environment
      const paymentToken = process.env.MOCK_ERC20_ADDRESS;
      if (!paymentToken) {
        throw new Error('Missing USDC token address configuration');
      }

      // Set default token price (in USDC, 18 decimals)
      const tokenPrice = ethers.parseUnits("1", "ether"); // 1 USDC per token to reduce cost

      // Set sale end time to 30 days from now
      const saleEndTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      // Convert capacity to Wei (18 decimals)
      const capacityInWei = ethers.parseUnits(panel.capacity.toString(), USDC_DECIMALS);

      logger.info('Preparing panel creation transaction data:', {
        externalId: panel.id,
        tokenName,
        tokenSymbol,
        capacity: capacityInWei.toString(),
        totalShares,
        tokenPrice: tokenPrice.toString(),
        saleEndTime,
        paymentToken,
        network: this.isLocalNetwork ? 'local' : 'testnet'
      });

      // Prepare approval transaction data
      const approvalAmount = ethers.MaxUint256; // Infinite approval
      const approvalData = this.paymentTokenContract.interface.encodeFunctionData('approve', [
        this.factoryContract.target,
        approvalAmount
      ]);

      // Prepare create panel transaction data
      const createData = this.factoryContract.interface.encodeFunctionData('createPanelWithShares', [
        panel.id, // externalId
        tokenName,
        tokenSymbol,
        capacityInWei, // capacity in Wei
        totalShares,
        tokenPrice,
        saleEndTime,
        paymentToken
      ]);

      return {
        transactions: {
          approve: {
            to: this.paymentTokenContract.target.toString(),
            data: approvalData,
            value: '0x0'
          },
          create: {
            to: this.factoryContract.target.toString(),
            data: createData,
            value: '0x0'
          }
        }
      };
    } catch (error) {
      logger.error('Error preparing panel creation transaction:', error);
      throw new Error(`Failed to prepare panel creation transaction: ${error.message}`);
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
  ): Promise<{ 
    txHash: string; 
    sharesPurchased: number; 
    tokenAddress: string;
    transactionData: any; // Add transactionData to return type
  }> {
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
      
      // Create contract instance for the share token
      const shareTokenContract = ShareToken__factory.connect(panel.shareTokenAddress, this.provider);
      
      // Load USDC contract (MockERC20) address from environment
      const usdcAddress = process.env.MOCK_ERC20_ADDRESS;
      if (!usdcAddress) {
        throw new Error('Missing USDC token address configuration');
      }
      
      // Create contract instance for the USDC token
      const usdcContract = MockERC20__factory.connect(usdcAddress, this.provider);
      
      // Get price per token from panel data (or pricing method)
      const priceString = await this.getTokenPrice(panel.saleContractAddress);
      if (!priceString) {
        throw new Error('Failed to get token price');
      }
      
      // Convert price from USD to token units (assuming 18 decimals for USDC)
      const price = parseFloat(priceString.replace(' (mock)', ''));
      const totalCost = price * amount;
      const totalCostInWei = ethers.parseUnits(totalCost.toFixed(6), USDC_DECIMALS);
      
      logger.info('Investment transaction details:', {
        panelId,
        amount,
        investorAddress,
        pricePerToken: price,
        totalCost,
        tokenAddress: panel.shareTokenAddress
      });
      
      // 1. Investor needs to approve the registry to spend their USDC
      // This would typically be done in the frontend before calling this method
      // We'll check if the required allowance is already present
      const currentAllowance = await usdcContract.allowance(investorAddress, panel.saleContractAddress);
      console.log("investorAddress", investorAddress);
      console.log("panel.saleContractAddress", panel.saleContractAddress);
      if (currentAllowance < totalCostInWei) {
        logger.warn('Insufficient USDC allowance for purchase', {
          currentAllowance: currentAllowance.toString(),
          required: totalCostInWei.toString()
        });
        throw new Error('Investor must approve USDC spending first. Please approve the required amount in your wallet.');
      }
      
      // 2. Return the transaction data for the frontend to sign
      // Create contract instance for the TokenSale contract
      const tokenSaleContract = new ethers.Contract(
        panel.saleContractAddress,
        ['function purchaseTokens(uint256 amount)'],
        this.provider
      );
      
      // Get the transaction data
      const txData = await tokenSaleContract.purchaseTokens.populateTransaction(amount);
      
      // Return the transaction data for the frontend to sign
      return {
        txHash: '', // Will be filled by frontend after signing
        sharesPurchased: amount,
        tokenAddress: panel.shareTokenAddress,
        transactionData: txData // Add transaction data for frontend
      };
    } catch (error) {
      logger.error('Error investing in project:', error);
      throw new Error(`Failed to invest in project: ${error.message}`);
    }
  }

  /**
   * Claims dividends for a specific panel
   * @param panelId The blockchain ID of the panel
   * @param userAddress The wallet address of the user claiming dividends
   * @returns Transaction data for claiming dividends
   */
  async claimDividends(panelId: string): Promise<{
    to: string;
    data: string;
    value: string;
  }> {
    try {
      this.checkInitialization();

      if (!this.dividendDistributorContract) {
        throw new Error('Dividend distributor contract not properly initialized');
      }

      // Get private key for signing transactions
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Missing private key for blockchain transactions');
      }

      // Create a wallet to sign transactions
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Connect to the contract with the signer
      const distributorWithSigner = this.dividendDistributorContract.connect(wallet);

      // Prepare the claim dividends transaction data
      const data = distributorWithSigner.interface.encodeFunctionData('claimDividends', [panelId]);

      logger.info('Prepared claim dividends transaction data:', {
        panelId,
        contractAddress: this.dividendDistributorContract.target,
        network: this.isLocalNetwork ? 'local' : 'testnet'
      });

      // Return the transaction data for the frontend to execute
      return {
        to: this.dividendDistributorContract.target,
        data: data,
        value: '0x0'
      };
    } catch (error) {
      logger.error('Error preparing claim dividends transaction:', error);
      throw new Error(`Failed to prepare claim dividends transaction: ${error.message}`);
    }
  }

  /**
   * Gets unclaimed dividends for a holder of a specific panel
   * @param panelId The blockchain ID of the panel
   * @param holderAddress The address of the holder
   * @returns The amount of unclaimed dividends in wei
   */
  async getUnclaimedDividends(panelId: string, holderAddress: string): Promise<bigint> {
    try {
      this.checkInitialization();

      if (!this.dividendDistributorContract) {
        throw new Error('Dividend distributor contract not properly initialized');
      }

      logger.info('Getting unclaimed dividends:', {
        panelId,
        holderAddress,
        contractAddress: this.dividendDistributorContract.target,
        network: this.isLocalNetwork ? 'local' : 'testnet'
      });

      // Get unclaimed dividends
      const unclaimedDividends = await this.dividendDistributorContract.getUnclaimedDividends(
        panelId,
        holderAddress
      );
      
      logger.info('Unclaimed dividends result:', {
        panelId,
        holderAddress,
        unclaimedDividends: unclaimedDividends.toString(),
        formattedAmount: ethers.formatUnits(unclaimedDividends, 18)
      });

      return unclaimedDividends;
    } catch (error) {
      logger.error('Error getting unclaimed dividends:', {
        error,
        panelId,
        holderAddress,
        network: this.isLocalNetwork ? 'local' : 'testnet'
      });
      throw new Error(`Failed to get unclaimed dividends: ${error.message}`);
    }
  }

  /**
   * Gets the next panel ID that will be assigned
   * @returns The next panel ID as a string
   */
  async getNextPanelId(): Promise<string> {
    try {
      this.checkInitialization();

      if (!this.registryContract) {
        throw new Error('Registry contract not properly initialized');
      }

      logger.info('Getting next panel ID from registry contract');

      // Call the getNextPanelId function from the contract using type assertion
      const nextPanelId = await (this.registryContract as any).getNextPanelId();

      logger.info('Retrieved next panel ID:', {
        nextPanelId: nextPanelId.toString()
      });

      return nextPanelId.toString();
    } catch (error) {
      logger.error('Error getting next panel ID:', error);
      throw new Error(`Failed to get next panel ID: ${error.message}`);
    }
  }

  /**
   * Gets all panels from the blockchain with database information when available
   * @returns Array of panel information including names from database when available
   */
  async getAllPanels(): Promise<Array<{
    serialNumber: string;
    name: string;
    location: string;
    capacity: number;
  }>> {
    try {
      this.checkInitialization();
      
      let panels: Array<{
        serialNumber: string;
        name: string;
        location: string;
        capacity: number;
      }> = [];
      
      // Get the next panel ID to know how many panels exist
      const nextPanelId = await this.getNextPanelId();
      const totalPanels = Number(nextPanelId) - 1;
      
      // Get database connection
      const prisma = (await import('../config/prisma')).prisma;
      
      // Iterate through all panel IDs
      for (let i = 1; i <= totalPanels; i++) {
        try {
          const panel = await (this.registryContract as any).panels(i);
          
          // Look up panel in database using blockchain panel ID
          const dbPanel = await prisma.panel.findFirst({
            where: { blockchainPanelId: i.toString() },
            select: {
              id: true,
              name: true,
              location: true,
              capacity: true
            }
          });

          if (dbPanel) {
            // If we have a database entry, use its exact values
            panels.push({
              serialNumber: dbPanel.id,
              name: dbPanel.name,
              location: dbPanel.location || 'Unknown',
              capacity: dbPanel.capacity
            });
          }
        } catch (panelError) {
          logger.warn(`Failed to fetch panel ${i} details:`, panelError);
        }
      }
      
      logger.info(`Found ${panels.length} total panels`);
      
      return panels;
    } catch (error) {
      logger.error('Error getting all panels from blockchain:', error);
      throw new Error(`Failed to get all panels from blockchain: ${error.message}`);
    }
  }
}