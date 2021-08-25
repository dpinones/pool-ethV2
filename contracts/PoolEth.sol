// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract PoolEth is Ownable {

    enum State {
        DEPOSITED,
        WITHDRAWN
    }

    struct Deposit {
        uint amount;
        uint date;
    }

    struct Reward {
        uint idDeposit;
        uint amount;
        uint percentage;
        State state;
    }

    Deposit [] private deposits;
    mapping(address => Reward []) private rewards; 
    
    uint public totalPool;
    mapping(address => uint) private balances;

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

        if(!hasStaked[msg.sender]) {
            stakers.push(msg.sender);
        }

        hasStaked[msg.sender] = true;
    }
    
    function compound() external onlyUser {
        uint rewardAmount = getReward();
        require(rewardAmount > 0, "PoolEth: has no rewards");
        _changeStateRewards();
        balances[msg.sender] += rewardAmount;
        totalPool += rewardAmount;
    }

    function harvest() external onlyUser {
        uint amount = _availableAmount();
        require(amount > 0, "PoolEth: it has no amount");

        _changeStateRewards();
        uint auxBalance = balances[msg.sender];
        balances[msg.sender] = 0;
        totalPool -= auxBalance;

        payable(msg.sender).transfer(amount);
    }

    function _availableAmount() private view returns (uint) {
        return balances[msg.sender] + getReward();
    }

    function _changeStateRewards() private {
        Reward [] storage rewardsStaker = rewards[msg.sender];
        for (uint i ; i < rewardsStaker.length; i++) {
            if(State.DEPOSITED == rewardsStaker[i].state){
                rewardsStaker[i].state = State.WITHDRAWN;
            }
        }
    }

    function addDeposit() external payable onlyOwner {
        require(msg.value > 0, "PoolEth: amount can not be 0");
        require(totalPool > 0, "PoolEth: no users in pool");
        deposits.push(Deposit(msg.value, block.timestamp));
        uint idDeposit = deposits.length -1;
        for (uint i; i < stakers.length; i++) {
            if(balances[stakers[i]] > 0){
                uint percentage = (balances[stakers[i]] * 100) / totalPool;
                uint amount = percentage * msg.value / 100;
                rewards[stakers[i]].push(Reward(idDeposit, amount, percentage, State.DEPOSITED));
            }
        }
    }
    
    function getBalance() external view onlyUser returns(uint) {
        return balances[msg.sender];
    }
    
    function getReward() public view onlyUser returns(uint) {
        uint rewardAmount;
        Reward [] memory rewardsStaker = rewards[msg.sender];
        for (uint i ; i < rewardsStaker.length; i++) {
            if(State.DEPOSITED == rewardsStaker[i].state){
                rewardAmount += rewardsStaker[i].amount;
            }
        }
        return rewardAmount;
    }
}