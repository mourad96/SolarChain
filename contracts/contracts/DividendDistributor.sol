// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ShareToken.sol";
import "./AssetRegistry.sol";

/**
 * @title DividendDistributor
 * @dev Contract for distributing dividends to solar panel share holders
 */
contract DividendDistributor is AccessControl, Pausable {
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    
    ShareToken public shareToken;
    AssetRegistry public assetRegistry;
    IERC20 public paymentToken; // ERC20 token used for dividend payments (e.g., USDC)
    
    struct DividendInfo {
        uint256 amount;
        uint256 timestamp;
        bool distributed;
    }
    
    // Mapping from panel ID to dividend distribution history
    mapping(uint256 => DividendInfo[]) public dividendHistory;
    // Mapping from panel ID to total dividends distributed
    mapping(uint256 => uint256) public totalDividends;
    // Mapping from panel ID to holder address to claimed dividends
    mapping(uint256 => mapping(address => uint256)) public claimedDividends;

    event DividendDistributed(uint256 indexed panelId, uint256 amount, uint256 timestamp);
    event DividendClaimed(uint256 indexed panelId, address indexed holder, uint256 amount);

    constructor(
        address shareTokenAddress,
        address assetRegistryAddress,
        address paymentTokenAddress
    ) {
        require(shareTokenAddress != address(0), "Invalid share token address");
        require(assetRegistryAddress != address(0), "Invalid asset registry address");
        require(paymentTokenAddress != address(0), "Invalid payment token address");
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DISTRIBUTOR_ROLE, msg.sender);
        
        shareToken = ShareToken(shareTokenAddress);
        assetRegistry = AssetRegistry(assetRegistryAddress);
        paymentToken = IERC20(paymentTokenAddress);
    }

    function distributeDividends(uint256 panelId, uint256 amount) 
        external 
        whenNotPaused 
        onlyRole(DISTRIBUTOR_ROLE) 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        // Verify panel exists and is active
        (,,,, bool isActive,) = assetRegistry.getPanelDetails(panelId);
        require(isActive, "Panel is not active");
        
        // Verify shares have been minted
        (uint256 totalShares, bool isMinted) = shareToken.getPanelTokenDetails(panelId);
        require(isMinted, "Shares not minted for this panel");
        
        // Transfer payment tokens from distributor to this contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Payment token transfer failed"
        );
        
        // Record dividend distribution
        dividendHistory[panelId].push(DividendInfo({
            amount: amount,
            timestamp: block.timestamp,
            distributed: true
        }));
        
        totalDividends[panelId] += amount;
        
        emit DividendDistributed(panelId, amount, block.timestamp);
    }

    function claimDividends(uint256 panelId) 
        external 
        whenNotPaused 
    {
        address holder = msg.sender;
        uint256 holderShares = shareToken.getPanelBalance(panelId, holder);
        require(holderShares > 0, "No shares owned");
        
        (uint256 totalShares,) = shareToken.getPanelTokenDetails(panelId);
        uint256 totalAvailable = totalDividends[panelId];
        uint256 alreadyClaimed = claimedDividends[panelId][holder];
        
        uint256 entitled = (holderShares * totalAvailable) / totalShares;
        uint256 unclaimed = entitled - alreadyClaimed;
        require(unclaimed > 0, "No unclaimed dividends");
        
        claimedDividends[panelId][holder] = entitled;
        
        require(
            paymentToken.transfer(holder, unclaimed),
            "Payment token transfer failed"
        );
        
        emit DividendClaimed(panelId, holder, unclaimed);
    }

    function getUnclaimedDividends(uint256 panelId, address holder) 
        external 
        view 
        returns (uint256) 
    {
        uint256 holderShares = shareToken.getPanelBalance(panelId, holder);
        if (holderShares == 0) return 0;
        
        (uint256 totalShares,) = shareToken.getPanelTokenDetails(panelId);
        uint256 totalAvailable = totalDividends[panelId];
        uint256 alreadyClaimed = claimedDividends[panelId][holder];
        
        uint256 entitled = (holderShares * totalAvailable) / totalShares;
        return entitled - alreadyClaimed;
    }

    function getDividendHistory(uint256 panelId) 
        external 
        view 
        returns (DividendInfo[] memory) 
    {
        return dividendHistory[panelId];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
} 