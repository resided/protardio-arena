// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ProtardioArena} from "../src/ProtardioArena.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock BLADE token for testing
contract MockBLADE is ERC20 {
    constructor() ERC20("BLADE", "BLADE") {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ProtardioArenaTest is Test {
    ProtardioArena public arena;
    MockBLADE public blade;

    address player1 = address(0x1111);
    address player2 = address(0x2222);

    function setUp() public {
        blade = new MockBLADE();
        arena = new ProtardioArena(address(blade));

        // Fund players with BLADE
        blade.mint(player1, 1000e18);
        blade.mint(player2, 1000e18);

        // Approve arena
        vm.prank(player1);
        blade.approve(address(arena), type(uint256).max);
        vm.prank(player2);
        blade.approve(address(arena), type(uint256).max);
    }

    function testCreateBattle() public {
        vm.prank(player1);
        arena.createBattle(42, 10e18);

        (address p1,,uint256 stake, uint256 tokenId,, bool active) = arena.getBattle(1);
        assertEq(p1, player1);
        assertEq(stake, 10e18);
        assertEq(tokenId, 42);
        assertTrue(active);
    }

    function testJoinBattleAndFight() public {
        // Player 1 creates battle
        vm.prank(player1);
        arena.createBattle(100, 50e18);

        uint256 p1Before = blade.balanceOf(player1);
        uint256 p2Before = blade.balanceOf(player2);

        // Player 2 joins
        vm.prank(player2);
        arena.joinBattle(1, 200);

        // Battle should be complete
        (,,,,, bool active) = arena.getBattle(1);
        assertFalse(active);

        // One player should have won
        uint256 p1After = blade.balanceOf(player1);
        uint256 p2After = blade.balanceOf(player2);

        // Someone won ~97.5 BLADE (100 BLADE pot minus 2.5% fee)
        bool p1Won = p1After > p1Before;
        bool p2Won = p2After > p2Before;
        assertTrue(p1Won || p2Won);

        // Stats updated
        assertEq(arena.totalBattles(), 1);
    }

    function testCannotFightYourself() public {
        vm.prank(player1);
        arena.createBattle(1, 10e18);

        vm.prank(player1);
        vm.expectRevert(ProtardioArena.CannotFightYourself.selector);
        arena.joinBattle(1, 2);
    }

    function testCancelExpiredBattle() public {
        vm.prank(player1);
        arena.createBattle(1, 10e18);

        uint256 balBefore = blade.balanceOf(player1);

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);

        vm.prank(player1);
        arena.cancelBattle(1);

        // Got refund
        assertEq(blade.balanceOf(player1), balBefore + 10e18);
    }

    function testOpenBattlesList() public {
        vm.prank(player1);
        arena.createBattle(1, 10e18);

        vm.prank(player2);
        arena.createBattle(2, 20e18);

        uint256[] memory open = arena.getOpenBattles();
        assertEq(open.length, 2);
    }

    function testStats() public {
        vm.prank(player1);
        arena.createBattle(1, 10e18);

        vm.prank(player2);
        arena.joinBattle(1, 2);

        (uint256 w1, uint256 l1,) = arena.getStats(player1);
        (uint256 w2, uint256 l2,) = arena.getStats(player2);

        // One has 1 win, other has 1 loss
        assertEq(w1 + w2, 1);
        assertEq(l1 + l2, 1);
    }
}
