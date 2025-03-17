// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./SolarPanelRegistry.sol";
import "./ShareToken.sol";

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
    uint256 public minimumPanelCapacity;
    
    event PanelAndSharesCreated(
        uint256 indexed panelId, 
        address indexed shareToken, 
        address indexed owner,
        string externalId,
        uint256 totalShares
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
        minimumPanelCapacity = 1 ether / 10; // 0.1 ETH
    }
    
    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    /**
     * @dev Creates a new solar panel with its associated share token in a single transaction
     */
    function createPanelWithShares(
        string memory externalId,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 totalShares
    ) public whenNotPaused onlyRole(REGISTRAR_ROLE) returns (uint256 panelId, address tokenAddress) {
        require(bytes(externalId).length > 0, "External ID cannot be empty");
        require(bytes(tokenName).length > 0, "Token name cannot be empty");
        require(bytes(tokenSymbol).length > 0, "Token symbol cannot be empty");
        require(totalShares > 0, "Total shares must be greater than 0");
        
        // Register panel and deploy token
        panelId = registry.registerPanelByFactory(externalId, minimumPanelCapacity, msg.sender);
        
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
        
        // Mint all shares to the sender
        shareToken.mintShares(totalShares, msg.sender);
        
        // Transfer ownership
        shareToken.grantRole(shareToken.DEFAULT_ADMIN_ROLE(), msg.sender);
        shareToken.grantRole(shareToken.ADMIN_ROLE(), msg.sender);
        shareToken.grantRole(shareToken.MINTER_ROLE(), msg.sender);
        
        emit PanelAndSharesCreated(panelId, address(shareToken), msg.sender, externalId, totalShares);
        return (panelId, address(shareToken));
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