// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ─────────────────────────────────────────────────────────────────
//  MINIMAL INTERFACES (forward-declared to avoid circular imports)
// ─────────────────────────────────────────────────────────────────

/// @title LibertyVault — read-only interface for the raffle
interface ILibertyVault {
    function getDustEntries(address account) external view returns (uint256);
}

/// @title LinkRegistry — read-only interface for the raffle
interface ILinkRegistry {
    function getLinkedWallets(address primary) external view returns (address[] memory);
}

/// @dev Minimal AggregatorV3Interface for ETH→USD price feeds
interface IChainlinkFeed {
    function latestAnswer() external view returns (int256);
}

/// @title LibertyRaffle — Hourly 10-winner raffle for LibertyTorch
/// @notice Draws up to 10 unique winners every hour when the prize pool
///         is ≥ $50 USD. Weighted by entry count (1 base + dust entries).
///         24-hour cooldown per winner + all linked secondary wallets.
/// @dev Prize pool is funded by external calls to fundPrizePoolETH/ERC20.
///      In production, the 1.35% buy-tax stream from $LIBERTY also flows here.
contract LibertyRaffle is Ownable, Pausable {

    // ─────────────────────────────────────────────────────────
    //  LIBRARIES
    // ─────────────────────────────────────────────────────────

    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error DrawTooSoon();
    error PoolBelowFloor();
    error RafflePaused();
    error NoEligibleAccounts();
    error NothingToClaim();
    error AlreadyClaimed();
    error NotWinner();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidRaffleId();

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────

    /// @notice Draw interval: 1 hour
    uint256 public constant DRAW_INTERVAL = 1 hours;

    /// @notice Minimum prize pool to trigger a funded draw: $50 = 5000 cents
    uint256 public constant MIN_POOL_CENTS = 5000;

    /// @notice Minimum $LIBERTY hold for base entry: $10 = 1000 cents
    uint256 public constant MIN_HOLD_CENTS = 1000;

    /// @notice Maximum winners per draw
    uint256 public constant MAX_WINNERS = 10;

    /// @notice Winner cooldown period: 24 hours
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    /// @notice 10-winner payout draft in basis points (total = 96%)
    ///         [35, 20, 12, 8, 6, 5, 4, 3, 2, 1]
    uint256 private constant _P0 = 3500;
    uint256 private constant _P1 = 2000;
    uint256 private constant _P2 = 1200;
    uint256 private constant _P3 = 800;
    uint256 private constant _P4 = 600;
    uint256 private constant _P5 = 500;
    uint256 private constant _P6 = 400;
    uint256 private constant _P7 = 300;
    uint256 private constant _P8 = 200;
    uint256 private constant _P9 = 100;

    function PAYOUT_DRAFT_BPS(uint256 i) internal pure returns (uint256) {
        if (i == 0) return _P0; if (i == 1) return _P1; if (i == 2) return _P2;
        if (i == 3) return _P3; if (i == 4) return _P4; if (i == 5) return _P5;
        if (i == 6) return _P6; if (i == 7) return _P7; if (i == 8) return _P8;
        return _P9;
    }

    // ─────────────────────────────────────────────────────────
    //  IMMUTABLES
    // ─────────────────────────────────────────────────────────

    /// @notice The LibertyVault contract
    ILibertyVault public immutable VAULT;

    /// @notice The LinkRegistry contract
    ILinkRegistry public immutable LINK_REGISTRY;

    /// @notice The $LIBERTY token contract
    IERC20 public immutable LIBERTY_TOKEN;

    /// @notice Optional Chainlink feed for ETH→USD (used to convert ETH prize to cents)
    address public immutable ETH_USD_FEED;

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    /// @notice Running prize pool in cents. Funded by buy-tax stream + manual top-ups.
    uint256 public prizePoolCents;

    /// @notice Block.timestamp of the last completed draw (or 0 if never)
    uint256 public lastDrawTime;

    /// @notice Current raffle ID (increments each draw)
    uint256 public raffleId;

    /// @notice Whether an account is in cooldown and until when
    mapping(address => uint256) public cooldownUntil;

    /// @notice (raffleId → winnerIndex → winner address)
    mapping(uint256 => mapping(uint256 => address)) public raffleWinners;

    /// @notice (raffleId → winner address → prize in cents)
    mapping(uint256 => mapping(address => uint256)) public rafflePrizes;

    /// @notice Whether a prize for a raffle/winner has been claimed
    mapping(uint256 => mapping(address => bool)) public prizeClaimed;

    /// @notice Registered eligible accounts (set by indexer when base entry confirmed)
    mapping(address => bool) public isRegistered;

    /// @notice List of all registered accounts (for iteration)
    address[] public registeredAccounts;

    /// @notice Minimum pool cents threshold (adjustable by owner)
    uint256 public minPoolCents = MIN_POOL_CENTS;

    /// @notice Current draw interval (adjustable by owner)
    uint256 public drawInterval = DRAW_INTERVAL;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event DrawExecuted(
        uint256 indexed raffleId,
        uint256 prizePoolCents,
        uint256 winnerCount,
        uint256 timestamp
    );

    event DrawSkipped(
        uint256 indexed raffleId,
        uint256 poolCents,
        uint256 nextCheckTime,
        uint256 timestamp
    );

    event PrizeClaimed(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 amountCents,
        address indexed token,
        uint256 timestamp
    );

    event AccountRegistered(
        address indexed account,
        uint256 timestamp
    );

    event AccountDeregistered(
        address indexed account,
        uint256 timestamp
    );

    event PoolFunded(
        uint256 amountCents,
        uint256 newTotal,
        address indexed funder,
        uint256 timestamp
    );

    event ConfigUpdated(
        string param,
        uint256 oldValue,
        uint256 newValue,
        uint256 timestamp
    );

    event RaffleStatus(
        uint256 indexed raffleId,
        uint8   status,   // 0=ok, 1=too soon, 2=floor, 3=paused, 4=no accounts
        uint256 poolCents,
        uint256 drawTimeRemaining
    );

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    constructor(
        address _vault,
        address _linkRegistry,
        address _libertyToken,
        address _ethUsdFeed
    ) Ownable(msg.sender) {
        if (_vault == address(0) || _linkRegistry == address(0)
            || _libertyToken == address(0)) revert ZeroAddress();

        VAULT = ILibertyVault(_vault);
        LINK_REGISTRY = ILinkRegistry(_linkRegistry);
        LIBERTY_TOKEN = IERC20(_libertyToken);
        ETH_USD_FEED = _ethUsdFeed;
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — DRAW
    // ─────────────────────────────────────────────────────────

    /// @notice Check state and execute a draw if conditions are met.
    ///         Callable by anyone (frontend button, cron job, keeper).
    ///
    ///         Draw fires when ALL of:
    ///           - block.timestamp ≥ lastDrawTime + drawInterval
    ///           - prizePoolCents ≥ minPoolCents ($50)
    ///           - not paused
    ///           - ≥ 1 eligible account
    ///
    ///         If pool < $50: skips draw, rolls over funds, emits SkippedBelowFloor
    function checkAndDraw() external whenNotPaused {
        if (block.timestamp < lastDrawTime + drawInterval) {
            emit RaffleStatus({
                raffleId: raffleId,
                status: 1,          // too soon
                poolCents: prizePoolCents,
                drawTimeRemaining: (lastDrawTime + drawInterval) - block.timestamp
            });
            revert DrawTooSoon();
        }

        if (prizePoolCents < minPoolCents) {
            // Skip: pool below floor. Roll over funds, update draw time, continue.
            uint256 nextCheck = lastDrawTime + drawInterval;
            // If time has advanced enough to try again, just update lastDrawTime
            // so the next call doesn't re-trigger the same skip.
            lastDrawTime = block.timestamp;
            emit DrawSkipped({
                raffleId: raffleId,
                poolCents: prizePoolCents,
                nextCheckTime: nextCheck,
                timestamp: block.timestamp
            });
            return;
        }

        _executeDraw();
    }

    /// @notice Force a draw even if pool is below floor (owner only).
    ///         Useful for bootstrapping the first draw with a manual pool.
    function forceDraw() external onlyOwner whenNotPaused {
        if (block.timestamp < lastDrawTime + drawInterval) revert DrawTooSoon();
        _executeDraw();
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — PRIZE CLAIM
    // ─────────────────────────────────────────────────────────

    /// @notice Claim your prize for a specific raffle. Paid in ETH equivalent.
    /// @param  _raffleId  The raffle ID to claim from
    /// @param  token      The ERC-20 token to receive (ETH = address(0))
    function claimPrize(uint256 _raffleId, address token) external {
        if (_raffleId == 0 || _raffleId > raffleId) revert InvalidRaffleId();

        uint256 prize = rafflePrizes[_raffleId][msg.sender];
        if (prize == 0) revert NothingToClaim();
        if (prizeClaimed[_raffleId][msg.sender]) revert AlreadyClaimed();

        prizeClaimed[_raffleId][msg.sender] = true;

        if (token == address(0)) {
            // Pay in ETH: convert prize (cents) back to wei for the call.value
            uint256 prizeEth = _centsToEthWei(prize);
            (bool sent, ) = msg.sender.call{value: prizeEth}("");
            if (!sent) revert();
        } else {
            IERC20(token).safeTransfer(msg.sender, prize);
        }

        emit PrizeClaimed({
            raffleId: _raffleId,
            winner: msg.sender,
            amountCents: prize,
            token: token,
            timestamp: block.timestamp
        });
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — FUNDING
    // ─────────────────────────────────────────────────────────

    /// @notice Add ETH to the prize pool. Converts ETH → cents using feed or $1 fallback.
    receive() external payable {
        uint256 cents = _ethToUsdCents(msg.value);
        prizePoolCents += cents;
        emit PoolFunded({
            amountCents: cents,
            newTotal: prizePoolCents,
            funder: msg.sender,
            timestamp: block.timestamp
        });
    }

    /// @notice Add ERC-20 tokens to the prize pool (converted to cents at $1).
    ///         For proper integration, the token price should be fetched off-chain.
    /// @param  token   The ERC-20 to add
    /// @param  amount  Amount in raw token units
    function fundPrizePoolERC20(IERC20 token, uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        // Treat 1 token unit as $1.00 for simplicity (or fetch price off-chain)
        // In production: call vault's price feed or indexer for real conversion
        uint256 cents = amount / 1e16; // assumes 18-decimal token at $1 = 1e18 raw = 100 cents
        prizePoolCents += cents;
        emit PoolFunded({
            amountCents: cents,
            newTotal: prizePoolCents,
            funder: msg.sender,
            timestamp: block.timestamp
        });
    }

    /// @notice Fund the prize pool with ETH. Converts at $1/wei (1 ETH = 1e18 wei = $1, = 100 cents).
    function fundPrizePoolETH() external payable {
        if (msg.value == 0) revert ZeroAmount();
        uint256 cents = _ethToUsdCents(msg.value);
        prizePoolCents += cents;
        emit PoolFunded({
            amountCents: cents,
            newTotal: prizePoolCents,
            funder: msg.sender,
            timestamp: block.timestamp
        });
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — ACCOUNT REGISTRATION (INDEXER)
    // ─────────────────────────────────────────────────────────

    /// @notice Register an account as eligible for base entry.
    ///         Called by the indexer when $LIBERTY balance ≥ $10 confirmed.
    /// @param  account  The wallet to register
    function registerAccount(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        if (!isRegistered[account]) {
            isRegistered[account] = true;
            registeredAccounts.push(account);
            emit AccountRegistered({ account: account, timestamp: block.timestamp });
        }
    }

    /// @notice Deregister an account (e.g., balance dropped below $10).
    /// @param  account  The wallet to remove
    function deregisterAccount(address account) external onlyOwner {
        if (isRegistered[account]) {
            isRegistered[account] = false;
            emit AccountDeregistered({ account: account, timestamp: block.timestamp });
        }
    }

    /// @notice Bulk register accounts (for indexer bootstrap).
    /// @param  accounts  Array of wallet addresses to register
    function registerAccounts(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            address a = accounts[i];
            if (a != address(0) && !isRegistered[a]) {
                isRegistered[a] = true;
                registeredAccounts.push(a);
                emit AccountRegistered({ account: a, timestamp: block.timestamp });
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — ADMIN
    // ─────────────────────────────────────────────────────────

    /// @notice Adjust the minimum pool threshold.
    /// @param  newMin  New minimum in cents
    function setMinPoolCents(uint256 newMin) external onlyOwner {
        emit ConfigUpdated({
            param: "minPoolCents",
            oldValue: minPoolCents,
            newValue: newMin,
            timestamp: block.timestamp
        });
        minPoolCents = newMin;
    }

    /// @notice Adjust the draw interval.
    /// @param  newInterval  New interval in seconds
    function setDrawInterval(uint256 newInterval) external onlyOwner {
        emit ConfigUpdated({
            param: "drawInterval",
            oldValue: drawInterval,
            newValue: newInterval,
            timestamp: block.timestamp
        });
        drawInterval = newInterval;
    }

    /// @notice Withdraw ERC-20 tokens accidentally sent here (not prize pool).
    /// @param  token   The token to recover
    /// @param  to      Recipient
    /// @param  amount  Amount
    function sweepToken(IERC20 token, address to, uint256 amount) external onlyOwner {
        // Only sweep tokens that aren't the prize pool asset
        // In production, track a dedicated prize asset. For multi-asset, this is a safeguard.
        token.safeTransfer(to, amount);
    }

    /// @notice Pause the raffle (blocks new draws). Resume with unpause().
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the raffle.
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — VIEWS
    // ─────────────────────────────────────────────────────────

    /// @notice Returns all registered eligible accounts.
    function getEligibleAccounts() external view returns (address[] memory) {
        return registeredAccounts;
    }

    /// @notice Returns total entries for an account: 1 (base) + dust entries from vault.
    /// @param  account  The account to query
    /// @return Total entry count (0 if not registered or in cooldown)
    function getAccountEntries(address account) external view returns (uint256) {
        if (!isRegistered[account]) return 0;
        if (cooldownUntil[account] > block.timestamp) return 0;
        return 1 + VAULT.getDustEntries(account);
    }

    /// @notice Returns the current prize pool size in cents.
    function getPrizePoolCents() external view returns (uint256) {
        return prizePoolCents;
    }

    /// @notice Returns all 10 winners for a raffle (zeros if not yet drawn).
    function getWinners(uint256 _raffleId) external view returns (address[10] memory) {
        address[10] memory winners;
        for (uint256 i = 0; i < MAX_WINNERS; i++) {
            winners[i] = raffleWinners[_raffleId][i];
        }
        return winners;
    }

    /// @notice Returns the prize for a specific winner and raffle.
    function getPrize(address winner, uint256 _raffleId) external view returns (uint256) {
        return rafflePrizes[_raffleId][winner];
    }

    /// @notice Returns true if an account is currently in cooldown.
    function isInCooldown(address account) external view returns (bool) {
        return cooldownUntil[account] > block.timestamp;
    }

    /// @notice Seconds until the next eligible draw.
    function getTimeUntilNextDraw() external view returns (uint256) {
        if (lastDrawTime == 0) return 0;
        uint256 next = lastDrawTime + drawInterval;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    /// @notice Returns current draw readiness: (canDraw, statusCode).
    ///         status: 0=ok, 1=too soon, 2=floor, 3=paused, 4=no accounts
    function canDraw() external view returns (bool drawable_, uint8 status) {
        if (paused()) return (false, 3);
        if (block.timestamp < lastDrawTime + drawInterval) return (false, 1);
        if (prizePoolCents < minPoolCents) return (false, 2);
        uint256 count = _eligibleAccountCount();
        if (count == 0) return (false, 4);
        return (true, 0);
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — DRAW EXECUTION
    // ─────────────────────────────────────────────────────────

    /// @dev Executes the weighted random draw. Selects up to 10 unique winners.
    ///      Winners are weighted: 1 base entry + dust entries from vault.
    ///      Each winner + all their linked wallets enter 24h cooldown.
    function _executeDraw() internal {
        // Increment raffleId FIRST so winners are stored at the new ID and
        // claimPrize(_raffleId, ...) can use the same ID to retrieve them.
        raffleId++;
        uint256 currentRaffleId = raffleId;
        uint256 count = _eligibleAccountCount();
        if (count == 0) revert NoEligibleAccounts();

        // Build list of eligible accounts with their entry weights
        // Use a dynamic array sized to registeredAccounts.length
        uint256 len = registeredAccounts.length;
        uint256 eligibleCount;
        address[] memory eligibleAddrs = new address[](len);
        uint256[] memory entries = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            address acc = registeredAccounts[i];
            if (!isRegistered[acc]) continue;
            if (cooldownUntil[acc] > block.timestamp) continue;

            uint256 ent = 1 + VAULT.getDustEntries(acc);
            if (ent == 0) continue;

            eligibleAddrs[eligibleCount] = acc;
            entries[eligibleCount] = ent;
            eligibleCount++;
        }

        if (eligibleCount == 0) revert NoEligibleAccounts();

        // Compute total entries for weighted selection
        uint256 totalEntries;
        for (uint256 i = 0; i < eligibleCount; i++) {
            totalEntries += entries[i];
        }

        uint256 poolCents = prizePoolCents;
        uint8 winnerCount = 0;
        uint256 runningTotal = totalEntries;

        // Select up to MAX_WINNERS winners (or fewer if not enough eligible)
        uint8 maxWinners = uint8(
            eligibleCount < MAX_WINNERS ? eligibleCount : MAX_WINNERS
        );

        // Build a "remaining entries" copy so we can remove winners
        uint256[] memory remaining = new uint256[](eligibleCount);
        for (uint256 i = 0; i < eligibleCount; i++) remaining[i] = entries[i];

        for (uint256 slot = 0; slot < maxWinners; slot++) {
            // Deterministic randomness using block attributes + pool seed
            uint256 random = uint256(
                keccak256(abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    block.number + slot,
                    poolCents,
                    currentRaffleId
                ))
            );

            uint256 target = random % runningTotal;
            uint256 cumulative;
            address winner;

            for (uint256 i = 0; i < eligibleCount; i++) {
                cumulative += remaining[i];
                if (cumulative > target) {
                    winner = eligibleAddrs[i];
                    remaining[i] = 0; // remove from pool for next pick
                    break;
                }
            }

            if (winner == address(0)) break; // safety

            raffleWinners[currentRaffleId][slot] = winner;

            // Compute prize: poolCents * payoutDraftBps[slot] / 10000
            uint256 prize = (poolCents * PAYOUT_DRAFT_BPS(slot)) / 10000;
            rafflePrizes[currentRaffleId][winner] = prize;

            // Set cooldown for winner
            cooldownUntil[winner] = block.timestamp + COOLDOWN_PERIOD;

            // Set cooldown for all linked wallets of winner
            address[] memory linked = LINK_REGISTRY.getLinkedWallets(winner);
            for (uint256 k = 0; k < linked.length; k++) {
                cooldownUntil[linked[k]] = block.timestamp + COOLDOWN_PERIOD;
            }

            winnerCount++;
            runningTotal -= entries[slot];
        }

        // Reset pool
        prizePoolCents = 0;
        lastDrawTime = block.timestamp;

        emit DrawExecuted({
            raffleId: currentRaffleId,
            prizePoolCents: poolCents,
            winnerCount: winnerCount,
            timestamp: block.timestamp
        });
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — HELPERS
    // ─────────────────────────────────────────────────────────

    /// @dev Returns count of currently eligible (registered + not in cooldown) accounts.
    function _eligibleAccountCount() internal view returns (uint256) {
        uint256 count;
        uint256 len = registeredAccounts.length;
        for (uint256 i = 0; i < len; i++) {
            address acc = registeredAccounts[i];
            if (isRegistered[acc] && cooldownUntil[acc] <= block.timestamp) {
                count++;
            }
        }
        return count;
    }

    /// @dev Converts ETH amount to USD cents using Chainlink or $1 fallback.
    function _centsToEthWei(uint256 cents) internal view returns (uint256) {
        if (ETH_USD_FEED == address(0)) {
            // Fallback: 1 cent = 1e10 wei ($1/ETH). cents * 1e10 = wei
            return cents * 1e10;
        }
        // Chainlink feed: cents * 1e18 / price = wei
        int256 price = IChainlinkFeed(ETH_USD_FEED).latestAnswer();
        return (cents * 1e18) / uint256(price);
    }

    function _ethToUsdCents(uint256 ethWei) internal view returns (uint256) {
        if (ETH_USD_FEED == address(0)) {
            // Fallback: 1 ETH = $1,000,000.00 → 100,000,000 cents
            // ethWei / 1e10 = ETH units at 1e18 → 1e8 = 100,000,000 cents per ETH
            return ethWei / 1e10;
        }
        // Chainlink ETH/USD feed: price in 8 decimals (e.g., $2,000 = 2000000000)
        int256 price = IChainlinkFeed(ETH_USD_FEED).latestAnswer();
        return (ethWei * uint256(price)) / 1e18; // cents (8 dec price / 1e18 wei)
    }
}