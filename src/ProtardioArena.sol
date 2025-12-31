// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProtardioArena - Beyblade Battle Arena
/// @notice LET IT RIP! Spin your Protardio Citizen and battle for ETH
/// @dev Pure 50/50 chaos - no stats, just vibes
contract ProtardioArena {

    struct Battle {
        address player1;
        address player2;
        uint256 stake;
        uint256 p1TokenId;  // Their Protardio NFT (for display)
        uint256 p2TokenId;
        bool active;
        uint256 createdAt;
    }

    // Base chain NFT contract (for reference)
    address public constant PROTARDIO_NFT = 0x5d38451841Ee7A2E824A88AFE47b00402157b08d;

    address public owner;
    uint256 public fee = 250; // 2.5%
    uint256 public minStake = 0.001 ether;
    uint256 public battleExpiry = 1 hours;

    mapping(uint256 => Battle) public battles;
    uint256 public battleCount;
    uint256[] public openBattles;

    // Stats (just for fun, doesn't affect battles)
    mapping(address => uint256) public wins;
    mapping(address => uint256) public losses;
    mapping(address => uint256) public earnings;

    uint256 public totalBattles;
    uint256 public totalVolume;

    event BattleCreated(uint256 indexed battleId, address indexed player1, uint256 tokenId, uint256 stake);
    event BattleJoined(uint256 indexed battleId, address indexed player2, uint256 tokenId);
    event LetItRip(uint256 indexed battleId, address indexed winner, address indexed loser, uint256 prize);
    event BattleCancelled(uint256 indexed battleId);

    error InsufficientStake();
    error BattleNotFound();
    error BattleNotActive();
    error CannotFightYourself();
    error WrongStakeAmount();
    error NotExpired();
    error NotYourBattle();

    constructor() {
        owner = msg.sender;
    }

    /// @notice Create a battle - stake ETH and wait for a challenger
    function createBattle(uint256 tokenId) external payable {
        if (msg.value < minStake) revert InsufficientStake();

        battleCount++;
        battles[battleCount] = Battle({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            p1TokenId: tokenId,
            p2TokenId: 0,
            active: true,
            createdAt: block.timestamp
        });

        openBattles.push(battleCount);

        emit BattleCreated(battleCount, msg.sender, tokenId, msg.value);
    }

    /// @notice Join a battle and LET IT RIP!
    function joinBattle(uint256 battleId, uint256 tokenId) external payable {
        Battle storage battle = battles[battleId];

        if (!battle.active) revert BattleNotActive();
        if (battle.player1 == msg.sender) revert CannotFightYourself();
        if (msg.value != battle.stake) revert WrongStakeAmount();

        battle.player2 = msg.sender;
        battle.p2TokenId = tokenId;
        battle.active = false;

        emit BattleJoined(battleId, msg.sender, tokenId);

        // LET IT RIP! Pure 50/50 random
        uint256 spin = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            battleId,
            msg.sender,
            battle.player1
        )));

        address winner;
        address loser;

        if (spin % 2 == 0) {
            winner = battle.player1;
            loser = battle.player2;
        } else {
            winner = battle.player2;
            loser = battle.player1;
        }

        // Calculate prize
        uint256 totalPot = battle.stake * 2;
        uint256 protocolFee = (totalPot * fee) / 10000;
        uint256 prize = totalPot - protocolFee;

        // Update stats
        wins[winner]++;
        losses[loser]++;
        earnings[winner] += prize;
        totalBattles++;
        totalVolume += totalPot;

        // Remove from open battles
        _removeOpenBattle(battleId);

        // Pay winner
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Transfer failed");

        emit LetItRip(battleId, winner, loser, prize);
    }

    /// @notice Cancel expired battle and get refund
    function cancelBattle(uint256 battleId) external {
        Battle storage battle = battles[battleId];

        if (!battle.active) revert BattleNotActive();
        if (battle.player1 != msg.sender) revert NotYourBattle();
        if (block.timestamp < battle.createdAt + battleExpiry) revert NotExpired();

        battle.active = false;
        _removeOpenBattle(battleId);

        (bool success, ) = battle.player1.call{value: battle.stake}("");
        require(success, "Refund failed");

        emit BattleCancelled(battleId);
    }

    /// @notice Get all open battles
    function getOpenBattles() external view returns (uint256[] memory) {
        return openBattles;
    }

    /// @notice Get battle details
    function getBattle(uint256 battleId) external view returns (
        address player1,
        address player2,
        uint256 stake,
        uint256 p1TokenId,
        uint256 p2TokenId,
        bool active
    ) {
        Battle storage b = battles[battleId];
        return (b.player1, b.player2, b.stake, b.p1TokenId, b.p2TokenId, b.active);
    }

    /// @notice Get player stats
    function getStats(address player) external view returns (
        uint256 _wins,
        uint256 _losses,
        uint256 _earnings
    ) {
        return (wins[player], losses[player], earnings[player]);
    }

    function _removeOpenBattle(uint256 battleId) internal {
        for (uint256 i = 0; i < openBattles.length; i++) {
            if (openBattles[i] == battleId) {
                openBattles[i] = openBattles[openBattles.length - 1];
                openBattles.pop();
                break;
            }
        }
    }

    // Admin
    function setFee(uint256 _fee) external {
        require(msg.sender == owner && _fee <= 500, "Max 5%");
        fee = _fee;
    }

    function setMinStake(uint256 _min) external {
        require(msg.sender == owner);
        minStake = _min;
    }

    function withdraw() external {
        require(msg.sender == owner);
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success);
    }

    receive() external payable {}
}
