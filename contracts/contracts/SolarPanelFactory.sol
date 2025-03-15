// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./SolarPanelRegistry.sol";

/**
 * @title SolarPanelFactory
 * @dev Factory contract for registering solar panels
 */
contract SolarPanelFactory is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    SolarPanelRegistry public registry;
    
    event BatchPanelsRegistered(uint256 count, address indexed owner);
    
    /**
     * @dev Constructor that sets the registry address
     * @param _registryAddress The address of the SolarPanelRegistry contract
     */
    constructor(address _registryAddress) {
        require(_registryAddress != address(0), "Invalid registry address");
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(REGISTRAR_ROLE, msg.sender);
        
        registry = SolarPanelRegistry(_registryAddress);
    }
    
    /**
     * @dev Registers multiple panels at once for the caller
     * @param _serialNumbers Array of serial numbers
     * @param _manufacturers Array of manufacturers
     * @param _names Array of panel names
     * @param _locations Array of panel locations
     * @param _capacities Array of capacities
     */
    function registerPanelsBatch(
        string[] memory _serialNumbers,
        string[] memory _manufacturers,
        string[] memory _names,
        string[] memory _locations,
        uint256[] memory _capacities
    ) external whenNotPaused {
        require(_serialNumbers.length == _manufacturers.length, "Arrays length mismatch");
        require(_serialNumbers.length == _names.length, "Arrays length mismatch");
        require(_serialNumbers.length == _locations.length, "Arrays length mismatch");
        require(_serialNumbers.length == _capacities.length, "Arrays length mismatch");
        require(_serialNumbers.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < _serialNumbers.length; i++) {
            registry.registerPanelByFactory(
                _serialNumbers[i],
                _manufacturers[i],
                _names[i],
                _locations[i],
                _capacities[i],
                msg.sender
            );
        }
        
        emit BatchPanelsRegistered(_serialNumbers.length, msg.sender);
    }
    
    /**
     * @dev Registers multiple panels at once for specified owners (admin only)
     * @param _serialNumbers Array of serial numbers
     * @param _manufacturers Array of manufacturers
     * @param _names Array of panel names
     * @param _locations Array of panel locations
     * @param _capacities Array of capacities
     * @param _owners Array of panel owners
     */
    function registerPanelsBatchForOwners(
        string[] memory _serialNumbers,
        string[] memory _manufacturers,
        string[] memory _names,
        string[] memory _locations,
        uint256[] memory _capacities,
        address[] memory _owners
    ) public whenNotPaused onlyRole(REGISTRAR_ROLE) {
        require(_serialNumbers.length == _manufacturers.length, "Arrays length mismatch");
        require(_serialNumbers.length == _names.length, "Arrays length mismatch");
        require(_serialNumbers.length == _locations.length, "Arrays length mismatch");
        require(_serialNumbers.length == _capacities.length, "Arrays length mismatch");
        require(_serialNumbers.length == _owners.length, "Arrays length mismatch");
        require(_serialNumbers.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < _serialNumbers.length; i++) {
            registry.registerPanelByFactory(
                _serialNumbers[i],
                _manufacturers[i],
                _names[i],
                _locations[i],
                _capacities[i],
                _owners[i]
            );
        }
        
        emit BatchPanelsRegistered(_serialNumbers.length, address(0));
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