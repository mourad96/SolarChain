// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ShareToken.sol";
//import "hardhat/console.sol";

/**
 * @title TokenSale
 * @dev Contract for selling ShareTokens to investors using USDC instead of ETH
 * @notice This contract is upgradeable using the UUPS proxy pattern
 */
contract TokenSale is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant SALE_MANAGER_ROLE = keccak256("SALE_MANAGER_ROLE");

    ShareToken public shareToken;
    IERC20 public paymentToken; // Payment token (USDC)
    uint256 public price; // Price in payment tokens per share token
    uint256 public availableTokens;
    uint256 public soldTokens;
    uint256 public saleEndTime;
    bool public isSaleActive;

    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event TokenSaleCreated(address indexed tokenAddress, uint256 price);
    event TokenSaleUpdated(uint256 newPrice);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event SaleStatusChanged(bool isActive);
    event SaleEndTimeUpdated(uint256 newEndTime);
    event PaymentTokenSet(address indexed paymentTokenAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract replacing the constructor for upgradeable contracts
     */
    function initialize(
        address _shareTokenAddress,
        address _paymentTokenAddress,
        uint256 _totalShares,
        uint256 _price,
        uint256 _saleEndTime
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init(); // Initialize reentrancy guard

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(SALE_MANAGER_ROLE, msg.sender);

        require(_shareTokenAddress != address(0), "Invalid token address");
        require(_paymentTokenAddress != address(0), "Invalid payment token address");
        require(_price > 0, "Price must be greater than 0");
        require(
            _saleEndTime > block.timestamp,
            "End time must be in the future"
        );

        shareToken = ShareToken(_shareTokenAddress);
        paymentToken = IERC20(_paymentTokenAddress);
        price = _price;
        saleEndTime = _saleEndTime;
        isSaleActive = true;
        availableTokens = _totalShares;

        emit TokenSaleCreated(_shareTokenAddress, _price);
        emit PaymentTokenSet(_paymentTokenAddress);
    }

    /**
     * @dev Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Set or update the payment token
     * @param _paymentTokenAddress The address of the payment token (USDC)
     */
    function setPaymentToken(
        address _paymentTokenAddress
    ) external onlyRole(ADMIN_ROLE) {
        require(_paymentTokenAddress != address(0), "Invalid payment token address");
        paymentToken = IERC20(_paymentTokenAddress);
        emit PaymentTokenSet(_paymentTokenAddress);
    }

    /**
     * @dev Allows users to purchase tokens using USDC
     * @param amount The amount of tokens to purchase
     */
    function purchaseTokens(
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(isSaleActive, "Sale is not active");
        require(block.timestamp < saleEndTime, "Sale has ended");
        require(amount > 0, "Amount must be greater than 0");

        uint256 tokensAvailable = shareToken.balanceOf(address(this));
        require(amount <= tokensAvailable, "Not enough tokens available");
        
        uint256 paymentAmount = amount * price;

       // Debug logs: Print key variables before transferring tokens
        //uint256 currentAllowance = paymentToken.allowance(msg.sender, address(this));
        //console.log("msg.sender:", msg.sender);
        //console.log("Contract:", address(this));
        //console.log("Payment Amount:", paymentAmount);
        //console.log("Allowance:", currentAllowance);
        
        // Effects: update state before external call
        soldTokens += amount;
        // Optionally, update availableTokens if you intend to use it later
        availableTokens = tokensAvailable - amount;

        // Transfer payment tokens from buyer to this contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), paymentAmount),
            "Payment token transfer failed"
        );

        // Interactions: transfer share tokens to buyer
        require(
            shareToken.transfer(msg.sender, amount),
            "Share token transfer failed"
        );

        emit TokensPurchased(msg.sender, amount, paymentAmount);
    }


    /**
     * @dev Updates the token price
     * @param _newPrice The new price
     */
    function updatePrice(
        uint256 _newPrice
    ) external onlyRole(SALE_MANAGER_ROLE) {
        require(_newPrice > 0, "Price must be greater than 0");
        price = _newPrice;
        emit TokenSaleUpdated(_newPrice);
    }

    /**
     * @dev Updates the sale end time
     * @param _newEndTime The new end time
     */
    function updateSaleEndTime(
        uint256 _newEndTime
    ) external onlyRole(SALE_MANAGER_ROLE) {
        require(
            _newEndTime > block.timestamp,
            "End time must be in the future"
        );
        saleEndTime = _newEndTime;
        emit SaleEndTimeUpdated(_newEndTime);
    }

    /**
     * @dev Activates or deactivates the sale
     * @param _isActive The new active status
     */
    function setSaleStatus(
        bool _isActive
    ) external onlyRole(SALE_MANAGER_ROLE) {
        isSaleActive = _isActive;
        emit SaleStatusChanged(_isActive);
    }

    /**
     * @dev Withdraws the contract's payment token balance
     * @param to The address to send the funds to
     */
    function withdrawFunds(address to) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Cannot withdraw to zero address");
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        require(
            paymentToken.transfer(to, balance),
            "Payment token transfer failed"
        );

        emit FundsWithdrawn(to, balance);
    }

    /**
     * @dev Withdraws any remaining tokens after sale ends
     * @param to The address to send the tokens to
     */
    function withdrawRemainingTokens(address to) external onlyRole(ADMIN_ROLE) {
        require(
            block.timestamp >= saleEndTime || !isSaleActive,
            "Sale must be ended or inactive"
        );
        require(to != address(0), "Cannot withdraw to zero address");
        
        uint256 tokensAvailable = shareToken.balanceOf(address(this));
        require(tokensAvailable > 0, "No tokens to withdraw");

        availableTokens = 0;

        require(
            shareToken.transfer(to, tokensAvailable),
            "Token transfer failed"
        );
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
