// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title LinkRegistry — On-chain wallet linking for LibertyTorch
/// @notice Associates primary wallets with up to 5 secondary wallets each.
///         Linking requires EIP-712 cryptographic proof from the secondary wallet.
/// @dev No funds are held. No token interactions. Pure identity mapping.
contract LinkRegistry is Ownable, ReentrancyGuard, EIP712 {

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error ZeroAddress();
    error InvalidSignature();
    error MaxLinkedWalletsReached();
    error NotLinked();
    error SelfLink();
    error AlreadyLinked();

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────

    /// @notice Maximum secondary wallets a primary may link
    uint256 public constant MAX_LINKED_WALLETS = 5;

    /// @notice EIP-712 type hash for LinkRequest
    bytes32 public constant LINK_REQUEST_TYPEHASH =
        keccak256("LinkRequest(address primary,address secondary,uint256 nonce,uint256 timestamp)");

    // ─────────────────────────────────────────────────────────
    //  STORAGE
    // ─────────────────────────────────────────────────────────

    /// @notice (primary → nonce) — increments each time a link is added.
    ///         Used in the EIP-712 digest to prevent signature replay.
    mapping(address => uint256) public linkNonce;

    /// @notice (primary → secondary → bool) — active link flag
    mapping(address => mapping(address => bool)) public isLinked;

    /// @notice (primary → secondary → uint256) — timestamp of when link was created
    mapping(address => mapping(address => uint256)) public linkTimestamp;

    /// @dev Shadow list for efficient iteration.
    mapping(address => address[]) private _linkedList;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event WalletLinked(
        address indexed primary,
        address indexed secondary,
        uint256 nonce,
        uint256 timestamp
    );

    event WalletUnlinked(
        address indexed primary,
        address indexed secondary,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) EIP712("LibertyTorchLink", "1") {}

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — LINKING
    // ─────────────────────────────────────────────────────────

    /// @notice Link a secondary wallet to msg.sender (the primary).
    ///
    ///         The secondary must sign an EIP-712 LinkRequest:
    ///           domain = { name: "LibertyTorchLink", version: "1",
    ///                      chainId: chain, verifyingContract: registry }
    ///           types  = { LinkRequest: [
    ///                        { name: "primary",   type: "address" },
    ///                        { name: "secondary", type: "address" },
    ///                        { name: "nonce",     type: "uint256" },
    ///                        { name: "timestamp", type: "uint256" }
    ///                      ] }
    ///           value  = { primary: msg.sender, secondary, nonce: linkNonce[primary], timestamp }
    ///           digest = keccak256("\x19\x01" || domainSeparator || structHash)
    ///           sig    = secondary.signTypedData(domain, types, value)
    ///
    /// @param  primary   Must equal msg.sender — the account receiving dust entries
    /// @param  secondary The wallet whose dust deposits will be attributed to primary
    /// @param  timestamp The timestamp included in the signature (used for replay window)
    /// @param  sig       65-byte EIP-712 signature from the secondary wallet
    function linkWallet(
        address primary,
        address secondary,
        uint256 timestamp,
        bytes calldata sig
    ) external nonReentrant {
        if (primary == address(0) || secondary == address(0)) revert ZeroAddress();
        if (primary != msg.sender) revert SelfLink(); // msg.sender must be the primary
        if (primary == secondary) revert SelfLink();
        if (isLinked[primary][secondary]) revert AlreadyLinked();
        if (_linkedList[primary].length >= MAX_LINKED_WALLETS)
            revert MaxLinkedWalletsReached();

        uint256 nonce = linkNonce[primary];

        if (!_verifyLinkSignature(primary, secondary, nonce, timestamp, sig))
            revert InvalidSignature();

        isLinked[primary][secondary] = true;
        linkTimestamp[primary][secondary] = timestamp;
        _linkedList[primary].push(secondary);
        linkNonce[primary]++;

        emit WalletLinked(primary, secondary, nonce, timestamp);
    }

    /// @notice Remove a linked secondary wallet. Only the primary may unlink.
    /// @param  secondary The wallet to unlink
    function unlinkWallet(address primary, address secondary) external nonReentrant {
        if (msg.sender != primary) revert NotLinked();
        if (!isLinked[primary][secondary]) revert NotLinked();

        isLinked[primary][secondary] = false;

        address[] storage list = _linkedList[primary];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; i++) {
            if (list[i] == secondary) {
                list[i] = list[len - 1];
                list.pop();
                break;
            }
        }

        emit WalletUnlinked(primary, secondary, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────
    //  EXTERNAL — VIEWS
    // ─────────────────────────────────────────────────────────

    /// @notice Returns true if `secondary` is currently linked to `primary`.
    function isLinkedTo(address primary, address secondary) external view returns (bool) {
        return isLinked[primary][secondary];
    }

    /// @notice Returns all currently linked secondary wallets for a primary.
    function getLinkedWallets(address primary) external view returns (address[] memory) {
        return _linkedList[primary];
    }

    /// @notice Returns how many wallets are linked to a primary.
    function getLinkedWalletCount(address primary) external view returns (uint256) {
        return _linkedList[primary].length;
    }

    /// @notice Returns the current link nonce for a primary.
    function getLinkNonce(address primary) external view returns (uint256) {
        return linkNonce[primary];
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL — EIP-712 VERIFICATION
    // ─────────────────────────────────────────────────────────

    /// @dev Verifies an EIP-712 LinkRequest signature.
    ///      Uses OZ ECDSA.recover which internally uses ecrecover with v={27,28}.
    function _verifyLinkSignature(
        address primary,
        address secondary,
        uint256 nonce,
        uint256 timestamp,
        bytes calldata sig
    ) internal view returns (bool) {
        if (sig.length != 65) revert InvalidSignature();

        bytes32 structHash = keccak256(
            abi.encode(LINK_REQUEST_TYPEHASH, primary, secondary, nonce, timestamp)
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash)
        );

        return ECDSA.recover(digest, sig) == secondary;
    }
}
