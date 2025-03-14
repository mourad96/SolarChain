// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title AssetRegistry
 * @dev Contract for registering and managing solar panel assets
 */
contract AssetRegistry is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PANEL_OWNER_ROLE = keccak256("PANEL_OWNER_ROLE");

    struct SolarPanel {
        string name;
        string location;
        uint256 capacity; // in watts
        address owner;
        bool isActive;
        uint256 registrationDate;
    }

    // Mapping from panel ID to SolarPanel struct
    mapping(uint256 => SolarPanel) public panels;
    // Mapping from owner address to array of panel IDs
    mapping(address => uint256[]) public ownerPanels;
    
    uint256 private _nextPanelId;

    event PanelRegistered(uint256 indexed panelId, string name, string location, uint256 capacity, address owner);
    event PanelUpdated(uint256 indexed panelId, string name, string location, uint256 capacity);
    event PanelStatusChanged(uint256 indexed panelId, bool isActive);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _nextPanelId = 1;
    }

    modifier onlyPanelOwnerOrAdmin(uint256 panelId) {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            panels[panelId].owner == msg.sender,
            "Caller is not panel owner or admin"
        );
        _;
    }

    function registerPanel(
        string memory name,
        string memory location,
        uint256 capacity
    ) external whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(location).length > 0, "Location cannot be empty");
        require(capacity > 0, "Capacity must be greater than 0");

        uint256 panelId = _nextPanelId++;

        panels[panelId] = SolarPanel({
            name: name,
            location: location,
            capacity: capacity,
            owner: msg.sender,
            isActive: true,
            registrationDate: block.timestamp
        });

        ownerPanels[msg.sender].push(panelId);
        
        if (!hasRole(PANEL_OWNER_ROLE, msg.sender)) {
            _setupRole(PANEL_OWNER_ROLE, msg.sender);
        }

        emit PanelRegistered(panelId, name, location, capacity, msg.sender);
        return panelId;
    }

    function updatePanelMetadata(
        uint256 panelId,
        string memory name,
        string memory location,
        uint256 capacity
    ) external whenNotPaused onlyPanelOwnerOrAdmin(panelId) {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(location).length > 0, "Location cannot be empty");
        require(capacity > 0, "Capacity must be greater than 0");

        SolarPanel storage panel = panels[panelId];
        panel.name = name;
        panel.location = location;
        panel.capacity = capacity;

        emit PanelUpdated(panelId, name, location, capacity);
    }

    function setPanelStatus(uint256 panelId, bool isActive) 
        external 
        whenNotPaused 
        onlyPanelOwnerOrAdmin(panelId) 
    {
        require(panels[panelId].owner != address(0), "Panel does not exist");
        panels[panelId].isActive = isActive;
        emit PanelStatusChanged(panelId, isActive);
    }

    function getPanelDetails(uint256 panelId) 
        external 
        view 
        returns (
            string memory name,
            string memory location,
            uint256 capacity,
            address owner,
            bool isActive,
            uint256 registrationDate
        ) 
    {
        SolarPanel storage panel = panels[panelId];
        require(panel.owner != address(0), "Panel does not exist");
        return (
            panel.name,
            panel.location,
            panel.capacity,
            panel.owner,
            panel.isActive,
            panel.registrationDate
        );
    }

    function getOwnerPanels(address owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return ownerPanels[owner];
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
} 