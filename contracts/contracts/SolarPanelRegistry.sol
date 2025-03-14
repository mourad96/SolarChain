// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SolarPanelRegistry
 * @dev Enhanced contract for registering and managing solar panel assets with factory pattern support
 */
contract SolarPanelRegistry is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PANEL_OWNER_ROLE = keccak256("PANEL_OWNER_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    struct Panel {
        // Manufacturing details
        string serialNumber;
        string manufacturer;
        // Asset details
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

    // Factory address that is allowed to register panels
    address public factoryAddress;

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
    event FactoryAddressUpdated(address indexed previousFactory, address indexed newFactory);

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
     * @dev Sets the factory address that is allowed to register panels
     * @param _factoryAddress The address of the factory contract
     */
    function setFactoryAddress(address _factoryAddress) external onlyRole(ADMIN_ROLE) {
        address oldFactory = factoryAddress;
        factoryAddress = _factoryAddress;
        
        // Revoke factory role from old factory if it exists
        if (oldFactory != address(0) && hasRole(FACTORY_ROLE, oldFactory)) {
            revokeRole(FACTORY_ROLE, oldFactory);
        }
        
        // Grant factory role to new factory
        if (_factoryAddress != address(0)) {
            grantRole(FACTORY_ROLE, _factoryAddress);
        }
        
        emit FactoryAddressUpdated(oldFactory, _factoryAddress);
    }

    /**
     * @dev Registers a new panel with full details
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
     * @dev Registers a new panel with minimal details (for backward compatibility with SolarPanelRegistry)
     * @param _serialNumber The serial number of the panel
     * @param _manufacturer The manufacturer of the panel
     * @param _capacity The capacity of the panel
     * @return panelId The ID of the registered panel
     */
    function registerPanel(
        string memory _serialNumber,
        string memory _manufacturer,
        uint256 _capacity
    ) public whenNotPaused returns (uint256) {
        return registerPanelByFactory(
            _serialNumber,
            _manufacturer,
            _serialNumber, // Use serial number as name for backward compatibility
            "Not specified", // Default location
            _capacity,
            msg.sender
        );
    }

    /**
     * @dev Registers a new panel with full details (for backward compatibility with AssetRegistry)
     * @param _name The name of the panel
     * @param _location The location of the panel
     * @param _capacity The capacity of the panel
     * @return panelId The ID of the registered panel
     */
    function registerPanelAsset(
        string memory _name,
        string memory _location,
        uint256 _capacity
    ) external whenNotPaused returns (uint256) {
        // Generate a unique serial number based on name and timestamp
        string memory serialNumber = string(abi.encodePacked(_name, "-", uint2str(block.timestamp)));
        return registerPanelByFactory(
            serialNumber,
            "Not specified", // Default manufacturer
            _name,
            _location,
            _capacity,
            msg.sender
        );
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
     * @dev Gets panel details by ID
     * @param panelId The ID of the panel
     * @return serialNumber The serial number of the panel
     * @return manufacturer The manufacturer of the panel
     * @return name The name of the panel
     * @return location The location of the panel
     * @return capacity The capacity of the panel
     * @return owner The owner of the panel
     * @return isActive Whether the panel is active
     * @return registrationDate The registration date of the panel
     */
    function getPanelDetails(uint256 panelId) 
        external 
        view 
        returns (
            string memory serialNumber,
            string memory manufacturer,
            string memory name,
            string memory location,
            uint256 capacity,
            address owner,
            bool isActive,
            uint256 registrationDate
        ) 
    {
        Panel storage panel = panels[panelId];
        require(panel.owner != address(0), "Panel does not exist");
        return (
            panel.serialNumber,
            panel.manufacturer,
            panel.name,
            panel.location,
            panel.capacity,
            panel.owner,
            panel.isActive,
            panel.registrationDate
        );
    }

    /**
     * @dev Gets panel details by serial number (for backward compatibility)
     * @param _serialNumber The serial number of the panel
     * @return serialNumber The serial number of the panel
     * @return manufacturer The manufacturer of the panel
     * @return capacity The capacity of the panel
     * @return registrationDate The registration date of the panel
     * @return owner The owner of the panel
     * @return isActive Whether the panel is active
     */
    function getPanelBySerialNumber(string memory _serialNumber) 
        public 
        view 
        returns (
            string memory serialNumber,
            string memory manufacturer,
            uint256 capacity,
            uint256 registrationDate,
            address owner,
            bool isActive
        ) 
    {
        uint256 panelId = serialNumberToId[_serialNumber];
        require(panelId != 0, "Panel not found");
        
        Panel storage panel = panels[panelId];
        return (
            panel.serialNumber,
            panel.manufacturer,
            panel.capacity,
            panel.registrationDate,
            panel.owner,
            panel.isActive
        );
    }

    /**
     * @dev Gets all panels owned by an address
     * @param _owner The owner address
     * @return Array of panel IDs
     */
    function getOwnerPanels(address _owner) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return ownerPanels[_owner];
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
     * @dev Utility function to convert uint to string
     * @param _i The uint to convert
     * @return The string representation
     */
    function uint2str(uint _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
} 