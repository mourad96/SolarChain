// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./SolarPanelRegistry.sol";

/**
 * @title ShareToken
 * @dev ERC20 Token representing shares in solar panels
 * @notice This contract is upgradeable using the UUPS proxy pattern
 */
contract ShareToken is 
    Initializable, 
    ERC20Upgradeable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    SolarPanelRegistry public panelRegistry;
    
    // Panel ID this token represents
    uint256 public panelId;
    
    // Token details
    struct TokenDetails {
        uint256 totalShares;
        bool isMinted;
        string panelExternalId; // External ID linking to off-chain metadata
    }
    
    TokenDetails public tokenDetails;
    
    // Holder tracking
    address[] public tokenHolders;
    // Mapping from holder address to balance
    mapping(address => uint256) public holderBalances;
    // Mapping to track if an address is already in the holders array
    mapping(address => bool) public isHolder;

    event SharesMinted(uint256 indexed panelId, uint256 amount);
    event SharesTransferred(uint256 indexed panelId, address from, address to, uint256 amount);
    event PanelExternalIdUpdated(uint256 indexed panelId, string externalId);
    event EmergencyAction(string action, address indexed triggeredBy);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract replacing the constructor for upgradeable contracts
     */
    function initialize(
        string memory name,
        string memory symbol,
        address panelRegistryAddress,
        uint256 _panelId
    ) public initializer {
        __ERC20_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        require(panelRegistryAddress != address(0), "Invalid panel registry address");
        panelRegistry = SolarPanelRegistry(panelRegistryAddress);
        
        // Store the panel ID this token represents
        panelId = _panelId;
        
        // Initialize token details
        tokenDetails = TokenDetails({
            totalShares: 0,
            isMinted: false,
            panelExternalId: ""
        });
    }

    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Updates the token metadata with panel external ID
     * @param externalId The panel external ID
     */
    function updatePanelMetadata(
        string memory externalId
    ) external onlyRole(ADMIN_ROLE) {
        // We only store the external ID on-chain
        tokenDetails.panelExternalId = externalId;
        
        // Emit event with the external ID
        emit PanelExternalIdUpdated(panelId, externalId);
    }

    /**
     * @dev Mints shares for a panel
     * @param amount The amount of shares to mint
     * @param to The address to receive the shares
     */
    function mintShares(uint256 amount, address to) 
        external 
        whenNotPaused 
        onlyRole(MINTER_ROLE) 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(!tokenDetails.isMinted, "Shares already minted for this panel");
        require(to != address(0), "Cannot mint to zero address");
        
        // Get panel from registry to check existence and status
        (string memory externalId, , bool isActive, , , ) = panelRegistry.panels(panelId);
        require(bytes(externalId).length > 0, "Panel does not exist");
        require(isActive, "Panel is not active");
        
        tokenDetails.totalShares = amount;
        tokenDetails.isMinted = true;

        _mint(to, amount);
        holderBalances[to] = amount;
        
        if (!isHolder[to]) {
            tokenHolders.push(to);
            isHolder[to] = true;
        }
        
        emit SharesMinted(panelId, amount);
    }

    /**
     * @dev Overrides the ERC20 transfer function to track holders
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        require(to != address(0), "Cannot transfer to zero address");
        
        // Update holder balances
        holderBalances[msg.sender] -= amount;
        holderBalances[to] += amount;
        
        // Add new holder if not already in the list
        if (!isHolder[to]) {
            tokenHolders.push(to);
            isHolder[to] = true;
        }
        
        bool success = super.transfer(to, amount);
        if (success) {
            emit SharesTransferred(panelId, msg.sender, to, amount);
        }
        
        return success;
    }

    /**
     * @dev Overrides the ERC20 transferFrom function to track holders
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        whenNotPaused
        returns (bool)
    {
        require(to != address(0), "Cannot transfer to zero address");
        
        // Update holder balances
        holderBalances[from] -= amount;
        holderBalances[to] += amount;
        
        // Add new holder if not already in the list
        if (!isHolder[to]) {
            tokenHolders.push(to);
            isHolder[to] = true;
        }
        
        bool success = super.transferFrom(from, to, amount);
        if (success) {
            emit SharesTransferred(panelId, from, to, amount);
        }
        
        return success;
    }

    /**
     * @dev Gets all token holders
     * @return Array of holder addresses
     */
    function getTokenHolders() 
        external 
        view 
        returns (address[] memory) 
    {
        return tokenHolders;
    }

    /**
     * @dev Gets the balance of a holder
     * @param holder The address to query
     * @return The holder's balance
     */
    function getHolderBalance(address holder) 
        external 
        view 
        returns (uint256) 
    {
        return holderBalances[holder];
    }

    /**
     * @dev Gets the token details
     * @return totalShares The total shares minted
     * @return isMinted Whether shares have been minted
     * @return panelExternalId The panel external ID
     */
    function getTokenDetails() 
        external 
        view 
        returns (
            uint256 totalShares, 
            bool isMinted, 
            string memory panelExternalId
        ) 
    {
        return (
            tokenDetails.totalShares,
            tokenDetails.isMinted,
            tokenDetails.panelExternalId
        );
    }

    /**
     * @dev Emergency function to freeze all transfers
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyAction("Emergency pause", msg.sender);
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