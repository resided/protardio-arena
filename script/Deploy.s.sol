// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ProtardioArena} from "../src/ProtardioArena.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ProtardioArena arena = new ProtardioArena();

        console.log("ProtardioArena deployed to:", address(arena));
        console.log("Owner:", arena.owner());
        console.log("Protocol Fee:", arena.protocolFee(), "bps");
        console.log("Min Stake:", arena.minStake());
        console.log("Max Stake:", arena.maxStake());

        vm.stopBroadcast();
    }
}
