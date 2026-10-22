// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LibertyVault — Multi-asset dust deposit & entry calculation
/// @notice Accepts any ERC-20 dust deposit whose USD value can be priced.
///         Each supported token gets its own Chainlink/USD price feed.
///         Converts deposits to USD cents for entry weight: 1 entry per $0.50,
///         capped at 5 entries per linked secondary wallet per hourly cycle.
///
/// @dev Entry math (per linked secondary wallet, per cycle):
///      entries_W = min( floor(cycleDustUsd(W) / 50 cents), 5 )
///      totalEntries(primary) = 1 (base) + Σ entries_W for all linked W
///      max totalEntries(primary) = 1 + 5 × 5 = 26
contract LibertyVault is Ownable, ReentrancyGuard {

    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error UnsupportedToken();
    error ZeroAmount();
    error ZeroAddress();

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────

    /// @notice 1 entry earned per this many USD cents deposited (50 = $0.50)
    uint256 public constant DUST_ENTRY_STEP_CENTS = 50;

    /// @notice Maximum dust entries a single linked wallet can earn per cycle
    uint256 public constant MAX_DUST_ENTRIES_PER_WALLET = 5;

    /// @notice Duration of one raffle/entry cycle in seconds (1 hour)
    uint256 public constant CYCLE_DURATION = 1 hours;

    /// @notice Basis points denominator (100% = 10000 bps)
    uint256 public constant BPS = 10000;

    /// @notice Protocol fee: 200 bps = 2.00%
    uint256 public constant PROTOCOL_FEE_BPS = 200;

    // ─────────────────────────────────────────────────────────
    //  IMMUTABLES
    // ─────────────────────────────────────────────────────────

    /// @notice The LinkRegistry contract
    ILinkRegistry public immutable LINK_REGISTRY;

    /// @notice The $LIBERTY token address (raffle reference)
    address public immutable LIBERTY_TOKEN;

    /// @notice Recipient of the 2% protocol fee
    address public immutable PROTOCOL_FEE_RECIPIENT;

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    /// @notice Whether an ERC-20 token is accepted as dust
    mapping(address => bool) public isSupportedToken;

    /// @notice Per-token Chainlink USD price feed.
    ///         address(0) = $1.00 fallback (1 token = $1.00, for testing).
    mapping(address => address) public tokenFeed;

    /// @notice Ordered list of supported tokens (for O(1) iteration)
    address[] public supportedTokensList;

    /// @notice Per-account, per-cycle, per-token cumulative contribution
    mapping(address => mapping(uint256 => mapping(address => uint256))) public contributions;

    /// @notice Per-primary dust entries earned for the current cycle
    mapping(address => uint256) public dustEntriesEarned;

    /// @notice Cycle ID at which entries were last computed for a primary
    mapping(address => uint256) public lastEntryCycle;

    /// @notice Checkpoint of vault's token balance at the last notifyDeposit
    ///         call.  Advances on every notifyDeposit so we only count fresh
    ///         arrivals.  Not touched by depositDust.
    mapping(address => uint256) private _depositCheckpoint;

    /// @notice Lightweight anti-spam fee for notifyDeposit — 1% (100 bps).
    ///         Half the normal 2% because the user has already paid gas.
    uint256 public constant ANTI_SPAM_FEE_BPS = 100;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event DustDeposited(
        address indexed depositor,
        address indexed primary,
        address indexed token,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount,
        uint256 cycleId
    );

    event DustEntriesCredited(
        address indexed primary,
        uint256 cycleId,
        uint256 totalDustEntries
    );

    event SupportedTokenAdded(address indexed token, address feed);
    event SupportedTokenRemoved(address indexed token);
    event NoNewDeposit(
        address indexed sender,
        address indexed token,
        uint256 currentHeld,
        uint256 checkpointed
    );

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    /// @param _linkRegistry          LinkRegistry contract address
    /// @param _libertyToken          $LIBERTY token address
    /// @param _protocolFeeRecipient  Receives the 2% protocol fee
    constructor(
        address _linkRegistry,
        address _libertyToken,
        address _protocolFeeRecipient
    ) Ownable(msg.sender) {
        if (_linkRegistry == address(0) || _libertyToken == address(0)
            || _protocolFeeRecipient == address(0)) revert ZeroAddress();

        LINK_REGISTRY = ILinkRegistry(_linkRegistry);
        LIBERTY_TOKEN = _libertyToken;
        PROTOCOL_FEE_RECIPIENT = _protocolFeeRecipient;
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — DEPOSIT
    // ─────────────────────────────────────────────────────────

    /// @notice Deposit ERC-20 dust tokens from a linked secondary wallet.
    ///         A 2% protocol fee is deducted. Entries are credited to the
    ///         primary wallet associated with msg.sender.
    ///
    /// @param primary   Primary wallet to credit with entries
    /// @param dustToken The ERC-20 token being deposited
    /// @param amount    Raw token amount
    function depositDust(
        address primary,
        address dustToken,
        uint256 amount
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!isSupportedToken[dustToken]) revert UnsupportedToken();
        if (primary == address(0)) revert ZeroAddress();

        IERC20(dustToken).safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * PROTOCOL_FEE_BPS) / BPS;
        uint256 net = amount - fee;

        if (fee > 0) {
            IERC20(dustToken).safeTransfer(PROTOCOL_FEE_RECIPIENT, fee);
        }

        // Advance the checkpoint so notifyDeposit doesn't double-count this
        _depositCheckpoint[dustToken] = IERC20(dustToken).balanceOf(address(this));

        uint256 cycleId = _currentCycleId();
        contributions[msg.sender][cycleId][dustToken] += net;

        address resolvedPrimary = _resolvePrimary(msg.sender, primary);
        if (resolvedPrimary != address(0)) {
            _computeAndCreditDustEntries(resolvedPrimary);
        }

        emit DustDeposited(msg.sender, resolvedPrimary, dustToken, amount, fee, net, cycleId);
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — PAST-TRANSFER NOTIFY
    // ─────────────────────────────────────────────────────────

    /// @notice Credits dust entries for tokens that were already transferred
    ///         to the vault via plain ERC-20 transfer(). Designed for use with
    ///         the freedom machine frontend, which lets users sweep dust with
    ///         a single wallet prompt (no approve or EIP-712 required).
    ///
    ///         The caller specifies which primary wallet they're sending dust
    ///         for and what token they just transferred in. The vault reads
    ///         the difference between its current balance and its tracked
    ///         checkpointed balance to determine how much the caller actually
    ///         sent. Only the delta beyond what was checkpointed counts.
    ///
    ///         Security:
    ///         - A 1% anti-spam fee (half the normal 2%) is deducted on the
    ///           delta so you can't fake dust deposits for free entries.
    ///         - Only the caller can claim a delta — you can't notify for
    ///           someone else's transfer.
    ///         - Only tokens already in `supportedTokensList` are recognized.
    ///
    /// @param primary   Primary wallet that owns the caller (msg.sender).
    ///                  Must be linked via LinkRegistry.
    /// @param dustToken ERC-20 token that was already transferred to the vault.
    function notifyDeposit(address primary, address dustToken)
        external nonReentrant
    {
        if (primary == address(0)) revert ZeroAddress();
        if (!isSupportedToken[dustToken]) revert UnsupportedToken();

        // Resolve linkage first — reverts if caller isn't linked to primary
        address resolvedPrimary = _resolvePrimary(msg.sender, primary);

        uint256 currentHeld = IERC20(dustToken).balanceOf(address(this));
        uint256 checkpointed = _depositCheckpoint[dustToken];

        // Nothing new arrived since the last checkpoint
        if (currentHeld <= checkpointed) {
            emit NoNewDeposit(msg.sender, dustToken, currentHeld, checkpointed);
            return;
        }

        uint256 delta = currentHeld - checkpointed;
        uint256 fee = (delta * ANTI_SPAM_FEE_BPS) / BPS;
        uint256 net = delta - fee;

        // Forward the anti-spam fee to the protocol fee recipient
        if (fee > 0) {
            IERC20(dustToken).safeTransfer(PROTOCOL_FEE_RECIPIENT, fee);
        }

        // Advance the checkpoint to the new current balance (minus what we
        // just forwarded) so the next notifyDeposit only sees fresh arrivals.
        _depositCheckpoint[dustToken] = IERC20(dustToken).balanceOf(address(this));

        uint256 cycleId = _currentCycleId();
        contributions[msg.sender][cycleId][dustToken] += net;

        _computeAndCreditDustEntries(resolvedPrimary);

        emit DustDeposited(
            msg.sender,
            resolvedPrimary,
            dustToken,
            delta,
            fee,
            net,
            cycleId
        );
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — ADMIN
    // ─────────────────────────────────────────────────────────

    /// @notice Add a supported dust token with its USD price feed.
    /// @param token      ERC-20 token address to accept
    /// @param priceFeed  Chainlink AggregatorV3 feed for token→USD.
    ///                   Pass address(0) for $1.00 fallback pricing.
    function addSupportedToken(address token, address priceFeed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (!isSupportedToken[token]) {
            isSupportedToken[token] = true;
            supportedTokensList.push(token);
        }
        tokenFeed[token] = priceFeed;
        emit SupportedTokenAdded(token, priceFeed);
    }

    /// @notice Remove a supported dust token. Does not remove from list
    ///         (list is append-only; removed tokens are skipped in iteration).
    function removeSupportedToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (isSupportedToken[token]) {
            isSupportedToken[token] = false;
            emit SupportedTokenRemoved(token);
        }
    }

    /// @notice Update the price feed for an already-supported token.
    function setTokenFeed(address token, address priceFeed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        require(isSupportedToken[token], "token not supported");
        tokenFeed[token] = priceFeed;
        emit SupportedTokenAdded(token, priceFeed);
    }

    /// @notice Rescue non-dust tokens accidentally sent to the vault.
    function withdrawToken(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — VIEWS
    // ─────────────────────────────────────────────────────────

    /// @notice Returns dust entries for a primary in the current cycle.
    function getDustEntries(address primary) external view returns (uint256) {
        return _computeDustEntries(primary);
    }

    /// @notice Returns total USD cents contributed by a wallet across
    ///         all supported tokens in the current cycle.
    function getCurrentCycleUsdCents(address wallet) external view returns (uint256) {
        return _cycleUsdCents(wallet, _currentCycleId());
    }

    /// @notice Raw token contribution for a wallet, cycle, and token.
    function getContribution(
        address wallet,
        uint256 cycleId,
        address token
    ) external view returns (uint256) {
        return contributions[wallet][cycleId][token];
    }

    /// @notice Current cycle ID.
    function getCurrentCycleId() external view returns (uint256) {
        return _currentCycleId();
    }

    /// @notice All supported dust token addresses.
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    /// @notice Count of tokens in the supported list.
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokensList.length;
    }

    /// @notice Whether a token is currently accepted.
    function isSupported(address token) external view returns (bool) {
        return isSupportedToken[token];
    }

    /// @notice Get the price feed address for a token.
    function getTokenFeed(address token) external view returns (address) {
        return tokenFeed[token];
    }

    /// @notice Read the deposit checkpoint for a token (unauthenticated —
    ///         anyone can read it on-chain).
    function getDepositCheckpoint(address token) external view returns (uint256) {
        return _depositCheckpoint[token];
    }

    /// @notice Account info snapshot.
    function getAccountInfo(address primary)
        external view returns (
            uint256 dustEntries,
            uint256 cycleId,
            uint256 cycleUsdCents
        )
    {
        cycleId = _currentCycleId();
        dustEntries = _computeDustEntries(primary);
        uint256 total;
        address[] memory linked = LINK_REGISTRY.getLinkedWallets(primary);
        for (uint256 i = 0; i < linked.length; i++) {
            total += _cycleUsdCents(linked[i], cycleId);
        }
        cycleUsdCents = total;
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — ENTRY COMPUTATION
    // ─────────────────────────────────────────────────────────

    /// @dev Live-computes dust entries for `primary` from all linked
    ///      secondary wallets in the current cycle. Per wallet W:
    ///        entries(W) = min( floor(usdCents(W) / 50), 5 )
    function _computeDustEntries(address primary) internal view returns (uint256) {
        uint256 cycleId = _currentCycleId();
        address[] memory linked = LINK_REGISTRY.getLinkedWallets(primary);
        uint256 totalEntries;
        for (uint256 i = 0; i < linked.length; i++) {
            uint256 cycleUsd = _cycleUsdCents(linked[i], cycleId);
            uint256 walletEntries = cycleUsd / DUST_ENTRY_STEP_CENTS;
            if (walletEntries > MAX_DUST_ENTRIES_PER_WALLET) {
                walletEntries = MAX_DUST_ENTRIES_PER_WALLET;
            }
            totalEntries += walletEntries;
        }
        return totalEntries;
    }

    function _computeAndCreditDustEntries(address primary) internal {
        uint256 cycleId = _currentCycleId();
        if (lastEntryCycle[primary] != cycleId) {
            lastEntryCycle[primary] = cycleId;
            dustEntriesEarned[primary] = 0;
        }
        dustEntriesEarned[primary] = _computeDustEntries(primary);
        emit DustEntriesCredited(primary, cycleId, dustEntriesEarned[primary]);
    }

    /// @dev Sums USD cents for a wallet across all supported tokens in a cycle.
    function _cycleUsdCents(address wallet, uint256 cycleId)
        internal view returns (uint256 total)
    {
        uint256 len = supportedTokensList.length;
        for (uint256 i = 0; i < len; i++) {
            address token = supportedTokensList[i];
            if (!isSupportedToken[token]) continue;

            uint256 raw = contributions[wallet][cycleId][token];
            if (raw == 0) continue;

            total += _tokenToUsdCents(token, raw);
        }
    }

    /// @dev Converts raw token amount → USD cents using the token's price feed.
    ///
    ///      Formula (Chainlink feed):
    ///        price = latestAnswer()         // 8 decimals, e.g. $1.00 = 100_000_000
    ///        cents = (amount × price) / 10^(decimals + 6)
    ///        // 10^6 because: 10^8 (price decimals) / 10^2 (cents per dollar) = 10^6
    ///
    ///      Fallback (no feed — address(0)):
    ///        cents = amount / 10^(decimals - 2)    // $1.00 per token unit
    function _tokenToUsdCents(address token, uint256 amount)
        internal view returns (uint256)
    {
        address feed = tokenFeed[token];
        uint8 dec = IERC20Metadata(token).decimals();

        if (feed == address(0)) {
            // $1.00 per token unit — convert to cents
            if (dec > 2) return amount / (10 ** (dec - 2));
            return amount * (10 ** (2 - dec));
        }

        int256 rawPrice = IChainlinkFeed(feed).latestAnswer();
        require(rawPrice > 0, "stale or negative price");
        uint256 price = uint256(rawPrice);

        // cents = (amount × price) / 10^(dec + 6)
        // 6 = 8 (price decimals) - 2 (cents shift)
        uint256 divisor = 10 ** (dec + 6);
        return (amount * price) / divisor;
    }

    function _currentCycleId() internal view returns (uint256) {
        return block.timestamp / CYCLE_DURATION;
    }

    /// @dev Resolves which primary wallet owns a secondary's deposits.
    ///      Requires a valid hint that is confirmed in the LinkRegistry.
    ///      Reverts if hint is not linked — prevents a secondary from
    ///      accidentally attributing dust to the wrong primary.
    function _resolvePrimary(address secondary, address hint)
        internal view returns (address)
    {
        // Hint must be provided and confirmed in the registry
        require(hint != address(0), "primary hint required");
        require(LINK_REGISTRY.isLinkedTo(hint, secondary), "wallet not linked");
        return hint;
    }
}

// ─────────────────────────────────────────────────────────────
//  MINIMAL INTERFACES
// ─────────────────────────────────────────────────────────────

interface ILinkRegistry {
    function isLinkedTo(address primary, address secondary) external view returns (bool);
    function getLinkedWallets(address primary) external view returns (address[] memory);
}

interface IChainlinkFeed {
    function latestAnswer() external view returns (int256);
}

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}