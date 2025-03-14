// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SolarPanelRegistry {
    struct Panel {
        string serialNumber;
        string manufacturer;
        uint256 capacity;
        uint256 registrationDate;
        address owner;
        bool isRegistered;
    }

    mapping(string => Panel) public panels;
    mapping(address => string[]) public ownerPanels;

    event PanelRegistered(
        string serialNumber,
        string manufacturer,
        uint256 capacity,
        address owner
    );

    function registerPanel(
        string memory _serialNumber,
        string memory _manufacturer,
        uint256 _capacity
    ) public {
        require(!panels[_serialNumber].isRegistered, "Panel already registered");
        
        panels[_serialNumber] = Panel({
            serialNumber: _serialNumber,
            manufacturer: _manufacturer,
            capacity: _capacity,
            registrationDate: block.timestamp,
            owner: msg.sender,
            isRegistered: true
        });

        ownerPanels[msg.sender].push(_serialNumber);

        emit PanelRegistered(
            _serialNumber,
            _manufacturer,
            _capacity,
            msg.sender
        );
    }

    function getPanelBySerialNumber(string memory _serialNumber) 
        public 
        view 
        returns (
            string memory serialNumber,
            string memory manufacturer,
            uint256 capacity,
            uint256 registrationDate,
            address owner,
            bool isRegistered
        ) 
    {
        Panel memory panel = panels[_serialNumber];
        require(panel.isRegistered, "Panel not found");
        
        return (
            panel.serialNumber,
            panel.manufacturer,
            panel.capacity,
            panel.registrationDate,
            panel.owner,
            panel.isRegistered
        );
    }

    function getOwnerPanels(address _owner) 
        public 
        view 
        returns (string[] memory) 
    {
        return ownerPanels[_owner];
    }
} 