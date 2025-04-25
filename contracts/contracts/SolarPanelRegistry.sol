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
        address saleContractAddress; // Address of the associated sale contract
        uint256 capacity;        // Panel's capacity
    }

    // Mapping from panel ID to Panel struct
    mapping(uint256 => Panel) public panels;
    // Mapping from external ID to panel ID
    mapping(string => uint256) public externalIdToPanelId;
    // Mapping from owner address to array of panel IDs
    mapping(address => uint256[]) public ownerPanels;
    // Mapping from share token address to panel ID
    mapping(address => uint256) public tokenToPanelId;
    // Mapping from sale contract address to panel ID
    mapping(address => uint256) public saleToPanelId;
    
    uint256 private _nextPanelId;

    event PanelRegistered(
        uint256 indexed panelId,
        string externalId,
        address owner,
        address shareTokenAddress,
        uint256 capacity
    );
    event PanelStatusChanged(uint256 indexed panelId, bool isActive);
    event ShareTokenLinked(uint256 indexed panelId, address indexed tokenAddress);
    event SaleContractLinked(uint256 indexed panelId, address indexed saleAddress);
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
    function initialize() public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        _nextPanelId = 1;
    }

    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

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
     * @dev Links a sale contract to a panel
     * @param panelId The ID of the panel
     * @param saleAddress The address of the sale contract
     */
    function linkSaleContract(uint256 panelId, address saleAddress) 
        external 
        whenNotPaused 
        onlyFactoryOrAdmin 
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        require(saleAddress != address(0), "Invalid sale contract address");
        require(panels[panelId].shareTokenAddress != address(0), "Panel must have a token first");
        require(saleToPanelId[saleAddress] == 0, "Sale contract already linked to a panel");
        
        panels[panelId].saleContractAddress = saleAddress;
        saleToPanelId[saleAddress] = panelId;
        
        emit SaleContractLinked(panelId, saleAddress);
    }

    /**
     * @dev Registers a new panel with minimal on-chain data
     * @param _externalId The external ID linking to off-chain metadata
     * @param _capacity The capacity of this panel
     * @param _owner The owner of the panel
     * @return panelId The ID of the registered panel
     */
    function registerPanelByFactory(
        string memory _externalId,
        uint256 _capacity,
        address _owner
    ) public whenNotPaused onlyFactoryOrAdmin returns (uint256) {
        // Enhanced validation
        require(bytes(_externalId).length > 0, "External ID cannot be empty");
        require(_capacity > 0, "Capacity must be greater than 0");
        require(_owner != address(0), "Owner cannot be zero address");
        require(externalIdToPanelId[_externalId] == 0, "Panel with this external ID already registered");

        uint256 panelId = _nextPanelId++;

        panels[panelId] = Panel({
            externalId: _externalId,
            owner: _owner,
            isActive: true,
            registrationDate: block.timestamp,
            shareTokenAddress: address(0),
            saleContractAddress: address(0),
            capacity: _capacity
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
            address(0), // No token linked yet
            _capacity
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
     * @dev Gets the panel ID associated with a sale contract
     * @param saleAddress The address of the sale contract
     * @return The panel ID
     */
    function getPanelIdBySale(address saleAddress)
        external
        view
        returns (uint256)
    {
        return saleToPanelId[saleAddress];
    }

    /**
     * @dev Gets the share token address associated with a panel ID
     * @param panelId The ID of the panel
     * @return The share token address
     */
    function getShareTokenAddress(uint256 panelId)
        external
        view
        returns (address)
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        return panels[panelId].shareTokenAddress;
    }

    /**
     * @dev Gets the sale contract address associated with a panel ID
     * @param panelId The ID of the panel
     * @return The sale contract address
     */
    function getSaleContractAddress(uint256 panelId)
        external
        view
        returns (address)
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        return panels[panelId].saleContractAddress;
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
     * @dev Gets the next panel ID
     * @return The next panel ID
     */
    function getNextPanelId() external view returns (uint256) {
        return _nextPanelId;
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