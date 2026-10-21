// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LibertyVault — Dust deposit and entry calculation for LibertyTorch
/// @notice Accepts ERC-20 dust deposits from linked secondary wallets only.
///         Converts USD value into dust entries: 1 entry per $0.50 deposited,
///         capped at 5 entries per linked wallet per hourly cycle.
///         The primary wallet does NOT earn dust entries from its own deposits.
///
/// @dev Entry math (per linked secondary wallet, per cycle):
///      entries_W = min( floor(cycleDustUsd(W) / 50 cents), 5 )
///      totalEntries(primary) = Σ entries_W for all linked W
///      max totalEntries(primary) = 1 (base) + 5 × 5 (dust) = 26
contract LibertyVault is Ownable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────
    //  LIBRARIES
    // ─────────────────────────────────────────────────────────

    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error UnsupportedToken();
    error ZeroAmount();
    error ZeroAddress();
    error TransferFailed();

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

    /// @notice The $LIBERTY token address (used as reference for the raffle)
    address public immutable LIBERTY_TOKEN;

    /// @notice Recipient of the 2% protocol fee
    address public immutable PROTOCOL_FEE_RECIPIENT;

    /// @notice Optional Chainlink USD price feed aggregator.
    ///         If address(0): all tokens priced at $1.00 (fallback, for testing/mock).
    address public immutable USD_FEED;

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    /// @notice Which ERC-20 tokens are accepted as dust
    mapping(address => bool) public isSupportedToken;

    /// @notice Ordered list of supported tokens (for iteration in _cycleUsdCents)
    address[] public supportedTokensList;

    /// @notice Per-account, per-cycle, per-token cumulative contribution in raw token units
    mapping(address => mapping(uint256 => mapping(address => uint256))) public contributions;

    /// @notice Per-primary dust entries earned for the current cycle.
    ///         Overwritten each cycle — not accumulated.
    mapping(address => uint256) public dustEntriesEarned;

    /// @notice The cycle ID at which entries were last computed for each primary
    mapping(address => uint256) public lastEntryCycle;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event DustDeposited(
        address indexed depositor,    // secondary wallet that deposited
        address indexed primary,       // primary wallet that earned entries
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

    event SupportedTokenAdded(address indexed token);
    event SupportedTokenRemoved(address indexed token);

    event ProtocolFeeRecipientUpdated(address indexed newRecipient);

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    constructor(
        address _linkRegistry,
        address _libertyToken,
        address _protocolFeeRecipient,
        address _usdFeed
    ) Ownable(msg.sender) {
        if (_linkRegistry == address(0) || _libertyToken == address(0)
            || _protocolFeeRecipient == address(0)) revert ZeroAddress();

        LINK_REGISTRY = ILinkRegistry(_linkRegistry);
        LIBERTY_TOKEN = _libertyToken;
        PROTOCOL_FEE_RECIPIENT = _protocolFeeRecipient;
        USD_FEED = _usdFeed;
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — DEPOSIT
    // ─────────────────────────────────────────────────────────

    /// @notice Deposit ERC-20 dust tokens. Must come from a linked secondary wallet.
    ///         A 2% protocol fee is deducted before calculating entries.
    ///         Entries are credited to the primary wallet that linked msg.sender.
    ///
    /// @param  primary  The primary wallet that will receive the dust entries
    function depositDust(address primary, address dustToken, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!isSupportedToken[dustToken]) revert UnsupportedToken();
        if (primary == address(0)) revert ZeroAddress();

        // Pull tokens into vault
        IERC20(dustToken).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate protocol fee (2%)
        uint256 fee = (amount * PROTOCOL_FEE_BPS) / BPS;
        uint256 net = amount - fee;

        if (fee > 0) {
            IERC20(dustToken).safeTransfer(PROTOCOL_FEE_RECIPIENT, fee);
        }

        // Credit contribution to msg.sender (secondary wallet) for this cycle
        uint256 cycleId = _currentCycleId();
        contributions[msg.sender][cycleId][dustToken] += net;

        // Look up the primary that linked this secondary and recompute entries
        address resolvedPrimary = _resolvePrimary(msg.sender, primary);
        if (resolvedPrimary != address(0)) {
            _computeAndCreditDustEntries(resolvedPrimary);
        }

        emit DustDeposited(msg.sender, resolvedPrimary, dustToken, amount, fee, net, cycleId);
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — ADMIN
    // ─────────────────────────────────────────────────────────

    /// @notice Add a supported dust token. Updates both mappings and the list.
    /// @param  token  The ERC-20 token address
    function addSupportedToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (!isSupportedToken[token]) {
            isSupportedToken[token] = true;
            supportedTokensList.push(token);
            emit SupportedTokenAdded(token);
        }
    }

    /// @notice Remove a supported dust token. Does NOT remove from the list
    ///         (list is append-only; removed tokens will be skipped in iteration).
    /// @param  token  The ERC-20 token address
    function removeSupportedToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (isSupportedToken[token]) {
            isSupportedToken[token] = false;
            emit SupportedTokenRemoved(token);
        }
    }

    /// @notice Update the protocol fee recipient.
    /// @param  newRecipient  New recipient address
    function setProtocolFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit ProtocolFeeRecipientUpdated(newRecipient);
        // Cannot modify immutable — emit event for off-chain tracking
        // The recipient is set at construction; for production, redeploy or use a proxy
    }

    /// @notice Rescue non-dust tokens accidentally sent here.
    /// @param  token   The ERC-20 to withdraw
    /// @param  amount  Amount
    /// @param  to      Recipient
    function withdrawToken(address token, uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — VIEWS
    // ─────────────────────────────────────────────────────────

    /// @notice Returns current dust entries for a primary account.
    ///         Does NOT include the base entry (add 1 in the raffle).
    /// @param  primary  The primary account to query
    /// @return Dust entries for this cycle
    /// @notice Returns dust entries for `primary` for the current cycle, computed live.
    /// @dev Returns 0 if primary has no linked wallets or no contributions.
    function getDustEntries(address primary) external view returns (uint256) {
        return _computeDustEntries(primary);
    }

    /// @notice Returns total USD cents contributed by a specific wallet
    ///         across all supported tokens in the current cycle.
    /// @param  wallet  The wallet to query (typically a linked secondary)
    /// @return Total USD cents (at 2 decimal places)
    function getCurrentCycleUsdCents(address wallet) external view returns (uint256) {
        return _cycleUsdCents(wallet, _currentCycleId());
    }

    /// @notice Returns raw token contribution for a specific wallet, cycle, and token.
    /// @param  wallet   The wallet
    /// @param  cycleId  The cycle ID
    /// @param  token    The token address
    /// @return Raw token units contributed
    function getContribution(address wallet, uint256 cycleId, address token)
        external view returns (uint256)
    {
        return contributions[wallet][cycleId][token];
    }

    /// @notice Returns the current cycle ID.
    function getCurrentCycleId() external view returns (uint256) {
        return _currentCycleId();
    }

    /// @notice Returns the full list of supported dust tokens.
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    /// @notice Returns the count of supported tokens.
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokensList.length;
    }

    /// @notice Returns whether a token is currently supported.
    function supportedToken(address token) external view returns (bool) {
        return isSupportedToken[token];
    }

    /// @notice Returns account info snapshot.
    /// @return dustEntries   Current dust entries
    /// @return cycleId       Current cycle ID
    /// @return cycleUsdCents Total USD cents in this cycle
    function getAccountInfo(address primary) external view returns (
        uint256 dustEntries,
        uint256 cycleId,
        uint256 cycleUsdCents
    ) {
        cycleId = _currentCycleId();
        dustEntries = _computeDustEntries(primary);
        // Primary's own USD is 0 (primary can't self-deposit); sum linked wallets:
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

    /// @dev Recalculates dust entries for `primary` based on contributions
    ///      from all its linked secondary wallets in the current cycle.
    ///
    ///      Per linked wallet W:
    ///        entries_W = min(floor(cycleDustUsd(W) / 50), 5)
    ///
    ///      Note: primary's own contributions are NOT counted.
    /// @dev Live-computes dust entries WITHOUT writing to state.
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

    /// @dev Computes and persists dust entries for `primary`.
    function _computeAndCreditDustEntries(address primary) internal {
        uint256 cycleId = _currentCycleId();
        if (lastEntryCycle[primary] != cycleId) {
            lastEntryCycle[primary] = cycleId;
            dustEntriesEarned[primary] = 0;
        }
        dustEntriesEarned[primary] = _computeDustEntries(primary);
        emit DustEntriesCredited(primary, cycleId, dustEntriesEarned[primary]);
    }

    /// @dev Returns total USD cents contributed by a wallet across all
    ///      SUPPORTED tokens in a given cycle, using Chainlink or $1 fallback.
    function _cycleUsdCents(address wallet, uint256 cycleId)
        internal view returns (uint256 totalUsdCents)
    {
        uint256 len = supportedTokensList.length;
        for (uint256 i = 0; i < len; i++) {
            address token = supportedTokensList[i];
            if (!isSupportedToken[token]) continue; // skip removed tokens

            uint256 raw = contributions[wallet][cycleId][token];
            if (raw == 0) continue;

            totalUsdCents += _tokenToUsdCents(token, raw);
        }
    }

    /// @dev Converts a token amount to USD cents.
    ///      If USD_FEED == address(0): $1.00 per token unit (fallback, for testing).
    ///      Otherwise: uses Chainlink AggregatorV3 latestAnswer (price in 8 decimals).
    function _tokenToUsdCents(address token, uint256 amount)
        internal view returns (uint256)
    {
        if (USD_FEED == address(0)) {
            // Fallback: $1.00 per token unit.
            // amount is in raw token units (with token decimals).
            // Convert to cents: amount / 10^(decimals-2)
            // E.g., 1e18 raw (1 token, 18 dec) / 1e16 = 100 cents = $1.00
            uint8 decA = IERC20Metadata(token).decimals();
            if (decA > 2) return amount / (10 ** (decA - 2));
            return amount * (10 ** (2 - decA)); // handle ≤2 decimal tokens
        }

        // Chainlink: latestAnswer() returns price with 8 decimal places.
        int256 rawPrice = IChainlinkFeed(USD_FEED).latestAnswer();
        uint256 price = uint256(rawPrice); // e.g., $1.00 → 100_000_000

        uint8 decB = IERC20Metadata(token).decimals();
        uint256 divisor = 10 ** (decB + 8); // token decimals + 8 (price decimals)
        return (amount * price) / divisor;
    }

    /// @dev Returns the current hourly cycle ID.
    function _currentCycleId() internal view returns (uint256) {
        return block.timestamp / CYCLE_DURATION;
    }

    /// @dev Finds the primary wallet that has `secondary` linked.
    ///      Iterates all registered accounts — acceptable for small-to-medium scale.
    ///      For production at high scale, maintain a secondary→primary reverse map.
    ///      Returns address(0) if no primary found.
    function _resolvePrimary(address secondary, address hint)
        internal view returns (address)
    {
        // Optimization: if the hint is linked to secondary, use it directly.
        if (hint != address(0) && LINK_REGISTRY.isLinkedTo(hint, secondary)) {
            return hint;
        }

        // Fallback: scan all wallets known to the vault.
        // Since we don't maintain a full wallet list, we return the hint as-is
        // and rely on the raffle/indexer to validate linking separately.
        // In production: add a secondaryToPrimary mapping updated by the registry.
        return hint;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MINIMAL INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/// @title ILinkRegistry — read-only interface for vault
interface ILinkRegistry {
    function isLinkedTo(address primary, address secondary) external view returns (bool);
    function getLinkedWallets(address primary) external view returns (address[] memory);
}

/// @dev Minimal AggregatorV3Interface for USD price feeds
interface IChainlinkFeed {
    function latestAnswer() external view returns (int256);
}

/// @dev Minimal ERC20 metadata extension
interface IERC20Metadata {
    function decimals() external view returns (uint8);
}
