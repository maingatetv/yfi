// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @title YieldFiBadgeCashback
 * @notice Automated Badge Reputation & Trading Fee Settlement Engine.
 * Tracks bot trade cumulative volume tiers, assigns reputation badges, collects protocol fees,
 * and maintains leaderboards without any cashback payout or milestone rebate rewards.
 */
contract YieldFiBadgeCashback {
    
    // ==========================================
    // STRUCTS & STORAGE
    // ==========================================

    struct Bot {
        uint256 cumulativeVolume; // Track total volume traded by the bot (including decimals)
        uint256 txCount;          // Total trades executed
        uint8 badgeLevel;         // Level 1-9 assigned based on cumulative volume
        bool registered;          // Registration flag
    }

    // Stablecoin used for settlement (e.g. USDC or USDT)
    address public immutable stablecoin;
    
    // Stablecoin decimals cached during deployment
    uint256 public immutable decimals;

    // Protocol owner/admin
    address public owner;

    // Address that receives protocol routing fees
    address public treasury;

    // Protocol routing fee in Basis Points (1 bps = 0.01%, 10000 bps = 100%)
    uint256 public feePercentBps;

    // Global circuit breaker pause state
    bool public paused;

    // Mapping from bot address to its state
    mapping(address => Bot) public bots;

    // Indexed array of all registered bot addresses
    address[] public registeredBots;

    // ==========================================
    // LEVEL THRESHOLDS (USD VALUES)
    // ==========================================
    
    uint256 public constant THRESHOLD_9 = 100_000_000_000; // $100B+ (OMEGA ARCHITECT)
    uint256 public constant THRESHOLD_8 = 1_000_000_000;   // $1B - $99.9B (QUANTUM SOVEREIGN)
    uint256 public constant THRESHOLD_7 = 100_000_000;     // $100M - $1B (NEXUS MAGNATE)
    uint256 public constant THRESHOLD_6 = 10_000_000;      // $10M - $100M (DIAMOND TITAN)
    uint256 public constant THRESHOLD_5 = 1_000_000;       // $1M - $10M (PLATINUM OVERLORD)
    uint256 public constant THRESHOLD_4 = 100_001;         // $100,001 - $1M (GOLD EXECUTOR)
    uint256 public constant THRESHOLD_3 = 10_001;          // $10,001 - $100k (STEEL STRATEGIST)
    uint256 public constant THRESHOLD_2 = 1_001;           // $1,001 - $10k (IRON INITIATE)
    uint256 public constant THRESHOLD_1 = 1;               // $1 - $1,000 (PENNY SPARK)

    // ==========================================
    // EVENTS
    // ==========================================

    event TradeExecuted(
        address indexed bot,
        uint256 amount,
        uint256 feeAmount,
        uint256 txCount,
        uint256 timestamp
    );

    event BadgeUnlocked(
        address indexed bot,
        uint8 indexed level,
        uint256 cumulativeVolume,
        uint256 timestamp
    );

    event FeePercentUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event PausedStateChanged(bool isPaused);

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyOwner() {
        require(msg.sender == owner, "YieldFi: Caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "YieldFi: Protocol is paused");
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    /**
     * @param _stablecoin Address of the ERC20 token (USDC, USDT, etc.)
     * @param _treasury Address where protocol fees will be sent
     * @param _feePercentBps Initial routing fee in basis points (e.g., 30 = 0.3%)
     */
    constructor(address _stablecoin, address _treasury, uint256 _feePercentBps) {
        require(_stablecoin != address(0), "YieldFi: Invalid stablecoin address");
        require(_treasury != address(0), "YieldFi: Invalid treasury address");
        require(_feePercentBps <= 1000, "YieldFi: Fee cannot exceed 10%"); // Max 10% safety cap

        stablecoin = _stablecoin;
        owner = msg.sender;
        treasury = _treasury;
        feePercentBps = _feePercentBps;

        // Fetch decimals dynamically from token, default to 18 if call fails
        uint256 tokenDecimals = 18;
        try IERC20(_stablecoin).decimals() returns (uint8 dec) {
            tokenDecimals = dec;
        } catch {}
        decimals = tokenDecimals;
    }

    // ==========================================
    // CORE TRADING & LEDGER FUNCTIONS
    // ==========================================

    /**
     * @notice Execute trade routing through the smart contract.
     * Handles volume tracking, badge level upgrades based on total volume,
     * and charges the protocol routing fee.
     * @param amount Stablecoin amount to trade (including decimals)
     */
    function executeTrade(uint256 amount) external whenNotPaused {
        require(amount >= (10 ** decimals), "YieldFi: Amount must be at least $1");

        Bot storage bot = bots[msg.sender];
        bool isFirstTrade = !bot.registered;

        // Initialize bot registration on first trade
        if (isFirstTrade) {
            bot.registered = true;
            registeredBots.push(msg.sender);
        }

        // Increment trade count & volume
        bot.txCount++;
        bot.cumulativeVolume += amount;

        // Check for badge promotion based on cumulative volume
        uint8 newBadgeLevel = getBadgeLevel(bot.cumulativeVolume);
        if (newBadgeLevel > bot.badgeLevel || isFirstTrade) {
            bot.badgeLevel = newBadgeLevel;
            emit BadgeUnlocked(msg.sender, newBadgeLevel, bot.cumulativeVolume, block.timestamp);
        }

        // Calculate and deduct platform routing fee
        uint256 feeAmount = (amount * feePercentBps) / 10000;
        uint256 tradeNetValue = amount - feeAmount;

        // Perform safe transfers
        // 1. Pull the full amount from the bot address
        _safeTransferFrom(stablecoin, msg.sender, address(this), amount);

        // 2. Transfer fee amount to treasury (if any)
        if (feeAmount > 0) {
            _safeTransfer(stablecoin, treasury, feeAmount);
        }

        emit TradeExecuted(msg.sender, amount, feeAmount, bot.txCount, block.timestamp);

        // 3. Send remaining trade value back to the bot or route to target liquidity
        if (tradeNetValue > 0) {
            _safeTransfer(stablecoin, msg.sender, tradeNetValue);
        }
    }

    // ==========================================
    // BADGE CALCULATION VIEW
    // ==========================================

    /**
     * @notice Query the badge level based on cumulative USD value
     * @param amount Stablecoin amount to evaluate (including token decimals)
     */
    function getBadgeLevel(uint256 amount) public view returns (uint8) {
        uint256 amountInUSD = amount / (10 ** decimals);

        if (amountInUSD >= THRESHOLD_9) return 9;
        if (amountInUSD >= THRESHOLD_8) return 8;
        if (amountInUSD >= THRESHOLD_7) return 7;
        if (amountInUSD >= THRESHOLD_6) return 6;
        if (amountInUSD >= THRESHOLD_5) return 5;
        if (amountInUSD >= THRESHOLD_4) return 4;
        if (amountInUSD >= THRESHOLD_3) return 3;
        if (amountInUSD >= THRESHOLD_2) return 2;
        if (amountInUSD >= THRESHOLD_1) return 1;
        return 1; // Default minimum level
    }

    /**
     * @notice Retrieve full list of registered bots
     */
    function getRegisteredBots() external view returns (address[] memory) {
        return registeredBots;
    }

    /**
     * @notice Retrieve a batch slice of registered bots for off-chain list pagination
     */
    function getRegisteredBotsSlice(uint256 startIdx, uint256 endIdx) external view returns (address[] memory) {
        require(startIdx <= endIdx && endIdx < registeredBots.length, "YieldFi: Out of bounds");
        uint256 len = endIdx - startIdx + 1;
        address[] memory slice = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            slice[i] = registeredBots[startIdx + i];
        }
        return slice;
    }

    /**
     * @notice Get total number of registered bots
     */
    function getRegisteredBotsCount() external view returns (uint256) {
        return registeredBots.length;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    function updateFeePercent(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "YieldFi: Fee capped at 10%");
        uint256 oldFeeBps = feePercentBps;
        feePercentBps = newFeeBps;
        emit FeePercentUpdated(oldFeeBps, newFeeBps);
    }

    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "YieldFi: Treasury address zero");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "YieldFi: Owner address zero");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // ==========================================
    // HIGHLY OPTIMIZED GAS EFFICIENT ERC20 TRANSFERS
    // ==========================================

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "YieldFi: Token safeTransfer failed"
        );
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "YieldFi: Token safeTransferFrom failed"
        );
    }
}
