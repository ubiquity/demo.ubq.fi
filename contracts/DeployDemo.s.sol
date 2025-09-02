// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "./DEMO.sol";

bytes32 constant SALT = bytes32(uint256(0x0000000000000000000000000000000000000000d3af2663da51c10215000000));

contract DeployDemo is Script {
  function run() external {
    address permit2Address = vm.envAddress("PERMIT2_ADDRESS");
    address ownerAddress = vm.envAddress("OWNER_ADDRESS");

    vm.startBroadcast();
    DEMOToken token = new DEMOToken{salt: SALT}(ownerAddress, type(uint256).max);
    token.approve(permit2Address, type(uint256).max);
    vm.stopBroadcast();

    console2.log("DEMO token deployed at", address(token));
  }
}
