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

/// @title LibertyRaffle — Hourly 10-winner raffle + Liberty Bell jackpot
/// @notice Draws up to 10 unique winners every hour when the prize pool
///         is ≥ $50 USD. Weighted by entry count (1 base + dust entries).
///         24-hour cooldown per winner + all linked secondary wallets.
/// @dev The Liberty Bell jackpot receives 4% of every funded draw's pool
///      and triggers independently at 1-in-72 odds per eligible hourly check.
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
    error NotKeeperOrOwner();
    error InvalidRaffleId();
    error JackpotNotTriggered();
    error JackpotAlreadyClaimed();
    error JackpotBelowFloor();
    error JackpotTooSoon();

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

    /// @notice Winner cooldown period: 24 hours (shared with Liberty Bell)
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Liberty Bell: 4% of every funded draw goes to the jackpot
    uint256 public constant JACKPOT_CONTRIBUTION_BPS = 400;

    /// @notice Liberty Bell: 1-in-72 odds per eligible hourly check (~1.39%)
    uint256 public constant JACKPOT_ODDS = 72;

    /// @notice Minimum jackpot to pay out: $50
    uint256 public constant MIN_JACKPOT_CENTS = 5000;

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
    //  STATE — REGULAR RAFFLE
    // ─────────────────────────────────────────────────────────

    /// @notice Running prize pool in cents. Funded by buy-tax stream + manual top-ups.
    uint256 public prizePoolCents;

    /// @notice Block.timestamp of the last completed draw (or 0 if never)
    uint256 public lastDrawTime;

    /// @notice Current raffle ID (increments each draw)
    uint256 public raffleId;

    /// @notice Whether an account is in cooldown and until when (shared with Liberty Bell)
    mapping(address => uint256) public cooldownUntil;

    /// @notice (raffleId → winnerIndex → winner address)
    mapping(uint256 => mapping(uint256 => address)) public raffleWinners;

    /// @notice (raffleId → winner address → prize in cents)
    mapping(uint256 => mapping(address => uint256)) public rafflePrizes;

    /// @notice Whether a prize for a raffle/winner has been claimed
    mapping(uint256 => mapping(address => bool)) public prizeClaimed;

    /// @notice Registered eligible accounts (set by watcher when base entry confirmed)
    mapping(address => bool) public isRegistered;

    /// @notice List of all registered accounts (for iteration)
    address[] public registeredAccounts;

    /// @notice Minimum pool cents threshold (adjustable by owner)
    uint256 public minPoolCents = MIN_POOL_CENTS;

    /// @notice Current draw interval (adjustable by owner)
    uint256 public drawInterval = DRAW_INTERVAL;

    // ─────────────────────────────────────────────────────────
    //  STATE — LIBERTY BELL JACKPOT
    // ─────────────────────────────────────────────────────────

    /// @notice Keeper address — can register/deregister accounts (set by owner)
    address public keeper;

    /// @notice Accumulated jackpot pool in cents.
    ///         Funded by 4% of every funded draw's prize pool.
    uint256 public jackpotPoolCents;

    /// @notice Block.timestamp of the last Liberty Bell check (or 0 if never)
    uint256 public lastJackpotCheckTime;

    /// @notice Current jackpot raffle ID (increments each trigger)
    uint256 public jackpotId;

    /// @notice (jackpotId → winner address → prize in cents)
    mapping(uint256 => mapping(address => uint256)) public jackpotPrizes;

    /// @notice (jackpotId → winner address → whether claimed)
    mapping(uint256 => mapping(address => bool)) public jackpotClaimed;

    /// @notice Whether the current jackpot has been triggered (winner selected)
    bool public jackpotTriggered;

    /// @notice The current jackpot winner
    address public jackpotWinner;

    // ─────────────────────────────────────────────────────────
    //  EVENTS — REGULAR RAFFLE
    // ─────────────────────────────────────────────────────────

    event DrawExecuted(
        uint256 indexed raffleId,
        uint256 prizePoolCents,
        uint256 jackpotContribution,
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
    //  EVENTS — LIBERTY BELL
    // ─────────────────────────────────────────────────────────

    event JackpotFunded(
        uint256 amountCents,
        uint256 newTotal,
        uint256 timestamp
    );

    event JackpotTriggered(
        uint256 indexed jackpotId,
        address indexed winner,
        uint256 prizeCents,
        uint256 randomValue,
        uint256 timestamp
    );

    event JackpotSkipped(
        uint256 poolCents,
        uint256 nextCheckTime,
        uint256 timestamp
    );

    event JackpotPrizeClaimed(
        uint256 indexed jackpotId,
        address indexed winner,
        uint256 amountCents,
        address indexed token,
        uint256 timestamp
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
    //  EXTERNAL — RECEIVE FUNDS
    // ─────────────────────────────────────────────────────────

    /// @notice Receive ETH to the regular prize pool.
    receive() external payable {
        uint256 cents = _ethToUsdCents(msg.value);
        prizePoolCents += cents;
        emit PoolFunded({ amountCents: cents, newTotal: prizePoolCents, funder: msg.sender, timestamp: block.timestamp });
    }

    /// @notice Add ETH to the regular prize pool explicitly.
    function fundPrizePoolETH() external payable {
        if (msg.value == 0) revert ZeroAmount();
        uint256 cents = _ethToUsdCents(msg.value);
        prizePoolCents += cents;
        emit PoolFunded({ amountCents: cents, newTotal: prizePoolCents, funder: msg.sender, timestamp: block.timestamp });
    }

    /// @notice Add ERC-20 tokens to the regular prize pool (treated as $1 per token unit).
    function fundPrizePoolERC20(IERC20 token, uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        // Placeholder: treat 1 token unit as $1. For production, integrate a price feed.
        uint256 cents = amount / 1e16; // assumes 18-decimal token at $1 = 1e18 raw = 100 cents
        prizePoolCents += cents;
        emit PoolFunded({ amountCents: cents, newTotal: prizePoolCents, funder: msg.sender, timestamp: block.timestamp });
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — DRAW
    // ─────────────────────────────────────────────────────────

    /// @notice Check state and execute a draw if conditions are met.
    ///         Callable by anyone.
    ///
    ///         Draw fires when ALL of:
    ///           - block.timestamp ≥ lastDrawTime + drawInterval
    ///           - prizePoolCents ≥ minPoolCents ($50)
    ///           - not paused
    ///           - ≥ 1 eligible account
    ///
    ///         On success: 4% of pool → Liberty Bell jackpot. Remainder distributed.
    ///         On skip (pool below floor): rolls over funds.
    function checkAndDraw() external whenNotPaused {
        if (block.timestamp < lastDrawTime + drawInterval) {
            emit RaffleStatus({
                raffleId: raffleId,
                status: 1,
                poolCents: prizePoolCents,
                drawTimeRemaining: (lastDrawTime + drawInterval) - block.timestamp
            });
            revert DrawTooSoon();
        }

        if (prizePoolCents < minPoolCents) {
            uint256 nextCheck = lastDrawTime + drawInterval;
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
    function forceDraw() external onlyOwner whenNotPaused {
        if (block.timestamp < lastDrawTime + drawInterval) revert DrawTooSoon();
        _executeDraw();
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — JACKPOT (LIBERTY BELL)
    // ─────────────────────────────────────────────────────────

    /// @notice Check the Liberty Bell at the eligible hourly window.
    ///         Callable by anyone. Tests a fixed 1-in-72 probability
    ///         regardless of participant count.
    ///
    ///         Fires when:
    ///           - block.timestamp ≥ lastJackpotCheckTime + drawInterval
    ///           - jackpotPoolCents ≥ MIN_JACKPOT_CENTS ($50)
    ///           - ≥ 1 eligible account (not in cooldown)
    ///           - not paused
    ///
    /// @dev The trigger is independent of the regular draw interval.
    ///      If the regular draw hasn't fired yet, this still checks.
    ///      If the regular draw fires first, this still checks its own window.
    function checkJackpot() external whenNotPaused {
        uint256 interval = drawInterval;

        if (block.timestamp < lastJackpotCheckTime + interval) {
            revert JackpotTooSoon();
        }

        if (jackpotTriggered) {
            // A winner is already pending — no new trigger until claimed
            revert JackpotNotTriggered();
        }

        if (jackpotPoolCents < MIN_JACKPOT_CENTS) {
            // Not enough in the pot — just advance the check window
            lastJackpotCheckTime = block.timestamp;
            emit JackpotSkipped({
                poolCents: jackpotPoolCents,
                nextCheckTime: block.timestamp + interval,
                timestamp: block.timestamp
            });
            return;
        }

        uint256 eligible = _eligibleAccountCount();
        if (eligible == 0) {
            lastJackpotCheckTime = block.timestamp;
            emit JackpotSkipped({
                poolCents: jackpotPoolCents,
                nextCheckTime: block.timestamp + interval,
                timestamp: block.timestamp
            });
            return;
        }

        // ── Independent 1-in-72 probability ────────────────────
        // Uses block attributes + jackpot pool seed.
        // Not influenced by participant count — same 1-in-72 each check.
        uint256 random = uint256(
            keccak256(abi.encodePacked(
                block.prevrandao,
                block.timestamp,
                block.number,
                jackpotPoolCents,
                jackpotId
            ))
        );

        lastJackpotCheckTime = block.timestamp;

        if ((random % JACKPOT_ODDS) != 0) {
            // Bell didn't ring — advance window, roll over funds
            emit JackpotSkipped({
                poolCents: jackpotPoolCents,
                nextCheckTime: block.timestamp + interval,
                timestamp: block.timestamp
            });
            return;
        }

        // ── Bell rang — select one winner by weighted random ─────
        address winner = _selectJackpotWinner(random);

        jackpotTriggered = true;
        jackpotWinner = winner;
        jackpotId++;
        jackpotPrizes[jackpotId][winner] = jackpotPoolCents;

        // Set shared cooldown (same 24h as regular raffle)
        cooldownUntil[winner] = block.timestamp + COOLDOWN_PERIOD;
        address[] memory linked = LINK_REGISTRY.getLinkedWallets(winner);
        for (uint256 k = 0; k < linked.length; k++) {
            cooldownUntil[linked[k]] = block.timestamp + COOLDOWN_PERIOD;
        }

        emit JackpotTriggered({
            jackpotId: jackpotId,
            winner: winner,
            prizeCents: jackpotPoolCents,
            randomValue: random,
            timestamp: block.timestamp
        });

        // Jackpot is cleared only when claimed
        jackpotPoolCents = 0;
    }

    /// @notice Claim the Liberty Bell jackpot prize.
    /// @param  token  The ERC-20 to receive (address(0) = ETH)
    function claimJackpotPrize(address token) external {
        if (msg.sender != jackpotWinner) revert NotWinner();
        if (!jackpotTriggered) revert JackpotNotTriggered();
        if (jackpotClaimed[jackpotId][msg.sender]) revert JackpotAlreadyClaimed();

        uint256 prize = jackpotPrizes[jackpotId][msg.sender];
        if (prize == 0) revert NothingToClaim();

        jackpotClaimed[jackpotId][msg.sender] = true;
        jackpotTriggered = false;
        jackpotWinner = address(0);

        if (token == address(0)) {
            uint256 prizeEth = _centsToEthWei(prize);
            (bool sent, ) = msg.sender.call{value: prizeEth}("");
            if (!sent) revert();
        } else {
            IERC20(token).safeTransfer(msg.sender, prize);
        }

        emit JackpotPrizeClaimed({
            jackpotId: jackpotId,
            winner: msg.sender,
            amountCents: prize,
            token: token,
            timestamp: block.timestamp
        });
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — PRIZE CLAIM
    // ─────────────────────────────────────────────────────────

    /// @notice Claim your regular raffle prize for a specific raffle.
    /// @param  _raffleId  The raffle ID to claim from
    /// @param  token      The ERC-20 to receive (ETH = address(0))
    function claimPrize(uint256 _raffleId, address token) external {
        if (_raffleId == 0 || _raffleId > raffleId) revert InvalidRaffleId();

        uint256 prize = rafflePrizes[_raffleId][msg.sender];
        if (prize == 0) revert NothingToClaim();
        if (prizeClaimed[_raffleId][msg.sender]) revert AlreadyClaimed();

        prizeClaimed[_raffleId][msg.sender] = true;

        if (token == address(0)) {
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
    //  EXTERNAL — ACCOUNT REGISTRATION (WATCHER)
    // ─────────────────────────────────────────────────────────

    /// @notice Register an account as eligible for base entry.
    ///         Called by the watcher when $LIBERTY balance ≥ $10 confirmed.
    /// @param  account  The wallet to register
    function registerAccount(address account) external onlyKeeperOrOwner {
        if (account == address(0)) revert ZeroAddress();
        if (!isRegistered[account]) {
            isRegistered[account] = true;
            registeredAccounts.push(account);
            emit AccountRegistered({ account: account, timestamp: block.timestamp });
        }
    }

    /// @notice Deregister an account (e.g., balance dropped below $10).
    /// @param  account  The wallet to remove
    function deregisterAccount(address account) external onlyKeeperOrOwner {
        if (isRegistered[account]) {
            isRegistered[account] = false;
            emit AccountDeregistered({ account: account, timestamp: block.timestamp });
        }
    }

    /// @notice Bulk register accounts (for watcher bootstrap).
    /// @param  accounts  Array of wallet addresses to register
    function registerAccounts(address[] calldata accounts) external onlyKeeperOrOwner {
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

    function setMinPoolCents(uint256 newMin) external onlyOwner {
        emit ConfigUpdated({ param: "minPoolCents", oldValue: minPoolCents, newValue: newMin, timestamp: block.timestamp });
        minPoolCents = newMin;
    }

    function setDrawInterval(uint256 newInterval) external onlyOwner {
        emit ConfigUpdated({ param: "drawInterval", oldValue: drawInterval, newValue: newInterval, timestamp: block.timestamp });
        drawInterval = newInterval;
    }

    /// @notice Withdraw ERC-20 tokens accidentally sent here (not prize pool).
    function sweepToken(IERC20 token, address to, uint256 amount) external onlyOwner {
        if (address(token) == address(0)) revert ZeroAddress();
        token.safeTransfer(to, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Set the keeper address (owner only).
    /// @param  _keeper  The wallet allowed to register/deregister accounts
    function setKeeper(address _keeper) external onlyOwner {
        if (_keeper == address(0)) revert ZeroAddress();
        keeper = _keeper;
    }

    modifier onlyKeeperOrOwner() {
        if (msg.sender != owner() && msg.sender != keeper) revert NotKeeperOrOwner();
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — VIEWS
    // ─────────────────────────────────────────────────────────

    function getKeeper() external view returns (address) {
        return keeper;
    }

    function getEligibleAccounts() external view returns (address[] memory) {
        return registeredAccounts;
    }

    function getAccountEntries(address account) external view returns (uint256) {
        if (!isRegistered[account]) return 0;
        if (cooldownUntil[account] > block.timestamp) return 0;
        return 1 + VAULT.getDustEntries(account);
    }

    function getPrizePoolCents() external view returns (uint256) {
        return prizePoolCents;
    }

    function getWinners(uint256 _raffleId) external view returns (address[10] memory) {
        address[10] memory winners;
        for (uint256 i = 0; i < MAX_WINNERS; i++) {
            winners[i] = raffleWinners[_raffleId][i];
        }
        return winners;
    }

    function getPrize(address winner, uint256 _raffleId) external view returns (uint256) {
        return rafflePrizes[_raffleId][winner];
    }

    function isInCooldown(address account) external view returns (bool) {
        return cooldownUntil[account] > block.timestamp;
    }

    function getTimeUntilNextDraw() external view returns (uint256) {
        if (lastDrawTime == 0) return 0;
        uint256 next = lastDrawTime + drawInterval;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    function getJackpotInfo() external view returns (
        uint256 poolCents_,
        uint256 jackpotId_,
        bool triggered_,
        address winner_,
        uint256 prize_,
        uint256 nextCheckSeconds_
    ) {
        poolCents_ = jackpotPoolCents;
        jackpotId_ = jackpotId;
        triggered_ = jackpotTriggered;
        winner_ = jackpotWinner;
        prize_ = jackpotTriggered ? jackpotPrizes[jackpotId][jackpotWinner] : 0;
        if (lastJackpotCheckTime == 0) {
            nextCheckSeconds_ = 0;
        } else {
            uint256 next = lastJackpotCheckTime + drawInterval;
            nextCheckSeconds_ = block.timestamp >= next ? 0 : next - block.timestamp;
        }
    }

    function canDraw() external view returns (bool drawable_, uint8 status) {
        if (paused()) return (false, 3);
        if (block.timestamp < lastDrawTime + drawInterval) return (false, 1);
        if (prizePoolCents < minPoolCents) return (false, 2);
        uint256 count = _eligibleAccountCount();
        if (count == 0) return (false, 4);
        return (true, 0);
    }

    function canCheckJackpot() external view returns (bool checkable_, uint8 status) {
        if (paused()) return (false, 3);
        if (block.timestamp < lastJackpotCheckTime + drawInterval) return (false, 1);
        if (jackpotPoolCents < MIN_JACKPOT_CENTS) return (false, 2);
        uint256 count = _eligibleAccountCount();
        if (count == 0) return (false, 4);
        if (jackpotTriggered) return (false, 5); // winner pending claim
        return (true, 0);
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — DRAW EXECUTION
    // ─────────────────────────────────────────────────────────

    /// @dev Executes the weighted random draw.
    ///      Sends 4% of pool to the Liberty Bell jackpot before distributing.
    function _executeDraw() internal {
        raffleId++;
        uint256 currentRaffleId = raffleId;
        uint256 count = _eligibleAccountCount();
        if (count == 0) revert NoEligibleAccounts();

        uint256 poolCents = prizePoolCents;

        // ── 4% to Liberty Bell ───────────────────────────────
        uint256 jackpotContribution = (poolCents * JACKPOT_CONTRIBUTION_BPS) / BPS;
        uint256 distributable = poolCents - jackpotContribution;
        jackpotPoolCents += jackpotContribution;
        emit JackpotFunded({ amountCents: jackpotContribution, newTotal: jackpotPoolCents, timestamp: block.timestamp });

        // Build eligible list
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

        // Compute total entries
        uint256 totalEntries;
        for (uint256 i = 0; i < eligibleCount; i++) totalEntries += entries[i];

        uint8 winnerCount = 0;
        uint256 runningTotal = totalEntries;

        uint256[] memory remaining = new uint256[](eligibleCount);
        for (uint256 i = 0; i < eligibleCount; i++) remaining[i] = entries[i];

        uint8 maxWinners = uint8(eligibleCount < MAX_WINNERS ? eligibleCount : MAX_WINNERS);

        for (uint256 slot = 0; slot < maxWinners; slot++) {
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
            uint256 winnerIdx;

            for (uint256 i = 0; i < eligibleCount; i++) {
                cumulative += remaining[i];
                if (cumulative > target) {
                    winner = eligibleAddrs[i];
                    winnerIdx = i;
                    remaining[i] = 0;
                    break;
                }
            }

            if (winner == address(0)) break;

            raffleWinners[currentRaffleId][slot] = winner;

            uint256 prize = (distributable * PAYOUT_DRAFT_BPS(slot)) / BPS;
            rafflePrizes[currentRaffleId][winner] = prize;

            cooldownUntil[winner] = block.timestamp + COOLDOWN_PERIOD;
            address[] memory linked = LINK_REGISTRY.getLinkedWallets(winner);
            for (uint256 k = 0; k < linked.length; k++) {
                cooldownUntil[linked[k]] = block.timestamp + COOLDOWN_PERIOD;
            }

            winnerCount++;
            runningTotal -= entries[winnerIdx];
        }

        // Reset regular pool (jackpot already separated)
        prizePoolCents = 0;
        lastDrawTime = block.timestamp;

        emit DrawExecuted({
            raffleId: currentRaffleId,
            prizePoolCents: poolCents,
            jackpotContribution: jackpotContribution,
            winnerCount: winnerCount,
            timestamp: block.timestamp
        });
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — JACKPOT WINNER SELECTION
    // ─────────────────────────────────────────────────────────

    /// @dev Selects one eligible account for the Liberty Bell jackpot.
    ///      Weighted by 1 + vault dust entries (same weighting as regular raffle).
    function _selectJackpotWinner(uint256 randomSeed) internal view returns (address) {
        uint256 len = registeredAccounts.length;
        uint256 eligibleCount;
        address[] memory eligibleAddrs = new address[](len);
        uint256[] memory entries = new uint256[](len);
        uint256 totalEntries;

        for (uint256 i = 0; i < len; i++) {
            address acc = registeredAccounts[i];
            if (!isRegistered[acc]) continue;
            if (cooldownUntil[acc] > block.timestamp) continue;
            uint256 ent = 1 + VAULT.getDustEntries(acc);
            if (ent == 0) continue;
            eligibleAddrs[eligibleCount] = acc;
            entries[eligibleCount] = ent;
            totalEntries += ent;
            eligibleCount++;
        }

        require(eligibleCount > 0, "no eligible accounts");

        // Weighted selection using the passed-in random seed
        uint256 target = randomSeed % totalEntries;
        uint256 cumulative;

        for (uint256 i = 0; i < eligibleCount; i++) {
            cumulative += entries[i];
            if (cumulative > target) {
                return eligibleAddrs[i];
            }
        }

        return eligibleAddrs[0]; // safety
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — HELPERS
    // ─────────────────────────────────────────────────────────

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

    function _centsToEthWei(uint256 cents) internal view returns (uint256) {
        if (ETH_USD_FEED == address(0)) {
            return cents * 1e10;
        }
        int256 price = IChainlinkFeed(ETH_USD_FEED).latestAnswer();
        return (cents * 1e18) / uint256(price);
    }

    function _ethToUsdCents(uint256 ethWei) internal view returns (uint256) {
        if (ETH_USD_FEED == address(0)) {
            return ethWei / 1e10;
        }
        int256 price = IChainlinkFeed(ETH_USD_FEED).latestAnswer();
        return (ethWei * uint256(price)) / 1e18;
    }
}
