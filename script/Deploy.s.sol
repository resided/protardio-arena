// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ProtardioArena} from "../src/ProtardioArena.sol";

contract DeployScript is Script {
    // $TARB token on Arbitrum
    address constant TARB = 0xD63231cEBA61780703da36a2F47FfDD08da05B07;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ProtardioArena arena = new ProtardioArena(TARB);

        console.log("ProtardioArena deployed to:", address(arena));
        console.log("Owner:", arena.owner());
        console.log("TARB token:", address(arena.BLADE()));
        console.log("Fee:", arena.fee(), "bps");
        console.log("Min Stake:", arena.minStake());

        vm.stopBroadcast();
    }
}
