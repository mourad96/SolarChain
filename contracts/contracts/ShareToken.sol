// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./SolarPanelRegistry.sol";

/**
 * @title ShareToken
 * @dev ERC20 Token representing shares in solar panels
 */
contract ShareToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    SolarPanelRegistry public panelRegistry;
    
    // Mapping from panel ID to token details
    struct TokenDetails {
        uint256 totalShares;
        bool isMinted;
    }
    
    mapping(uint256 => TokenDetails) public panelTokens;
    // Mapping from panel ID to holder addresses
    mapping(uint256 => address[]) public panelHolders;
    // Mapping from panel ID to holder address to balance
    mapping(uint256 => mapping(address => uint256)) public panelBalances;

    event SharesMinted(uint256 indexed panelId, uint256 amount);
    event SharesTransferred(uint256 indexed panelId, address from, address to, uint256 amount);

    constructor(address panelRegistryAddress) ERC20("Solar Panel Share", "SOLAR") {
        require(panelRegistryAddress != address(0), "Invalid panel registry address");
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        panelRegistry = SolarPanelRegistry(panelRegistryAddress);
    }

    function mintShares(uint256 panelId, uint256 amount) 
        external 
        whenNotPaused 
        onlyRole(MINTER_ROLE) 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(!panelTokens[panelId].isMinted, "Shares already minted for this panel");
        
        // Get panel details
        (string memory serialNumber, , , , , address owner, bool isActive, ) = panelRegistry.panels(panelId);
        require(bytes(serialNumber).length > 0, "Panel does not exist");
        require(isActive, "Panel is not active");
        
        panelTokens[panelId] = TokenDetails({
            totalShares: amount,
            isMinted: true
        });

        _mint(owner, amount);
        panelBalances[panelId][owner] = amount;
        panelHolders[panelId].push(owner);
        
        emit SharesMinted(panelId, amount);
    }

    function transferPanelShares(
        uint256 panelId,
        address to,
        uint256 amount
    ) external whenNotPaused {
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(panelTokens[panelId].isMinted, "Shares not minted for this panel");
        require(panelBalances[panelId][msg.sender] >= amount, "Insufficient panel shares");

        panelBalances[panelId][msg.sender] -= amount;
        panelBalances[panelId][to] += amount;

        // Add new holder if not already in the list
        bool isNewHolder = panelBalances[panelId][to] == amount;
        if (isNewHolder) {
            panelHolders[panelId].push(to);
        }

        _transfer(msg.sender, to, amount);
        emit SharesTransferred(panelId, msg.sender, to, amount);
    }

    function getPanelHolders(uint256 panelId) 
        external 
        view 
        returns (address[] memory) 
    {
        return panelHolders[panelId];
    }

    function getPanelBalance(uint256 panelId, address holder) 
        external 
        view 
        returns (uint256) 
    {
        return panelBalances[panelId][holder];
    }

    function getPanelTokenDetails(uint256 panelId) 
        external 
        view 
        returns (uint256 totalShares, bool isMinted) 
    {
        TokenDetails memory details = panelTokens[panelId];
        return (details.totalShares, details.isMinted);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
} 