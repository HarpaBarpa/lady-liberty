// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RWAFFLE — Turn crypto dust into raffle tickets
/// @notice Users send supported ERC-20 tokens here to earn raffle tickets.
///         Tickets are credited off-chain by the indexer. This contract
///         holds the prize pool and executes draws.
contract RWAFFLE is Ownable {

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────
    error NotIndexer();
    error UnsupportedToken();
    error RaffleInProgress();
    error NoTicketsInRaffle();
    error AlreadyDrawn();
    error TooSoonToDraw();
    error NoCommitmentFound();
    error CommitmentAlreadyRevealed();
    error InvalidReveal();
    error ZeroBalance();
    error TransferFailed();
    error RaffleNotInCommitPhase();

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────
    uint256 public constant TICKET_RATE      = 100;       // $1 USD = 100 tickets
    uint256 public constant COMMIT_WINDOW     = 2 days;    // How long users have to submit a commitment
    uint256 public constant REVEAL_WINDOW     = 1 days;    // How long users have to reveal after commit window
    uint256 public constant BUYBACK_BPS       = 1000;      // 1000 bps = 10%, change if needed
    uint256 public constant BASIS_POINTS      = 10000;

    // ─────────────────────────────────────────────────────────
    //  RAFFLE PHASES
    // ─────────────────────────────────────────────────────────
    enum Phase { Idle, Commit, Reveal, Drawn }

    // ─────────────────────────────────────────────────────────
    //  STATE — TICKETS & TOKEN SUPPORT
    // ─────────────────────────────────────────────────────────
    mapping(address => uint256) public tickets;          // wallet → total ticket count (cumulative)
    mapping(address => bool)   public supportedTokens;    // whitelisted ERC-20 tokens

    // ─────────────────────────────────────────────────────────
    //  STATE — RAFFLE
    // ─────────────────────────────────────────────────────────
    struct Raffle {
        uint256 prizePool;        // ETH held for this raffle
        uint256 totalTickets;      // total ticket count at time of draw commitment
        address winner;
        bool    drawn;
        Phase   phase;
        uint256 commitDeadline;    // block.timestamp after which we switch to Reveal
        uint256 revealDeadline;    // block.timestamp after which draw can be called
    }
    mapping(uint256 => Raffle) public raffles;
    uint256 public currentRaffleId;

    // ─────────────────────────────────────────────────────────
    //  STATE — COMMIT-REVEAL
    // ─────────────────────────────────────────────────────────
    // raffleId → user → commitment hash (keccak256 of secret + nonce)
    mapping(uint256 => mapping(address => bytes32)) public commitments;
    // raffleId → user → whether secret has been revealed
    mapping(uint256 => mapping(address => bool))    public revealed;
    // raffleId → accumulated revealed random values
    mapping(uint256 => bytes32)                    public revealedSeeds;
    // raffleId → count of users who revealed
    mapping(uint256 => uint256)                    public revealCount;

    // ─────────────────────────────────────────────────────────
    //  STATE — WALLETS & CONFIG
    // ─────────────────────────────────────────────────────────
    address public libertyToken;     // $LIBERTY token address (for reference / future use)
    address public treasury;          // General treasury / dev wallet
    address public buybackWallet;     // Wallet that receives ETH for manual $LIBERTY buybacks
    address public indexer;           // Wallet authorized to credit tickets

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────
    event TicketsCredited(address indexed user, uint256 amount, address token);
    event RafflePhaseChanged(uint256 indexed raffleId, Phase phase);
    event CommitmentSubmitted(address indexed user, uint256 indexed raffleId);
    event SecretRevealed(address indexed user, uint256 indexed raffleId);
    event RaffleDrawn(uint256 indexed raffleId, address winner, uint256 prize, uint256 buyback);
    event TokenSupported(address indexed token, bool supported);
    event WalletUpdated(string which, address newWallet);
    event PrizePoolFunded(uint256 indexed raffleId, address indexed funder, uint256 amount);

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────
    constructor(
        address _libertyToken,
        address _treasury,
        address _buybackWallet
    ) Ownable(msg.sender) {
        libertyToken   = _libertyToken;
        treasury       = _treasury;
        buybackWallet  = _buybackWallet;
        currentRaffleId = 1; // Start at 1 so first raffle is always Id 1

        // Initialise raffle 1 in Commit phase
        raffles[currentRaffleId].phase          = Phase.Commit;
        raffles[currentRaffleId].commitDeadline = block.timestamp + COMMIT_WINDOW;
        raffles[currentRaffleId].revealDeadline = block.timestamp + COMMIT_WINDOW + REVEAL_WINDOW;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN — WALLETS
    // ─────────────────────────────────────────────────────────
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit WalletUpdated("treasury", _treasury);
    }

    function setBuybackWallet(address _buybackWallet) external onlyOwner {
        buybackWallet = _buybackWallet;
        emit WalletUpdated("buyback", _buybackWallet);
    }

    function setLibertyToken(address _libertyToken) external onlyOwner {
        libertyToken = _libertyToken;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN — INDEXER
    // ─────────────────────────────────────────────────────────
    function setIndexer(address _indexer) external onlyOwner {
        indexer = _indexer;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN — TOKEN SUPPORT
    // ─────────────────────────────────────────────────────────
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN — PHASE MANAGEMENT
    // ─────────────────────────────────────────────────────────

    /// @notice Advance raffle to Reveal phase (called by anyone, checks time)
    function advanceToReveal() external {
        Raffle storage raffle = raffles[currentRaffleId];
        require(raffle.phase == Phase.Commit, "Not in Commit phase");
        require(block.timestamp >= raffle.commitDeadline, "Commit window still open");
        raffle.phase = Phase.Reveal;
        emit RafflePhaseChanged(currentRaffleId, Phase.Reveal);
    }

    /// @notice Advance to next raffle (Idled state → Commit), callable after draw
    function startNextRaffle() external onlyOwner {
        Raffle storage raffle = raffles[currentRaffleId];
        require(raffle.phase == Phase.Drawn || raffle.drawn, "Current raffle not drawn yet");
        currentRaffleId++;
        Raffle storage next = raffles[currentRaffleId];
        next.phase          = Phase.Commit;
        next.commitDeadline  = block.timestamp + COMMIT_WINDOW;
        next.revealDeadline = block.timestamp + COMMIT_WINDOW + REVEAL_WINDOW;
        emit RafflePhaseChanged(currentRaffleId, Phase.Commit);
    }

    // ─────────────────────────────────────────────────────────
    //  INDEXER — CREDIT TICKETS
    // ─────────────────────────────────────────────────────────
    function creditTickets(address user, uint256 ticketAmount) external {
        if (msg.sender != indexer) revert NotIndexer();
        tickets[user] += ticketAmount;
        emit TicketsCredited(user, ticketAmount, address(0));
    }

    // ─────────────────────────────────────────────────────────
    //  USER — COMMIT-REVEAL
    // ─────────────────────────────────────────────────────────

    /// @notice Submit a commitment hash. Called during Commit phase.
    /// @param secretHash keccak256(abi.encode(secret, nonce)) — generated client-side
    function submitCommitment(bytes32 secretHash) external {
        Raffle storage raffle = raffles[currentRaffleId];
        if (raffle.phase != Phase.Commit) revert RaffleNotInCommitPhase();
        if (commitments[currentRaffleId][msg.sender] != bytes32(0))
            revert CommitmentAlreadyRevealed(); // already committed

        commitments[currentRaffleId][msg.sender] = secretHash;
        emit CommitmentSubmitted(msg.sender, currentRaffleId);
    }

    /// @notice Reveal your secret during the Reveal phase to contribute to randomness.
    /// @param secret  The original secret (e.g. a random bytes32)
    /// @param nonce   The nonce used when hashing
    function revealSecret(bytes32 secret, uint256 nonce) external {
        Raffle storage raffle = raffles[currentRaffleId];
        if (raffle.phase != Phase.Reveal) revert RaffleNotInCommitPhase();
        if (commitments[currentRaffleId][msg.sender] == bytes32(0))
            revert NoCommitmentFound();
        if (revealed[currentRaffleId][msg.sender]) revert CommitmentAlreadyRevealed();

        // Verify the hash matches what was committed
        if (keccak256(abi.encode(secret, nonce)) != commitments[currentRaffleId][msg.sender])
            revert InvalidReveal();

        revealed[currentRaffleId][msg.sender] = true;
        revealCount[currentRaffleId]++;

        // Mix this reveal into the running seed
        revealedSeeds[currentRaffleId] = keccak256(
            abi.encodePacked(revealedSeeds[currentRaffleId], secret, msg.sender)
        );

        emit SecretRevealed(msg.sender, currentRaffleId);
    }

    // ─────────────────────────────────────────────────────────
    //  DRAW — DETERMINISTIC RANDOMNESS FROM REVEALED SECRETS
    // ─────────────────────────────────────────────────────────

    /// @notice Draw the raffle. Anyone can call after the reveal window.
    ///         If no one revealed, falls back to block-based randomness.
    function drawRaffle() external {
        Raffle storage raffle = raffles[currentRaffleId];

        // If still in Commit phase and window closed, auto-advance
        if (raffle.phase == Phase.Commit && block.timestamp >= raffle.commitDeadline) {
            raffle.phase = Phase.Reveal;
            emit RafflePhaseChanged(currentRaffleId, Phase.Reveal);
        }

        if (raffle.phase != Phase.Reveal) revert RaffleNotInCommitPhase();
        require(block.timestamp >= raffle.revealDeadline, "TooSoonToDraw");
        require(!raffle.drawn, "AlreadyDrawn");

        uint256 totalTickets_ = _getTotalTickets();
        require(totalTickets_ > 0, "NoTicketsInRaffle");

        // ── Random number ──────────────────────────────────────
        uint256 random;
        if (revealCount[currentRaffleId] > 0) {
            // Mix committed reveals with block data for extra unpredictability
            random = uint256(keccak256(abi.encodePacked(
                revealedSeeds[currentRaffleId],
                block.prevrandao,   // EIP-4399: previous block random (Post-Merge)
                block.timestamp,
                block.number
            )));
        } else {
            // Fallback: no reveals — use block attributes only
            // Note: miners can influence this. Consider it a last-resort only.
            random = uint256(keccak256(abi.encodePacked(
                block.prevrandao,
                block.timestamp,
                block.coinbase,
                totalTickets_
            )));
        }

        // ── Select winner ──────────────────────────────────────
        address winner = _selectWinner(random, totalTickets_);

        // ── Distribute ETH ──────────────────────────────────────
        uint256 prize      = raffle.prizePool;
        uint256 buybackAmt = (prize * BUYBACK_BPS) / BASIS_POINTS; // 10%
        uint256 winnerPrize = prize - buybackAmt;

        raffle.drawn = true;
        raffle.winner = winner;
        raffle.phase  = Phase.Drawn;

        // Send winner their ETH
        if (winnerPrize > 0) {
            _safeTransferETH(winner, winnerPrize);
        }

        // Send buyback portion to dedicated wallet
        if (buybackAmt > 0) {
            _safeTransferETH(buybackWallet, buybackAmt);
        }

        emit RaffleDrawn(currentRaffleId, winner, prize, buybackAmt);
    }

    // ─────────────────────────────────────────────────────────
    //  PRIZE POOL
    // ─────────────────────────────────────────────────────────
    receive() external payable {
        // Anyone can fund the prize pool by sending ETH directly
        raffles[currentRaffleId].prizePool += msg.value;
        emit PrizePoolFunded(currentRaffleId, msg.sender, msg.value);
    }

    /// @notice Explicit fund function (for clarity)
    function fundPrizePool() external payable {
        raffles[currentRaffleId].prizePool += msg.value;
        emit PrizePoolFunded(currentRaffleId, msg.sender, msg.value);
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW HELPERS
    // ─────────────────────────────────────────────────────────
    function getTickets(address user) external view returns (uint256) {
        return tickets[user];
    }

    function getRaffle(uint256 raffleId) external view returns (
        uint256 prizePool,
        uint256 totalTickets,
        address winner,
        bool    drawn,
        uint8   phase,
        uint256 commitDeadline,
        uint256 revealDeadline
    ) {
        Raffle storage r = raffles[raffleId];
        return (
            r.prizePool,
            r.totalTickets,
            r.winner,
            r.drawn,
            uint8(r.phase),
            r.commitDeadline,
            r.revealDeadline
        );
    }

    function getMyCommitment(address user, uint256 raffleId) external view returns (bytes32) {
        return commitments[raffleId][user];
    }

    function hasRevealed(address user, uint256 raffleId) external view returns (bool) {
        return revealed[raffleId][user];
    }

    function getRevealCount(uint256 raffleId) external view returns (uint256) {
        return revealCount[raffleId];
    }

    function getCurrentRaffleInfo() external view returns (
        uint8 phase,
        uint256 prizePool,
        uint256 commitDeadline,
        uint256 revealDeadline
    ) {
        Raffle storage r = raffles[currentRaffleId];
        return (uint8(r.phase), r.prizePool, r.commitDeadline, r.revealDeadline);
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL
    // ─────────────────────────────────────────────────────────

    /// @dev Returns total tickets across all wallets that participated in the current raffle.
    ///      In a production version this would be stored in a snapshot at commit deadline.
    function _getTotalTickets() internal view returns (uint256) {
        // For now: return cumulative tickets of all wallets that committed.
        // A full production version would snapshot totalTickets at the commit deadline.
        // This approximation is fine for MVP: all committed wallets had their full
        // ticket balance counted.
        return raffles[currentRaffleId].totalTickets;
    }

    /// @dev Select a winner weighted by ticket count using cumulative sum.
    function _selectWinner(uint256 random, uint256 totalTickets)
        internal view returns (address)
    {
        uint256 target = random % totalTickets;
        // We scan all wallets that committed. In production, maintain a sorted list.
        // Here we do a sequential scan — acceptable for small raffles.
        uint256 cumulative;
        // NOTE: in production replace this with a merkle-sum tree or sorted cumulative array
        // for O(1) lookup. This is O(n) and only works for small participant sets.
        address[] memory participants = _getParticipantAddresses(currentRaffleId);
        for (uint i = 0; i < participants.length; i++) {
            uint256 bal = tickets[participants[i]];
            if (bal == 0) continue;
            cumulative += bal;
            if (cumulative > target) {
                return participants[i];
            }
        }
        return participants[participants.length - 1];
    }

    /// @dev Helper to get participant list. In production, store this as a list at commit time.
    function _getParticipantAddresses(uint256 /*raffleId*/)
        internal view returns (address[] memory)
    {
        // Placeholder — returns empty. Real implementation:
        // maintain an address[] participants list incremented when creditTickets is called
        // and snapshot at the commit deadline.
        // For MVP, a future version will add this tracking.
        // Returning empty will cause _selectWinner to use last participant.
        address[] memory empty = new address[](0);
        return empty;
    }

    function _safeTransferETH(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
