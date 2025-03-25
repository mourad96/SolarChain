// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./SolarPanelRegistry.sol";
import "./ShareToken.sol";
import "./TokenSale.sol";

/**
 * @title SolarPanelFactory
 * @dev Factory contract for creating solar panels and their associated share tokens
 * @notice This contract is upgradeable using the UUPS proxy pattern
 */
contract SolarPanelFactory is 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    SolarPanelRegistry public registry;
    
    event PanelAndSharesCreated(
        uint256 indexed panelId, 
        address indexed shareToken, 
        address indexed owner,
        string externalId,
        uint256 totalShares,
        uint256 capacity
    );
    
    event TokenSaleCreated(
        address indexed shareToken,
        address indexed saleContract,
        uint256 price,
        uint256 tokensForSale,
        uint256 saleEndTime
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initializes the contract replacing the constructor for upgradeable contracts
     */
    function initialize(
        address _registryAddress
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        
        require(_registryAddress != address(0), "Invalid registry address");
        registry = SolarPanelRegistry(_registryAddress);
    }
    
    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    /**
     * @dev Creates a new solar panel with its associated share token in a single transaction
     * @param externalId The external ID linking to off-chain metadata
     * @param tokenName The name of the token
     * @param tokenSymbol The symbol of the token
     * @param totalShares The total number of shares to mint
     * @param capacity The capacity of the panel
     * @param tokensForSale The number of tokens to sell (set to 0 if no sale is needed)
     * @param tokenPrice The price per token in wei (only used if tokensForSale > 0)
     * @param saleEndTime The end time of the sale (only used if tokensForSale > 0)
     * @return panelId The ID of the created panel
     * @return tokenAddress The address of the created token
     * @return saleAddress The address of the created sale contract (address(0) if no sale was created)
     */
    function createPanelWithShares(
        string memory externalId,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 totalShares,
        uint256 capacity,
        uint256 tokensForSale,
        uint256 tokenPrice,
        uint256 saleEndTime
    ) public whenNotPaused onlyRole(REGISTRAR_ROLE) returns (uint256 panelId, address tokenAddress, address saleAddress) {
        require(bytes(externalId).length > 0, "External ID cannot be empty");
        require(bytes(tokenName).length > 0, "Token name cannot be empty");
        require(bytes(tokenSymbol).length > 0, "Token symbol cannot be empty");
        require(totalShares > 0, "Total shares must be greater than 0");
        require(capacity > 0, "Capacity must be greater than 0");
        
        // Determine if a sale should be created
        bool createSale = tokensForSale > 0;
        
        if (createSale) {
            require(tokensForSale <= totalShares, "Tokens for sale exceeds total shares");
            require(tokenPrice > 0, "Token price must be greater than 0");
            require(saleEndTime > block.timestamp, "Sale end time must be in the future");
        }
        
        // Register panel and deploy token
        panelId = registry.registerPanelByFactory(externalId, capacity, msg.sender);
        
        ShareToken implementation = new ShareToken();
        bytes memory initData = abi.encodeWithSelector(
            ShareToken(address(0)).initialize.selector,
            tokenName,
            tokenSymbol,
            address(registry),
            panelId
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        ShareToken shareToken = ShareToken(address(proxy));
        
        registry.linkShareToken(panelId, address(shareToken));
        shareToken.updatePanelMetadata(externalId);
        
        // Create sale contract first if tokens for sale is greater than 0
        if (createSale) {
            // Create token sale contract
            TokenSale saleImplementation = new TokenSale();
            
            // Initialize the sale proxy with initial data
            bytes memory saleInitData = abi.encodeWithSelector(
                TokenSale(address(0)).initialize.selector,
                address(shareToken),
                tokenPrice,
                saleEndTime
            );
            
            ERC1967Proxy saleProxy = new ERC1967Proxy(address(saleImplementation), saleInitData);
            TokenSale tokenSale = TokenSale(address(saleProxy));
            
            // Mint all shares directly to the sale contract
            shareToken.mintShares(totalShares, address(tokenSale));
            
            // Grant roles to the sender
            tokenSale.grantRole(tokenSale.DEFAULT_ADMIN_ROLE(), msg.sender);
            tokenSale.grantRole(tokenSale.ADMIN_ROLE(), msg.sender);
            tokenSale.grantRole(tokenSale.SALE_MANAGER_ROLE(), msg.sender);
            
            // Link the sale contract to the panel in the registry
            registry.linkSaleContract(panelId, address(tokenSale));
            
            emit TokenSaleCreated(
                address(shareToken),
                address(tokenSale),
                tokenPrice,
                tokensForSale,
                saleEndTime
            );
            
            saleAddress = address(tokenSale);
        } else {
            // If no sale, mint all shares to the sender
            shareToken.mintShares(totalShares, msg.sender);
            saleAddress = address(0);
        }
        
        // Transfer ownership
        shareToken.grantRole(shareToken.DEFAULT_ADMIN_ROLE(), msg.sender);
        shareToken.grantRole(shareToken.ADMIN_ROLE(), msg.sender);
        shareToken.grantRole(shareToken.MINTER_ROLE(), msg.sender);
        
        emit PanelAndSharesCreated(panelId, address(shareToken), msg.sender, externalId, totalShares, capacity);
        
        return (panelId, address(shareToken), saleAddress);
    }
    
    /**
     * @dev Pauses the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
} 