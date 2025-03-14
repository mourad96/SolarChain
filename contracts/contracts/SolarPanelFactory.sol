// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./SolarPanelRegistry.sol";

/**
 * @title SolarPanelFactory
 * @dev Factory contract for registering multiple solar panels at once
 */
contract SolarPanelFactory is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    SolarPanelRegistry public registry;
    
    event BatchPanelsRegistered(uint256 count, address indexed owner);
    event RegistryAddressUpdated(address indexed previousRegistry, address indexed newRegistry);
    
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
     * @dev Updates the registry address
     * @param _registryAddress The new registry address
     */
    function setRegistryAddress(address _registryAddress) external onlyRole(ADMIN_ROLE) {
        require(_registryAddress != address(0), "Invalid registry address");
        
        address oldRegistry = address(registry);
        registry = SolarPanelRegistry(_registryAddress);
        emit RegistryAddressUpdated(oldRegistry, _registryAddress);
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
     * @dev Registers multiple panels at once with minimal details (for backward compatibility)
     * @param _serialNumbers Array of serial numbers
     * @param _manufacturers Array of manufacturers
     * @param _capacities Array of capacities
     */
    function registerPanelsBatchSimple(
        string[] memory _serialNumbers,
        string[] memory _manufacturers,
        uint256[] memory _capacities
    ) external whenNotPaused {
        require(_serialNumbers.length == _manufacturers.length, "Arrays length mismatch");
        require(_serialNumbers.length == _capacities.length, "Arrays length mismatch");
        require(_serialNumbers.length > 0, "Empty arrays");
        
        string[] memory defaultLocations = new string[](_serialNumbers.length);
        for (uint256 i = 0; i < _serialNumbers.length; i++) {
            defaultLocations[i] = "Not specified";
        }
        
        registerPanelsBatchForOwners(
            _serialNumbers,
            _manufacturers,
            _serialNumbers, // Use serial numbers as names
            defaultLocations,
            _capacities,
            fillArray(msg.sender, _serialNumbers.length)
        );
    }
    
    /**
     * @dev Registers multiple panels at once for specified owners
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
     * @dev Utility function to create an array filled with the same address
     * @param addr The address to fill the array with
     * @param length The length of the array
     * @return The filled array
     */
    function fillArray(address addr, uint256 length) internal pure returns (address[] memory) {
        address[] memory result = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = addr;
        }
        return result;
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