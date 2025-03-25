// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./ShareToken.sol";
import "./SolarPanelRegistry.sol";

/**
 * @title DividendDistributor
 * @dev Contract for distributing dividends to solar panel share holders
 * @notice This contract is upgradeable using the UUPS proxy pattern
 */
contract DividendDistributor is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    ShareToken public shareToken;
    SolarPanelRegistry public panelRegistry;
    IERC20Upgradeable public paymentToken; // ERC20 token used for dividend payments (e.g., USDC)
    
    struct DividendInfo {
        uint256 amount;
        uint256 timestamp;
        bool distributed;
        address distributor;
    }
    
    // Mapping from panel ID to dividend distribution history
    mapping(uint256 => DividendInfo[]) public dividendHistory;
    // Mapping from panel ID to total dividends distributed
    mapping(uint256 => uint256) public totalDividends;
    // Mapping from panel ID to holder address to claimed dividends
    mapping(uint256 => mapping(address => uint256)) public claimedDividends;
    // Mapping from token address to panel ID
    mapping(address => uint256) public tokenToPanelId;

    event DividendDistributed(uint256 indexed panelId, uint256 amount, uint256 timestamp, address distributor);
    event DividendClaimed(uint256 indexed panelId, address indexed holder, uint256 amount);
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event EmergencyAction(string action, address indexed triggeredBy);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract replacing the constructor for upgradeable contracts
     */
    function initialize(
        address shareTokenAddress,
        address panelRegistryAddress,
        address paymentTokenAddress
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        require(shareTokenAddress != address(0), "Invalid share token address");
        require(panelRegistryAddress != address(0), "Invalid panel registry address");
        require(paymentTokenAddress != address(0), "Invalid payment token address");
        
        shareToken = ShareToken(shareTokenAddress);
        panelRegistry = SolarPanelRegistry(panelRegistryAddress);
        paymentToken = IERC20Upgradeable(paymentTokenAddress);
    }

    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Updates the payment token
     * @param newPaymentTokenAddress The address of the new payment token
     */
    function updatePaymentToken(address newPaymentTokenAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(newPaymentTokenAddress != address(0), "Invalid payment token address");
        address oldToken = address(paymentToken);
        paymentToken = IERC20Upgradeable(newPaymentTokenAddress);
        
        emit PaymentTokenUpdated(oldToken, newPaymentTokenAddress);
    }

    /**
     * @dev Distributes dividends for a panel
     * @param panelId The ID of the panel
     * @param amount The amount of dividends to distribute
     */
    function distributeDividends(uint256 panelId, uint256 amount) 
        external 
        whenNotPaused 
        onlyRole(DISTRIBUTOR_ROLE) 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        // Get panel from registry
        (string memory externalId, , bool isActive, , address tokenAddress, , ) = panelRegistry.panels(panelId);
        require(bytes(externalId).length > 0, "Panel does not exist");
        require(isActive, "Panel is not active");
        require(tokenAddress != address(0), "Panel has no associated token");
        
        // Get token details
        ShareToken token = ShareToken(tokenAddress);
        (uint256 totalShares, bool isMinted, ) = token.getTokenDetails();
        require(isMinted, "Shares not minted for this panel");
        require(totalShares > 0, "No shares minted");
        
        // Transfer payment tokens from distributor to this contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Payment token transfer failed"
        );
        
        // Record dividend distribution
        dividendHistory[panelId].push(DividendInfo({
            amount: amount,
            timestamp: block.timestamp,
            distributed: true,
            distributor: msg.sender
        }));
        
        totalDividends[panelId] += amount;
        
        emit DividendDistributed(panelId, amount, block.timestamp, msg.sender);
    }

    /**
     * @dev Claims dividends for a panel
     * @param panelId The ID of the panel
     */
    function claimDividends(uint256 panelId) 
        external 
        whenNotPaused 
    {
        address holder = msg.sender;
        
        // Get panel from registry
        (, , bool isActive, , address tokenAddress, , ) = panelRegistry.panels(panelId);
        require(isActive, "Panel is not active");
        require(tokenAddress != address(0), "Panel has no associated token");
        
        // Get token details and holder balance
        ShareToken token = ShareToken(tokenAddress);
        uint256 holderShares = token.getHolderBalance(holder);
        require(holderShares > 0, "No shares owned");
        
        (uint256 totalShares, , ) = token.getTokenDetails();
        uint256 totalAvailable = totalDividends[panelId];
        uint256 alreadyClaimed = claimedDividends[panelId][holder];
        
        uint256 entitled = (holderShares * totalAvailable) / totalShares;
        uint256 unclaimed = entitled - alreadyClaimed;
        require(unclaimed > 0, "No unclaimed dividends");
        
        claimedDividends[panelId][holder] = entitled;
        
        require(
            paymentToken.transfer(holder, unclaimed),
            "Payment token transfer failed"
        );
        
        emit DividendClaimed(panelId, holder, unclaimed);
    }

    /**
     * @dev Gets unclaimed dividends for a holder
     * @param panelId The ID of the panel
     * @param holder The address of the holder
     * @return The amount of unclaimed dividends
     */
    function getUnclaimedDividends(uint256 panelId, address holder) 
        external 
        view 
        returns (uint256) 
    {
        // Get panel from registry
        (, , , , address tokenAddress, , ) = panelRegistry.panels(panelId);
        if (tokenAddress == address(0)) return 0;
        
        // Get token details and holder balance
        ShareToken token = ShareToken(tokenAddress);
        uint256 holderShares = token.getHolderBalance(holder);
        if (holderShares == 0) return 0;
        
        (uint256 totalShares, , ) = token.getTokenDetails();
        if (totalShares == 0) return 0;
        
        uint256 totalAvailable = totalDividends[panelId];
        uint256 alreadyClaimed = claimedDividends[panelId][holder];
        
        uint256 entitled = (holderShares * totalAvailable) / totalShares;
        return entitled - alreadyClaimed;
    }

    /**
     * @dev Gets dividend history for a panel
     * @param panelId The ID of the panel
     * @return Array of dividend info
     */
    function getDividendHistory(uint256 panelId) 
        external 
        view 
        returns (DividendInfo[] memory) 
    {
        return dividendHistory[panelId];
    }

    /**
     * @dev Emergency function to pause all operations
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