// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ProtardioArena} from "../src/ProtardioArena.sol";

contract DeployScript is Script {
    // $BLADE token on Arbitrum
    address constant BLADE = 0xDC9a64F4511ebe6F813BFDB68b34e6698a1C4b07;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ProtardioArena arena = new ProtardioArena(BLADE);

        console.log("ProtardioArena deployed to:", address(arena));
        console.log("Owner:", arena.owner());
        console.log("BLADE token:", address(arena.BLADE()));
        console.log("Fee:", arena.fee(), "bps");
        console.log("Min Stake:", arena.minStake());

        vm.stopBroadcast();
    }
}
