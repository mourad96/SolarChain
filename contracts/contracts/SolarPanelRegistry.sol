// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SolarPanelRegistry
 * @dev Contract for registering and managing solar panel assets
 * @notice This contract is upgradeable using the UUPS proxy pattern
 */
contract SolarPanelRegistry is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PANEL_OWNER_ROLE = keccak256("PANEL_OWNER_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    struct Panel {
        string externalId;       // Unique ID to link with off-chain metadata
        address owner;           // Owner of the panel
        bool isActive;           // Active status
        uint256 registrationDate; // When the panel was registered
        address shareTokenAddress; // Address of the associated share token
        uint256 minimumCapacity;  // Minimum capacity required (for validation)
    }

    // Mapping from panel ID to Panel struct
    mapping(uint256 => Panel) public panels;
    // Mapping from external ID to panel ID
    mapping(string => uint256) public externalIdToPanelId;
    // Mapping from owner address to array of panel IDs
    mapping(address => uint256[]) public ownerPanels;
    // Mapping from share token address to panel ID
    mapping(address => uint256) public tokenToPanelId;
    
    uint256 private _nextPanelId;
    uint256 public minimumPanelCapacity; // Global minimum capacity requirement

    event PanelRegistered(
        uint256 indexed panelId,
        string externalId,
        address owner,
        address shareTokenAddress
    );
    event PanelStatusChanged(uint256 indexed panelId, bool isActive);
    event ShareTokenLinked(uint256 indexed panelId, address indexed tokenAddress);
    event MinimumCapacityUpdated(uint256 newMinimumCapacity);
    event EmergencyAction(string action, address indexed triggeredBy);
    event ExternalDataUpdated(uint256 indexed panelId, string externalId);

    modifier onlyPanelOwnerOrAdmin(uint256 panelId) {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            panels[panelId].owner == msg.sender,
            "Caller is not panel owner or admin"
        );
        _;
    }

    modifier onlyFactoryOrAdmin() {
        require(
            hasRole(FACTORY_ROLE, msg.sender) || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Caller is not factory or admin"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract replacing the constructor for upgradeable contracts
     */
    function initialize(uint256 _minimumPanelCapacity) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        _nextPanelId = 1;
        minimumPanelCapacity = _minimumPanelCapacity;
    }

    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Sets the minimum capacity required for panel registration
     * @param _minimumCapacity The new minimum capacity
     */
    function setMinimumPanelCapacity(uint256 _minimumCapacity) external onlyRole(ADMIN_ROLE) {
        minimumPanelCapacity = _minimumCapacity;
        emit MinimumCapacityUpdated(_minimumCapacity);
    }

    /**
     * @dev Links a share token to a panel
     * @param panelId The ID of the panel
     * @param tokenAddress The address of the share token
     */
    function linkShareToken(uint256 panelId, address tokenAddress) 
        external 
        whenNotPaused 
        onlyFactoryOrAdmin 
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        require(tokenAddress != address(0), "Invalid token address");
        require(panels[panelId].shareTokenAddress == address(0), "Panel already has a token");
        require(tokenToPanelId[tokenAddress] == 0, "Token already linked to a panel");
        
        panels[panelId].shareTokenAddress = tokenAddress;
        tokenToPanelId[tokenAddress] = panelId;
        
        emit ShareTokenLinked(panelId, tokenAddress);
    }

    /**
     * @dev Registers a new panel with minimal on-chain data
     * @param _externalId The external ID linking to off-chain metadata
     * @param _minimumCapacity The minimum capacity for this panel (for validation)
     * @param _owner The owner of the panel
     * @return panelId The ID of the registered panel
     */
    function registerPanelByFactory(
        string memory _externalId,
        uint256 _minimumCapacity,
        address _owner
    ) public whenNotPaused onlyFactoryOrAdmin returns (uint256) {
        // Enhanced validation
        require(bytes(_externalId).length > 0, "External ID cannot be empty");
        require(_minimumCapacity >= minimumPanelCapacity, "Capacity below minimum requirement");
        require(_owner != address(0), "Owner cannot be zero address");
        require(externalIdToPanelId[_externalId] == 0, "Panel with this external ID already registered");

        uint256 panelId = _nextPanelId++;

        panels[panelId] = Panel({
            externalId: _externalId,
            owner: _owner,
            isActive: true,
            registrationDate: block.timestamp,
            shareTokenAddress: address(0),
            minimumCapacity: _minimumCapacity
        });

        externalIdToPanelId[_externalId] = panelId;
        ownerPanels[_owner].push(panelId);
        
        if (!hasRole(PANEL_OWNER_ROLE, _owner)) {
            grantRole(PANEL_OWNER_ROLE, _owner);
        }

        emit PanelRegistered(
            panelId,
            _externalId,
            _owner,
            address(0) // No token linked yet
        );
        
        return panelId;
    }

    /**
     * @dev Updates the external ID for a panel
     * @param panelId The ID of the panel
     * @param _newExternalId The new external ID
     */
    function updateExternalId(
        uint256 panelId,
        string memory _newExternalId
    ) external whenNotPaused onlyPanelOwnerOrAdmin(panelId) {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        require(bytes(_newExternalId).length > 0, "External ID cannot be empty");
        require(externalIdToPanelId[_newExternalId] == 0 || externalIdToPanelId[_newExternalId] == panelId, 
                "External ID already in use");
        
        // Remove old mapping
        string memory oldExternalId = panels[panelId].externalId;
        delete externalIdToPanelId[oldExternalId];
        
        // Update to new external ID
        panels[panelId].externalId = _newExternalId;
        externalIdToPanelId[_newExternalId] = panelId;

        emit ExternalDataUpdated(panelId, _newExternalId);
    }

    /**
     * @dev Sets the active status of a panel
     * @param panelId The ID of the panel
     * @param isActive The new active status
     */
    function setPanelStatus(uint256 panelId, bool isActive) 
        external 
        whenNotPaused 
        onlyPanelOwnerOrAdmin(panelId) 
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        panels[panelId].isActive = isActive;
        emit PanelStatusChanged(panelId, isActive);
    }

    /**
     * @dev Gets all panel IDs owned by an address
     * @param owner The address to query
     * @return Array of panel IDs
     */
    function getPanelsByOwner(address owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return ownerPanels[owner];
    }

    /**
     * @dev Gets the panel ID associated with a share token
     * @param tokenAddress The address of the share token
     * @return The panel ID
     */
    function getPanelIdByToken(address tokenAddress)
        external
        view
        returns (uint256)
    {
        return tokenToPanelId[tokenAddress];
    }

    /**
     * @dev Gets the panel ID associated with an external ID
     * @param externalId The external ID
     * @return The panel ID
     */
    function getPanelIdByExternalId(string memory externalId)
        external
        view
        returns (uint256)
    {
        return externalIdToPanelId[externalId];
    }

    /**
     * @dev Emergency function to force update a panel's status
     * @param panelId The ID of the panel
     * @param isActive The new active status
     */
    function emergencySetPanelStatus(uint256 panelId, bool isActive)
        external
        onlyRole(EMERGENCY_ROLE)
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        panels[panelId].isActive = isActive;
        emit EmergencyAction("Set panel status", msg.sender);
        emit PanelStatusChanged(panelId, isActive);
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

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyAction("Emergency pause", msg.sender);
    }
} 