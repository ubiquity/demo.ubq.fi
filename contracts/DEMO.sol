// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DEMOToken is ERC20 {
  constructor(address owner, uint256 initialSupply) ERC20("Ubiquity Demo", "DEMO") {
    _mint(owner, initialSupply);
  }
}
