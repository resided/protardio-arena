// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ProtardioArena} from "../src/ProtardioArena.sol";

contract ProtardioArenaTest is Test {
    ProtardioArena public arena;

    address player1 = address(0x1111);
    address player2 = address(0x2222);

    function setUp() public {
        arena = new ProtardioArena();
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
    }

    function testCreateBattle() public {
        vm.prank(player1);
        arena.createBattle{value: 0.1 ether}(42);

        (address p1,,uint256 stake, uint256 tokenId,, bool active) = arena.getBattle(1);
        assertEq(p1, player1);
        assertEq(stake, 0.1 ether);
        assertEq(tokenId, 42);
        assertTrue(active);
    }

    function testJoinBattleAndFight() public {
        // Player 1 creates battle
        vm.prank(player1);
        arena.createBattle{value: 0.5 ether}(100);

        uint256 p1Before = player1.balance;
        uint256 p2Before = player2.balance;

        // Player 2 joins
        vm.prank(player2);
        arena.joinBattle{value: 0.5 ether}(1, 200);

        // Battle should be complete
        (,,,,, bool active) = arena.getBattle(1);
        assertFalse(active);

        // Someone should have won ~0.975 ETH (1 ETH pot minus 2.5% fee)
        uint256 prize = 0.975 ether;

        // One player gained, one lost
        bool p1Won = player1.balance > p1Before;
        bool p2Won = player2.balance > p2Before;
        assertTrue(p1Won || p2Won);
        assertFalse(p1Won && p2Won); // Only one winner

        // Stats updated
        assertEq(arena.totalBattles(), 1);
    }

    function testCannotFightYourself() public {
        vm.prank(player1);
        arena.createBattle{value: 0.1 ether}(1);

        vm.prank(player1);
        vm.expectRevert(ProtardioArena.CannotFightYourself.selector);
        arena.joinBattle{value: 0.1 ether}(1, 2);
    }

    function testWrongStakeAmount() public {
        vm.prank(player1);
        arena.createBattle{value: 0.1 ether}(1);

        vm.prank(player2);
        vm.expectRevert(ProtardioArena.WrongStakeAmount.selector);
        arena.joinBattle{value: 0.2 ether}(1, 2);
    }

    function testCancelExpiredBattle() public {
        vm.prank(player1);
        arena.createBattle{value: 0.1 ether}(1);

        uint256 balBefore = player1.balance;

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);

        vm.prank(player1);
        arena.cancelBattle(1);

        // Got refund
        assertEq(player1.balance, balBefore + 0.1 ether);
    }

    function testOpenBattlesList() public {
        vm.prank(player1);
        arena.createBattle{value: 0.1 ether}(1);

        vm.prank(player2);
        arena.createBattle{value: 0.2 ether}(2);

        uint256[] memory open = arena.getOpenBattles();
        assertEq(open.length, 2);
    }

    function testStats() public {
        vm.prank(player1);
        arena.createBattle{value: 0.1 ether}(1);

        vm.prank(player2);
        arena.joinBattle{value: 0.1 ether}(1, 2);

        (uint256 w1, uint256 l1,) = arena.getStats(player1);
        (uint256 w2, uint256 l2,) = arena.getStats(player2);

        // One has 1 win, other has 1 loss
        assertEq(w1 + w2, 1);
        assertEq(l1 + l2, 1);
    }
}
