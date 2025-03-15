// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SolarPanelRegistry
 * @dev Contract for registering and managing solar panel assets
 */
contract SolarPanelRegistry is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PANEL_OWNER_ROLE = keccak256("PANEL_OWNER_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    struct Panel {
        string serialNumber;
        string manufacturer;
        string name;
        string location;
        uint256 capacity; // in watts
        address owner;
        bool isActive;
        uint256 registrationDate;
    }

    // Mapping from panel ID to Panel struct
    mapping(uint256 => Panel) public panels;
    // Mapping from serial number to panel ID
    mapping(string => uint256) public serialNumberToId;
    // Mapping from owner address to array of panel IDs
    mapping(address => uint256[]) public ownerPanels;
    
    uint256 private _nextPanelId;

    event PanelRegistered(
        uint256 indexed panelId,
        string serialNumber,
        string manufacturer,
        string name,
        string location,
        uint256 capacity,
        address owner
    );
    event PanelUpdated(uint256 indexed panelId, string name, string location, uint256 capacity);
    event PanelStatusChanged(uint256 indexed panelId, bool isActive);

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

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _nextPanelId = 1;
    }

    /**
     * @dev Registers a new panel
     * @param _serialNumber The serial number of the panel
     * @param _manufacturer The manufacturer of the panel
     * @param _name The name of the panel
     * @param _location The location of the panel
     * @param _capacity The capacity of the panel
     * @param _owner The owner of the panel
     * @return panelId The ID of the registered panel
     */
    function registerPanelByFactory(
        string memory _serialNumber,
        string memory _manufacturer,
        string memory _name,
        string memory _location,
        uint256 _capacity,
        address _owner
    ) public whenNotPaused onlyFactoryOrAdmin returns (uint256) {
        require(bytes(_serialNumber).length > 0, "Serial number cannot be empty");
        require(bytes(_manufacturer).length > 0, "Manufacturer cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");
        require(_capacity > 0, "Capacity must be greater than 0");
        require(_owner != address(0), "Owner cannot be zero address");
        require(serialNumberToId[_serialNumber] == 0, "Panel with this serial number already registered");

        uint256 panelId = _nextPanelId++;

        panels[panelId] = Panel({
            serialNumber: _serialNumber,
            manufacturer: _manufacturer,
            name: _name,
            location: _location,
            capacity: _capacity,
            owner: _owner,
            isActive: true,
            registrationDate: block.timestamp
        });

        serialNumberToId[_serialNumber] = panelId;
        ownerPanels[_owner].push(panelId);
        
        if (!hasRole(PANEL_OWNER_ROLE, _owner)) {
            grantRole(PANEL_OWNER_ROLE, _owner);
        }

        emit PanelRegistered(
            panelId,
            _serialNumber,
            _manufacturer,
            _name,
            _location,
            _capacity,
            _owner
        );
        
        return panelId;
    }

    /**
     * @dev Updates panel metadata
     * @param panelId The ID of the panel
     * @param _name The new name of the panel
     * @param _location The new location of the panel
     * @param _capacity The new capacity of the panel
     */
    function updatePanelMetadata(
        uint256 panelId,
        string memory _name,
        string memory _location,
        uint256 _capacity
    ) external whenNotPaused onlyPanelOwnerOrAdmin(panelId) {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");
        require(_capacity > 0, "Capacity must be greater than 0");

        Panel storage panel = panels[panelId];
        panel.name = _name;
        panel.location = _location;
        panel.capacity = _capacity;

        emit PanelUpdated(panelId, _name, _location, _capacity);
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