// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract PoolEth is Ownable {
    mapping(address => uint256) private rewards;

    uint256 public totalPool;
    mapping(address => uint256) private balances;

    address[] private stakers;
    mapping(address => bool) private hasStaked;

    modifier onlyUser() {
        require(msg.sender != owner(), "PoolEth: does not have permissions");
        _;
    }

    function stake() external payable onlyUser {
        require(msg.value > 0, "PoolEth: amount can not be 0");
        balances[msg.sender] += msg.value;
        totalPool += msg.value;
        if (!hasStaked[msg.sender]) {
            stakers.push(msg.sender);
            hasStaked[msg.sender] = true;
        }
    }

    function compound() external onlyUser {
        uint256 rewardAmount = rewards[msg.sender];
        require(rewardAmount > 0, "PoolEth: has no rewards");
        rewards[msg.sender] = 0;
        balances[msg.sender] += rewardAmount;
        totalPool += rewardAmount;
    }

    function harvest() external onlyUser {
        uint256 amount = _availableAmount();
        require(amount > 0, "PoolEth: it has no amount");
        uint256 auxBalance = balances[msg.sender];
        rewards[msg.sender] = 0;
        balances[msg.sender] = 0;
        totalPool -= auxBalance;
        payable(msg.sender).transfer(amount);
        _deleteStaker();
        hasStaked[msg.sender] = false;
    }

    function _availableAmount() private view returns (uint256) {
        return balances[msg.sender] + rewards[msg.sender];
    }

    function _deleteStaker() private {
        uint256 index;
        for (uint256 i; i < stakers.length; i++) {
            if (stakers[i] == msg.sender) {
                index = i;
                break;
            }
        }
        if (index != stakers.length - 1) {
            stakers[index] = stakers[stakers.length - 1];
        }
        stakers.pop();
    }

    function addDeposit() external payable onlyOwner {
        require(msg.value > 0, "PoolEth: amount can not be 0");
        for (uint256 i; i < stakers.length; i++) {
            rewards[stakers[i]] += (((balances[stakers[i]] * 100) / totalPool) * msg.value) / 100;
        }
    }

    function getBalance() external view onlyUser returns (uint256) {
        return balances[msg.sender];
    }

    function getReward() public view onlyUser returns (uint256) {
        return rewards[msg.sender];
    }
}
